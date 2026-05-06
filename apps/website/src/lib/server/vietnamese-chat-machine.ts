import { getAppConfig } from "./app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { Learnable } from "@plearn/core/learning/model";
import type { Services } from "@plearn/trpc/server";
import { streamText } from "ai";
import "server-only";

export interface VietnameseChatTurnInput {
    readonly message: string;
    readonly userId: string;
    readonly services: Services;
}

type ChatIntent = "catalog_lookup" | "semantic_search" | "progress_overview" | "general_vietnamese";

type MachineState =
    | { readonly status: "validating" }
    | { readonly status: "classifying" }
    | { readonly status: "retrieving"; readonly intent: ChatIntent }
    | { readonly status: "responding"; readonly intent: ChatIntent; readonly context: ChatContext }
    | { readonly status: "failed"; readonly reason: string };

interface LearnableSummary {
    readonly id: string;
    readonly text: string;
    readonly translation: string;
    readonly type: Learnable["type"];
    readonly occurrenceCount: number;
}

interface WorkspaceSummary {
    readonly id: string;
    readonly sourceText: string;
    readonly summary: string | null;
    readonly createdAtIso: string;
}

interface ChatContext {
    readonly intent: ChatIntent;
    readonly lookup?: {
        readonly learnable?: LearnableSummary;
        readonly related: readonly LearnableSummary[];
        readonly backlinks: readonly LearnableSummary[];
    };
    readonly semanticMatches?: readonly LearnableSummary[];
    readonly progress?: {
        readonly totalLearnables: number;
        readonly topLearnables: readonly LearnableSummary[];
        readonly recentWorkspaces: readonly WorkspaceSummary[];
    };
}

function isLearnable(value: Learnable | undefined): value is Learnable {
    return Boolean(value);
}

function toLearnableSummary(learnable: Learnable): LearnableSummary {
    return {
        id: learnable.id,
        text: learnable.canonicalText,
        translation: learnable.translation,
        type: learnable.type,
        occurrenceCount: learnable.occurrenceCount,
    };
}

function classifyIntent(message: string): ChatIntent {
    const lowered = message.toLowerCase();
    if (/(progress|stats|streak|how am i doing|coverage|frequency|my data|fetch|dashboard|summary)/i.test(lowered)) {
        return "progress_overview";
    }
    if (/(what is|what does|lookup|catalog|mean|meaning|entry|phrase|word)/i.test(lowered)) {
        return "catalog_lookup";
    }
    if (/(similar|related|like this|search|find|closest|semantic)/i.test(lowered)) {
        return "semantic_search";
    }

    return "general_vietnamese";
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

function createAnalysisAbortSignal() {
    const appConfig = getAppConfig();
    if (!appConfig.LEARNING_ANALYSIS_TIMEOUT_MS) {
        return undefined;
    }

    return AbortSignal.timeout(appConfig.LEARNING_ANALYSIS_TIMEOUT_MS);
}

async function buildContext(input: {
    readonly intent: ChatIntent;
    readonly message: string;
    readonly userId: string;
    readonly services: Services;
}): Promise<ChatContext> {
    const { intent, message, services, userId } = input;

    if (intent === "catalog_lookup") {
        const found = await services.learnableCatalogService.lookupByText("vi", message.trim());
        if (!found) {
            return {
                intent,
                semanticMatches: (await services.semanticSearchService.search({ languageCode: "vi", query: message, limit: 6 })).map(
                    (match) => toLearnableSummary(match.learnable),
                ),
            };
        }

        const [related, backlinks] = await Promise.all([
            services.learnableCatalogService.listRelatedLearnables(found.id),
            services.learnableCatalogService.listLearnableBacklinks(found.id),
        ]);
        const [relatedTargets, backlinkSources] = await Promise.all([
            Promise.all(related.slice(0, 6).map((item) => services.learnableCatalogService.getLearnable(item.toLearnableId))),
            Promise.all(backlinks.slice(0, 6).map((item) => services.learnableCatalogService.getLearnable(item.fromLearnableId))),
        ]);

        return {
            intent,
            lookup: {
                learnable: toLearnableSummary(found),
                related: relatedTargets.filter(isLearnable).map(toLearnableSummary),
                backlinks: backlinkSources.filter(isLearnable).map(toLearnableSummary),
            },
        };
    }

    if (intent === "semantic_search") {
        const matches = await services.semanticSearchService.search({
            languageCode: "vi",
            query: message,
            limit: 10,
        });

        return {
            intent,
            semanticMatches: matches.map((match) => toLearnableSummary(match.learnable)),
        };
    }

    if (intent === "progress_overview") {
        const [learnables, workspaces] = await Promise.all([
            services.learnableCatalogService.listLearnables({
                languageCode: "vi",
                limit: 100,
                sort: "frequency",
            }),
            services.learnableCatalogService.listSentenceWorkspaces(userId, "vi", {
                limit: 12,
            }),
        ]);

        return {
            intent,
            progress: {
                totalLearnables: learnables.length,
                topLearnables: learnables.slice(0, 8).map(toLearnableSummary),
                recentWorkspaces: workspaces.slice(0, 8).map((workspace) => ({
                    id: workspace.id,
                    sourceText: workspace.sourceText,
                    summary: workspace.summary ?? null,
                    createdAtIso: workspace.createdAt.toISOString(),
                })),
            },
        };
    }

    const [annotated, matches] = await Promise.all([
        services.learnableCatalogService.annotateText("vi", message),
        services.semanticSearchService.search({ languageCode: "vi", query: message, limit: 6 }),
    ]);

    return {
        intent,
        semanticMatches: [
            ...annotated.slice(0, 4).map(toLearnableSummary),
            ...matches.map((match) => toLearnableSummary(match.learnable)),
        ].slice(0, 8),
    };
}

function buildSystemPrompt(context: ChatContext): string {
    return [
        "You are Plearn's Vietnamese learning assistant.",
        "Focus on practical Southern Vietnamese usage and natural phrasing.",
        "You are running inside an authenticated app session.",
        "When context data is available, you DO have access to it for this reply.",
        "Never claim you cannot access user data if Context JSON includes catalog/workspace/progress data.",
        "When the user asks to fetch their data, summarize the available Context JSON first, then offer next actions.",
        "Ground answers in context data and do not invent catalog facts.",
        "If context is missing for a claim, say what is unknown and suggest a concrete next query.",
        "Be concise, concrete, and helpful for day-to-day learning.",
        "When explaining language, prioritize pronouns, particles, register, and natural alternatives.",
        `Intent: ${context.intent}`,
        `Context JSON: ${JSON.stringify(context)}`,
    ].join("\n");
}

export async function runVietnameseChatTurn(input: VietnameseChatTurnInput): Promise<Response> {
    let state: MachineState = { status: "validating" };

    const userMessage = input.message.trim();
    if (!userMessage) {
        state = { status: "failed", reason: "Message cannot be empty." };
    }

    if (state.status === "failed") {
        return new Response(state.reason, { status: 400 });
    }

    state = { status: "classifying" };
    const intent = classifyIntent(userMessage);

    state = { status: "retrieving", intent };
    const context = await buildContext({
        intent,
        message: userMessage,
        userId: input.userId,
        services: input.services,
    });

    state = { status: "responding", intent, context };

    const result = streamText({
        model: getAnalysisModel(),
        system: buildSystemPrompt(context),
        prompt: userMessage,
        maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
        abortSignal: createAnalysisAbortSignal(),
    });

    return result.toTextStreamResponse({
        headers: {
            "x-plearn-chat-intent": intent,
        },
    });
}
