import { getAppConfig } from "./app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { type LearningAnalyzer, type LearningEmbedder } from "@plearn/core/learning/repository";
import { buildSearchDocument } from "@plearn/core/learning/service";
import { embed, generateObject } from "ai";
import "server-only";
import { z } from "zod";

const analysisSchema = z.object({
    sentence: z.object({
        text: z.string(),
        meaning: z.string(),
    }),
    components: z.array(
        z.object({
            text: z.string(),
            meaning: z.string(),
            formula: z.string(),
            learnableType: z.enum(["grammar_pattern", "phrase"]),
            notes: z.string().optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    words: z.array(
        z.object({
            text: z.string(),
            meaning: z.string(),
            partOfSpeech: z.string().optional(),
            learnableType: z.enum(["vocabulary", "utility_word"]),
            notes: z.string().optional(),
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
                "You are decomposing an English sentence into Southern Vietnamese learning units.",
                "Use Southern Vietnamese specifically: prefer common Southern words, particles, pronouns, everyday phrasing, and regional nuances. Avoid defaulting to Northern or overly formal textbook Vietnamese unless the input explicitly requires that register.",
                "Return 3 sections:",
                "1. sentence: the full Southern Vietnamese translation with its English meaning.",
                "2. components: phrases, structures, and grammar patterns. Each has Southern Vietnamese text, English meaning, and a formula showing how to construct/use the pattern (e.g. 'Subject + đang + Verb'). Set learnableType to 'grammar_pattern' for structural patterns or 'phrase' for idiomatic phrases. For the formula field: describe usage, position, or structure — never just repeat the Vietnamese text itself.",
                "3. words: individual Southern Vietnamese words/graphemes with their English meaning and part of speech. Set learnableType to 'vocabulary' for content words or 'utility_word' for function words (particles, conjunctions, etc.). Do not include a word in both components and words — if it appears as a component, omit it from words.",
                "Do not invent duplicate items unless they are genuinely different learnable concepts.",
                `Target language code: ${input.languageCode}`,
                `Sentence: ${input.sourceText}`,
            ].join("\n"),
        });

        return {
            analysis: result.object,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
            promptVersion: "v3",
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
