import { getAppConfig } from "./app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { type LearningAnalyzer, type LearningEmbedder } from "@plearn/core/learning/repository";
import { buildSearchDocument } from "@plearn/core/learning/service";
import { embed, generateObject } from "ai";
import "server-only";
import { z } from "zod";

const analysisSchema = z.object({
    summary: z.string(),
    grammarPatterns: z.array(
        z.object({
            type: z.literal("grammar_pattern"),
            text: z.string(),
            translation: z.string(),
            notes: z.string(),
            partOfSpeech: z.string().optional(),
            patternTemplate: z.string().optional(),
            rationale: z.string().optional(),
            aliases: z.array(z.string()).optional(),
            difficulty: z.number().min(0).max(1).optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    vocabulary: z.array(
        z.object({
            type: z.literal("vocabulary"),
            text: z.string(),
            translation: z.string(),
            notes: z.string(),
            partOfSpeech: z.string().optional(),
            rationale: z.string().optional(),
            aliases: z.array(z.string()).optional(),
            difficulty: z.number().min(0).max(1).optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    utilityWords: z.array(
        z.object({
            type: z.literal("utility_word"),
            text: z.string(),
            translation: z.string(),
            notes: z.string(),
            partOfSpeech: z.string().optional(),
            rationale: z.string().optional(),
            aliases: z.array(z.string()).optional(),
            difficulty: z.number().min(0).max(1).optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    phrases: z.array(
        z.object({
            type: z.literal("phrase"),
            text: z.string(),
            translation: z.string(),
            notes: z.string(),
            partOfSpeech: z.string().optional(),
            patternTemplate: z.string().optional(),
            rationale: z.string().optional(),
            aliases: z.array(z.string()).optional(),
            difficulty: z.number().min(0).max(1).optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
});

function getAnalysisModel() {
    const appConfig = getAppConfig();

    switch (appConfig.LEARNING_ANALYSIS_PROVIDER) {
        case "deepseek": {
            return deepseek(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        case "openai": {
            return openai(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        default: {
            throw new Error(`Unsupported analysis provider: ${appConfig.LEARNING_ANALYSIS_PROVIDER}`);
        }
    }
}

function getEmbeddingModel() {
    const appConfig = getAppConfig();

    switch (appConfig.LEARNING_EMBEDDING_PROVIDER) {
        case "openai": {
            return openai.textEmbeddingModel(appConfig.LEARNING_EMBEDDING_MODEL);
        }
        default: {
            throw new Error(`Unsupported embedding provider: ${appConfig.LEARNING_EMBEDDING_PROVIDER}`);
        }
    }
}

export class VercelAiLearningAnalyzer implements LearningAnalyzer {
    public async analyzeSentence(input: { languageCode: string; sourceText: string }) {
        const appConfig = getAppConfig();
        const result = await generateObject({
            model: getAnalysisModel(),
            schema: analysisSchema,
            prompt: [
                "You are decomposing an English sentence into reusable Vietnamese learning units.",
                "Return concise, high-signal study notes.",
                "Prioritize reusable grammar patterns, useful vocabulary, utility words, and phrases.",
                "Do not invent duplicate items unless they are genuinely different learnable concepts.",
                `Target language code: ${input.languageCode}`,
                `Sentence: ${input.sourceText}`,
            ].join("\n"),
        });

        return {
            analysis: result.object,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
            promptVersion: "v1",
        };
    }
}

export class VercelAiLearningEmbedder implements LearningEmbedder {
    public buildEmbeddingSourceText(input: {
        readonly type: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase";
        readonly canonicalText: string;
        readonly translation: string;
        readonly usageNotes: string;
        readonly patternTemplate?: string;
    }): string {
        return buildSearchDocument({
            canonicalText: `${input.type}: ${input.canonicalText}`,
            translation: input.translation,
            usageNotes: input.usageNotes,
            patternTemplate: input.patternTemplate,
        });
    }

    public async embed(text: string): Promise<number[]> {
        const response = await embed({
            model: getEmbeddingModel(),
            value: text,
        });

        return response.embedding;
    }
}
