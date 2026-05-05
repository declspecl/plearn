import { getAppConfig } from "./app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { type LearningAnalyzer, type LearningEmbedder } from "@plearn/core/learning/repository";
import { buildSearchDocument } from "@plearn/core/learning/service";
import { embed, generateObject, streamText } from "ai";
import { performance } from "node:perf_hooks";
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

const basicAnalysisSchema = z.object({
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
        }),
    ),
    words: z.array(
        z.object({
            text: z.string(),
            meaning: z.string(),
            partOfSpeech: z.string().optional(),
            learnableType: z.enum(["vocabulary", "utility_word"]),
        }),
    ),
});

const enrichmentSchema = z.object({
    components: z.array(
        z.object({
            index: z.number().int().nonnegative(),
            notes: z.string().optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    words: z.array(
        z.object({
            index: z.number().int().nonnegative(),
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

const basicResponseSchema = z.discriminatedUnion("status", [
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
        analysis: basicAnalysisSchema,
    }),
]);

const basicExplanationSchema = z.object({
    sentence: z.object({
        text: z.string(),
        naturalGloss: z.string(),
        literalGloss: z.string().optional(),
    }),
    components: z.array(
        z.object({
            text: z.string(),
            meaning: z.string(),
            literalMeaning: z.string().optional(),
            formula: z.string(),
            learnableType: z.enum(["grammar_pattern", "phrase"]),
        }),
    ),
    words: z.array(
        z.object({
            text: z.string(),
            meaning: z.string(),
            literalMeaning: z.string().optional(),
            partOfSpeech: z.string().optional(),
            learnableType: z.enum(["vocabulary", "utility_word"]),
        }),
    ),
    idioms: z.array(
        z.object({
            text: z.string(),
            literalMeaning: z.string(),
            actualMeaning: z.string(),
        }),
    ),
    registerCommentary: z.string().optional(),
    pronounNotes: z.string().optional(),
    structuralNotes: z.string().optional(),
});

const explanationEnrichmentSchema = z.object({
    components: z.array(
        z.object({
            index: z.number().int().nonnegative(),
            notes: z.string().optional(),
            registerNotes: z.string().optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    words: z.array(
        z.object({
            index: z.number().int().nonnegative(),
            notes: z.string().optional(),
            registerNotes: z.string().optional(),
            exampleHints: z.array(z.object({ exampleText: z.string(), translation: z.string() })).default([]),
        }),
    ),
    idioms: z.array(
        z.object({
            index: z.number().int().nonnegative(),
            notes: z.string().optional(),
        }),
    ),
});

type Analysis = z.infer<typeof analysisSchema>;
type BasicAnalysis = z.infer<typeof basicAnalysisSchema>;
type Enrichment = z.infer<typeof enrichmentSchema>;
type BasicExplanation = z.infer<typeof basicExplanationSchema>;
type ExplanationEnrichment = z.infer<typeof explanationEnrichmentSchema>;

function buildPass1Prompt(input: {
    readonly languageCode: string;
    readonly sourceText: string;
    readonly clarifications?: readonly { readonly question: string; readonly answer: string }[];
}) {
    const previousClarifications = input.clarifications?.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n") ?? "";
    const clarificationContext = previousClarifications ? `\n\nPrevious Clarifications:\n${previousClarifications}` : "";

    return [
        "You are decomposing an English sentence into Southern Vietnamese learning units.",
        "Vietnamese social registers and pronouns (anh, chị, em, bạn, mày, tôi, etc.) are CRITICAL. If the source text contains pronouns like 'I', 'you', 'he', 'she', or 'they' and the relationship/relative ages are unknown, you MUST set status to 'clarification_needed'.",
        "Do not default to formal 'tôi' or 'bạn' unless the input explicitly suggests a formal setting. In Southern Vietnamese, these are often too stiff. Prefer to ask who the speaker is talking to.",
        "If you ask for clarification, the clarification question and every option label MUST be in English.",
        "If the text is truly unambiguous or you have sufficient clarification context, set status to 'analyzed'.",
        "For the decomposition, use Southern Vietnamese specifically: prefer common Southern words, particles, pronouns, everyday phrasing, and regional nuances.",
        "This is pass 1. Return only the core structure, not enrichment.",
        "Return 3 sections in the analysis:",
        "1. sentence: the full Southern Vietnamese translation with its English meaning.",
        "2. components: phrases, structures, and grammar patterns. Each has Southern Vietnamese text, English meaning, and a formula showing how to construct/use the pattern (e.g. 'Subject + đang + Verb'). Set learnableType to 'grammar_pattern' for structural patterns or 'phrase' for idiomatic phrases. For the formula field: describe usage, position, or structure - never just repeat the Vietnamese text itself.",
        "3. words: individual Southern Vietnamese words/graphemes with their English meaning and part of speech. Set learnableType to 'vocabulary' for content words or 'utility_word' for function words (particles, conjunctions, etc.). Do not include a word in both components and words - if it appears as a component, omit it from words.",
        "Do not include notes or example hints in pass 1.",
        "Do not invent duplicate items unless they are genuinely different learnable concepts.",
        `Target language code: ${input.languageCode}`,
        `Sentence: ${input.sourceText}`,
        clarificationContext,
    ].join("\n");
}

function buildPass2Prompt(input: { readonly sourceText: string; readonly analysis: BasicAnalysis }) {
    return [
        "You are enriching an existing Southern Vietnamese sentence decomposition.",
        "Keep the existing translation, components, words, meanings, formulas, types, and part-of-speech decisions exactly as given.",
        "Do not add, remove, rename, merge, or reorder items.",
        "For each item, return only:",
        "- index: the original zero-based index",
        "- notes: optional concise usage nuance in English",
        "- exampleHints: 0-2 short Southern Vietnamese examples with English translations",
        "Leave notes empty if there is no useful extra nuance. Leave exampleHints empty unless they add clear learning value.",
        `Source sentence: ${input.sourceText}`,
        `Existing analysis JSON: ${JSON.stringify(input.analysis)}`,
    ].join("\n");
}

function mergeEnrichment(analysis: BasicAnalysis, enrichment: Enrichment): Analysis {
    return {
        sentence: analysis.sentence,
        components: analysis.components.map((component, index) => {
            const extra = enrichment.components.find((entry) => entry.index === index);

            return {
                ...component,
                notes: extra?.notes,
                exampleHints: extra?.exampleHints ?? [],
            };
        }),
        words: analysis.words.map((word, index) => {
            const extra = enrichment.words.find((entry) => entry.index === index);

            return {
                ...word,
                notes: extra?.notes,
                exampleHints: extra?.exampleHints ?? [],
            };
        }),
    };
}

function buildExplainPass1Prompt(input: { readonly vietnameseText: string }) {
    return [
        "You are explaining a Vietnamese sentence to an English-speaking learner of Southern Vietnamese.",
        "The input IS Vietnamese. Your job is comprehension, not translation generation. Decompose the observed Vietnamese surface form directly.",
        "Return the following sections:",
        "1. sentence: the original Vietnamese text, a natural English gloss (how a native English speaker would express the same idea), and an optional literal gloss when it differs meaningfully from the natural one.",
        "2. components: phrases, structures, and grammar patterns found in the sentence. Each has the Vietnamese text, English meaning, optional literal meaning, and a formula showing how to construct/use the pattern. Set learnableType to 'grammar_pattern' for structural patterns or 'phrase' for idiomatic phrases. For the formula field: describe usage, position, or structure - never just repeat the Vietnamese text.",
        "3. words: individual Vietnamese words/graphemes with their English meaning and part of speech. Set learnableType to 'vocabulary' for content words or 'utility_word' for function words (particles, conjunctions, etc.). Do not include a word in both components and words.",
        "4. idioms: any fixed expressions, idioms, or collocations. For each, provide the Vietnamese text, what it literally means word-by-word, and what it actually means.",
        "5. registerCommentary: optional. Comment on the overall register (formal, casual, intimate, etc.) and what it tells us about the social context.",
        "6. pronounNotes: optional. Explain the pronoun choices and what they reveal about the speaker/listener relationship, ages, and social dynamics.",
        "7. structuralNotes: optional. Note omitted subjects, sentence-final particles, Southern-specific vocabulary or phrasing, or any structural features a learner might miss.",
        "Focus on Southern Vietnamese. Flag Northern or formal alternatives only when the input uses them unexpectedly.",
        "This is pass 1. Return only the core structure. Do not include notes, registerNotes, or exampleHints.",
        `Vietnamese sentence: ${input.vietnameseText}`,
    ].join("\n");
}

function buildExplainPass2Prompt(input: { readonly vietnameseText: string; readonly explanation: BasicExplanation }) {
    return [
        "You are enriching an existing Vietnamese sentence explanation.",
        "Keep all existing fields exactly as given. Do not add, remove, rename, merge, or reorder items.",
        "For each component and word, return only:",
        "- index: the original zero-based index",
        "- notes: optional concise usage nuance in English",
        "- registerNotes: optional note on the register level or social connotation of this specific item",
        "- exampleHints: 0-2 short Southern Vietnamese examples with English translations",
        "For each idiom, return only:",
        "- index: the original zero-based index",
        "- notes: optional additional context",
        "Leave fields empty if there is no useful extra nuance.",
        `Source sentence: ${input.vietnameseText}`,
        `Existing explanation JSON: ${JSON.stringify(input.explanation)}`,
    ].join("\n");
}

function mergeExplanationEnrichment(explanation: BasicExplanation, enrichment: ExplanationEnrichment) {
    return {
        sentence: explanation.sentence,
        components: explanation.components.map((component, index) => {
            const extra = enrichment.components.find((entry) => entry.index === index);
            return {
                ...component,
                notes: extra?.notes,
                registerNotes: extra?.registerNotes,
                exampleHints: extra?.exampleHints ?? [],
            };
        }),
        words: explanation.words.map((word, index) => {
            const extra = enrichment.words.find((entry) => entry.index === index);
            return {
                ...word,
                notes: extra?.notes,
                registerNotes: extra?.registerNotes,
                exampleHints: extra?.exampleHints ?? [],
            };
        }),
        idioms: explanation.idioms.map((idiom, index) => {
            const extra = enrichment.idioms.find((entry) => entry.index === index);
            return {
                ...idiom,
                notes: extra?.notes,
            };
        }),
        registerCommentary: explanation.registerCommentary,
        pronounNotes: explanation.pronounNotes,
        structuralNotes: explanation.structuralNotes,
    };
}

function getAnalysisProviderOptions() {
    const appConfig = getAppConfig();

    if (appConfig.LEARNING_ANALYSIS_PROVIDER !== "deepseek" || appConfig.LEARNING_ANALYSIS_THINKING_MODE === "inherit") {
        return undefined;
    }

    return {
        deepseek: {
            thinking: {
                type: appConfig.LEARNING_ANALYSIS_THINKING_MODE,
            },
        },
    };
}

function createAnalysisAbortSignal() {
    const appConfig = getAppConfig();

    if (!appConfig.LEARNING_ANALYSIS_TIMEOUT_MS) {
        return undefined;
    }

    return AbortSignal.timeout(appConfig.LEARNING_ANALYSIS_TIMEOUT_MS);
}

function roundNumber(value: number) {
    return Math.round(value * 100) / 100;
}

function calculateTokensPerSecond(tokens: number | undefined, elapsedMs: number) {
    if (!tokens || elapsedMs <= 0) {
        return undefined;
    }

    return roundNumber(tokens / (elapsedMs / 1000));
}

function pickResponseHeaders(headers: unknown) {
    if (!headers || typeof headers !== "object") {
        return undefined;
    }

    const candidateHeaders = headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers;
    if (!candidateHeaders || typeof candidateHeaders !== "object") {
        return undefined;
    }

    const source = candidateHeaders as Record<string, unknown>;
    const interestingKeys = [
        "x-request-id",
        "x-ratelimit-limit",
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
        "retry-after",
        "retry-after-ms",
        "openai-processing-ms",
    ];

    const filtered = Object.fromEntries(
        interestingKeys.flatMap((key) => {
            const value = source[key];
            return typeof value === "string" || typeof value === "number" ? [[key, value]] : [];
        }),
    );

    return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function logAnalysisCallDetails(input: {
    readonly kind: "generateObject" | "generateObject.pass1" | "generateObject.pass2" | "streamProbe";
    readonly status?: "clarification_needed" | "analyzed";
    readonly elapsedMs: number;
    readonly finishReason?: string;
    readonly responseHeaders?: Record<string, string | number>;
    readonly providerMetadata?: unknown;
    readonly reasoningText?: string;
    readonly usage?: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        reasoningTokens?: number;
        cachedInputTokens?: number;
    };
    readonly extra?: Readonly<Record<string, unknown>>;
}) {
    const appConfig = getAppConfig();

    console.info(`[PERF] analysis.ai.${input.kind}.details`, {
        provider: appConfig.LEARNING_ANALYSIS_PROVIDER,
        modelId: appConfig.LEARNING_ANALYSIS_MODEL,
        thinkingMode: appConfig.LEARNING_ANALYSIS_THINKING_MODE,
        maxRetries: appConfig.LEARNING_ANALYSIS_MAX_RETRIES,
        timeoutMs: appConfig.LEARNING_ANALYSIS_TIMEOUT_MS ?? null,
        status: input.status,
        finishReason: input.finishReason,
        elapsedMs: Math.round(input.elapsedMs),
        outputTokensPerSecond: calculateTokensPerSecond(input.usage?.outputTokens, input.elapsedMs),
        usage: input.usage,
        reasoningChars: input.reasoningText?.length ?? 0,
        responseHeaders: input.responseHeaders,
        providerMetadata: input.providerMetadata,
        ...input.extra,
    });
}

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
    private async runStreamProbe(input: {
        readonly languageCode: string;
        readonly sourceText: string;
        readonly clarifications?: readonly { readonly question: string; readonly answer: string }[];
    }) {
        const prompt = buildPass1Prompt(input);
        const startedAt = performance.now();
        let firstDeltaAt: number | undefined;
        let textDeltaChars = 0;
        let reasoningDeltaChars = 0;
        let textDeltaCount = 0;
        let reasoningDeltaCount = 0;

        const result = streamText({
            model: getAnalysisModel(),
            prompt,
            maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: createAnalysisAbortSignal(),
            providerOptions: getAnalysisProviderOptions(),
            onChunk: ({ chunk }) => {
                if (chunk.type !== "text-delta" && chunk.type !== "reasoning-delta") {
                    return;
                }

                firstDeltaAt ??= performance.now();

                if (chunk.type === "text-delta") {
                    textDeltaChars += chunk.text.length;
                    textDeltaCount += 1;
                    return;
                }

                reasoningDeltaChars += chunk.text.length;
                reasoningDeltaCount += 1;
            },
        });

        await result.consumeStream();

        const [text, reasoningText, usage, finishReason, providerMetadata, response] = await Promise.all([
            result.text,
            result.reasoningText,
            result.usage,
            result.finishReason,
            result.providerMetadata,
            result.response,
        ]);

        const finishedAt = performance.now();
        const elapsedMs = finishedAt - startedAt;
        const msToFirstDelta = firstDeltaAt ? Math.round(firstDeltaAt - startedAt) : undefined;
        const msFromFirstDeltaToFinish = firstDeltaAt ? Math.round(finishedAt - firstDeltaAt) : undefined;

        logAnalysisCallDetails({
            kind: "streamProbe",
            elapsedMs,
            finishReason,
            reasoningText,
            responseHeaders: pickResponseHeaders(response.headers),
            providerMetadata,
            usage,
            extra: {
                firstDeltaMs: msToFirstDelta,
                streamDurationAfterFirstDeltaMs: msFromFirstDeltaToFinish,
                textDeltaChars,
                reasoningDeltaChars,
                textDeltaCount,
                reasoningDeltaCount,
                streamedTextChars: text.length,
                streamedReasoningChars: reasoningText?.length ?? 0,
                streamOutputTokensPerSecondAfterFirstDelta:
                    firstDeltaAt && usage.outputTokens
                        ? calculateTokensPerSecond(usage.outputTokens, finishedAt - firstDeltaAt)
                        : undefined,
            },
        });
    }

    public async analyzeSentence(input: {
        languageCode: string;
        sourceText: string;
        clarifications?: readonly { question: string; answer: string }[];
    }) {
        const appConfig = getAppConfig();
        const pass1Prompt = buildPass1Prompt(input);

        if (appConfig.LEARNING_ANALYSIS_STREAM_PROBE === "before") {
            try {
                await this.runStreamProbe(input);
            } catch (error) {
                console.warn("[PERF] analysis.ai.streamProbe.failed", {
                    provider: appConfig.LEARNING_ANALYSIS_PROVIDER,
                    modelId: appConfig.LEARNING_ANALYSIS_MODEL,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        const startedAt = performance.now();

        const pass1Result = await generateObject({
            model: getAnalysisModel(),
            schema: basicResponseSchema,
            prompt: pass1Prompt,
            maxRetries: appConfig.LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: createAnalysisAbortSignal(),
            providerOptions: getAnalysisProviderOptions(),
        });
        const pass1ElapsedMs = performance.now() - startedAt;

        logAnalysisCallDetails({
            kind: "generateObject.pass1",
            status: pass1Result.object.status,
            elapsedMs: pass1ElapsedMs,
            finishReason: pass1Result.finishReason,
            reasoningText: pass1Result.reasoning,
            responseHeaders: pickResponseHeaders(pass1Result.response.headers),
            providerMetadata: pass1Result.providerMetadata,
            usage: pass1Result.usage,
        });

        if (pass1Result.object.status === "clarification_needed") {
            return {
                status: "clarification_needed" as const,
                clarification: pass1Result.object.clarification,
                modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
                modelId: appConfig.LEARNING_ANALYSIS_MODEL,
                promptVersion: "v5",
            };
        }

        let analysis = mergeEnrichment(pass1Result.object.analysis, { components: [], words: [] });

        const pass2StartedAt = performance.now();

        try {
            const pass2Result = await generateObject({
                model: getAnalysisModel(),
                schema: enrichmentSchema,
                prompt: buildPass2Prompt({
                    sourceText: input.sourceText,
                    analysis: pass1Result.object.analysis,
                }),
                maxRetries: appConfig.LEARNING_ANALYSIS_MAX_RETRIES,
                abortSignal: createAnalysisAbortSignal(),
                providerOptions: getAnalysisProviderOptions(),
            });
            const pass2ElapsedMs = performance.now() - pass2StartedAt;

            logAnalysisCallDetails({
                kind: "generateObject.pass2",
                elapsedMs: pass2ElapsedMs,
                finishReason: pass2Result.finishReason,
                reasoningText: pass2Result.reasoning,
                responseHeaders: pickResponseHeaders(pass2Result.response.headers),
                providerMetadata: pass2Result.providerMetadata,
                usage: pass2Result.usage,
            });

            analysis = mergeEnrichment(pass1Result.object.analysis, pass2Result.object);
        } catch (error) {
            console.warn("[PERF] analysis.ai.generateObject.pass2.failed", {
                provider: appConfig.LEARNING_ANALYSIS_PROVIDER,
                modelId: appConfig.LEARNING_ANALYSIS_MODEL,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        const elapsedMs = performance.now() - startedAt;

        logAnalysisCallDetails({
            kind: "generateObject",
            status: "analyzed",
            elapsedMs,
            extra: {
                passCount: 2,
                pass1ElapsedMs: Math.round(pass1ElapsedMs),
                pass2ElapsedMs: Math.round(performance.now() - pass2StartedAt),
            },
        });

        return {
            status: "analyzed" as const,
            analysis,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
            promptVersion: "v5",
        };
    }

    public async explainVietnameseSentence(input: { vietnameseText: string }) {
        const appConfig = getAppConfig();
        const pass1Prompt = buildExplainPass1Prompt(input);

        const startedAt = performance.now();

        const pass1Result = await generateObject({
            model: getAnalysisModel(),
            schema: basicExplanationSchema,
            prompt: pass1Prompt,
            maxRetries: appConfig.LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: createAnalysisAbortSignal(),
            providerOptions: getAnalysisProviderOptions(),
        });
        const pass1ElapsedMs = performance.now() - startedAt;

        logAnalysisCallDetails({
            kind: "generateObject.pass1",
            elapsedMs: pass1ElapsedMs,
            finishReason: pass1Result.finishReason,
            reasoningText: pass1Result.reasoning,
            responseHeaders: pickResponseHeaders(pass1Result.response.headers),
            providerMetadata: pass1Result.providerMetadata,
            usage: pass1Result.usage,
            extra: { flow: "explain" },
        });

        let explanation = mergeExplanationEnrichment(pass1Result.object, { components: [], words: [], idioms: [] });

        const pass2StartedAt = performance.now();

        try {
            const pass2Result = await generateObject({
                model: getAnalysisModel(),
                schema: explanationEnrichmentSchema,
                prompt: buildExplainPass2Prompt({
                    vietnameseText: input.vietnameseText,
                    explanation: pass1Result.object,
                }),
                maxRetries: appConfig.LEARNING_ANALYSIS_MAX_RETRIES,
                abortSignal: createAnalysisAbortSignal(),
                providerOptions: getAnalysisProviderOptions(),
            });
            const pass2ElapsedMs = performance.now() - pass2StartedAt;

            logAnalysisCallDetails({
                kind: "generateObject.pass2",
                elapsedMs: pass2ElapsedMs,
                finishReason: pass2Result.finishReason,
                reasoningText: pass2Result.reasoning,
                responseHeaders: pickResponseHeaders(pass2Result.response.headers),
                providerMetadata: pass2Result.providerMetadata,
                usage: pass2Result.usage,
                extra: { flow: "explain" },
            });

            explanation = mergeExplanationEnrichment(pass1Result.object, pass2Result.object);
        } catch (error) {
            console.warn("[PERF] explain.ai.generateObject.pass2.failed", {
                provider: appConfig.LEARNING_ANALYSIS_PROVIDER,
                modelId: appConfig.LEARNING_ANALYSIS_MODEL,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        const elapsedMs = performance.now() - startedAt;

        logAnalysisCallDetails({
            kind: "generateObject",
            status: "analyzed",
            elapsedMs,
            extra: {
                flow: "explain",
                passCount: 2,
                pass1ElapsedMs: Math.round(pass1ElapsedMs),
                pass2ElapsedMs: Math.round(performance.now() - pass2StartedAt),
            },
        });

        return {
            status: "explained" as const,
            explanation,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
            promptVersion: "explain-v1",
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
