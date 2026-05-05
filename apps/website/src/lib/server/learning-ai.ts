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

const responseSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.literal("clarification_needed"),
        clarification: z.object({
            question: z.string(),
            options: z
                .array(
                    z.object({
                        id: z.string(),
                        label: z.string(),
                        isRecommended: z.boolean(),
                    }),
                )
                .min(2)
                .max(3),
        }),
    }),
    z.object({
        status: z.literal("analyzed"),
        analysis: analysisSchema,
    }),
]);

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
    public async analyzeSentence(input: {
        languageCode: string;
        sourceText: string;
        clarifications?: readonly { question: string; answer: string }[];
    }) {
        const appConfig = getAppConfig();

        const previousClarifications = input.clarifications?.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n") ?? "";
        const clarificationContext = previousClarifications ? `\n\nPrevious Clarifications:\n${previousClarifications}` : "";

        const result = await generateObject({
            model: getAnalysisModel(),
            schema: responseSchema,
            prompt: [
                "You are decomposing an English sentence into Southern Vietnamese learning units.",
                "Vietnamese social registers and pronouns (anh, chị, em, bạn, mày, tôi, etc.) are CRITICAL. If the source text contains pronouns like 'I', 'you', 'he', 'she', or 'they' and the relationship/relative ages are unknown, you MUST set status to 'clarification_needed'.",
                "Do not default to formal 'tôi' or 'bạn' unless the input explicitly suggests a formal setting. In Southern Vietnamese, these are often too stiff. Prefer to ask who the speaker is talking to.",
                "If the text is truly unambiguous or you have sufficient clarification context, set status to 'analyzed'.",
                "For the decomposition, use Southern Vietnamese specifically: prefer common Southern words, particles, pronouns, everyday phrasing, and regional nuances.",
                "Return 3 sections in the analysis:",
                "1. sentence: the full Southern Vietnamese translation with its English meaning.",
                "2. components: phrases, structures, and grammar patterns. Each has Southern Vietnamese text, English meaning, and a formula showing how to construct/use the pattern (e.g. 'Subject + đang + Verb'). Set learnableType to 'grammar_pattern' for structural patterns or 'phrase' for idiomatic phrases. For the formula field: describe usage, position, or structure — never just repeat the Vietnamese text itself.",
                "3. words: individual Southern Vietnamese words/graphemes with their English meaning and part of speech. Set learnableType to 'vocabulary' for content words or 'utility_word' for function words (particles, conjunctions, etc.). Do not include a word in both components and words — if it appears as a component, omit it from words.",
                "Do not invent duplicate items unless they are genuinely different learnable concepts.",
                `Target language code: ${input.languageCode}`,
                `Sentence: ${input.sourceText}`,
                clarificationContext,
            ].join("\n"),
        });

        if (result.object.status === "clarification_needed") {
            return {
                status: "clarification_needed" as const,
                clarification: result.object.clarification,
                modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
                modelId: appConfig.LEARNING_ANALYSIS_MODEL,
                promptVersion: "v4",
            };
        }

        return {
            status: "analyzed" as const,
            analysis: result.object.analysis,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
            promptVersion: "v4",
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
