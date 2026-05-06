import type { ChatFailureCode } from "@/lib/chat/types";
import type { ChatRepository } from "@/lib/server/chat/persistence/repository";
import { getToolTimeoutMs, logChatWarn, withTimeout } from "@/lib/server/chat/runtime/helpers";
import type { Learnable } from "@plearn/core/learning/model";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import type { Services } from "@plearn/trpc/server";
import { tool, type ToolSet } from "ai";
import "server-only";
import { z } from "zod";

export interface ToolSuccess<TData> {
    readonly ok: true;
    readonly data: TData;
}

export interface ToolFailure {
    readonly ok: false;
    readonly errorCode: ChatFailureCode;
    readonly errorMessage: string;
}

export type ToolResult<TData> = ToolSuccess<TData> | ToolFailure;

interface ChatToolContext {
    readonly services: Services;
    readonly repository: ChatRepository;
    readonly embedder: LearningEmbedder;
    readonly userId: string;
    readonly threadId: string;
    readonly languageCode: string;
    readonly signal?: AbortSignal;
}

function ok<TData>(data: TData): ToolSuccess<TData> {
    return { ok: true, data };
}

function fail(errorCode: ChatFailureCode, errorMessage: string): ToolFailure {
    return { ok: false, errorCode, errorMessage };
}

export function isToolFailure(value: unknown): value is ToolFailure {
    return Boolean(
        value &&
        typeof value === "object" &&
        "ok" in value &&
        (value as { ok?: unknown }).ok === false &&
        typeof (value as { errorCode?: unknown }).errorCode === "string" &&
        typeof (value as { errorMessage?: unknown }).errorMessage === "string",
    );
}

function toLearnableSummary(learnable: Learnable) {
    return {
        id: learnable.id,
        canonicalText: learnable.canonicalText,
        translation: learnable.translation,
        type: learnable.type,
        partOfSpeech: learnable.partOfSpeech ?? null,
        usageNotes: learnable.usageNotes,
        patternTemplate: learnable.patternTemplate ?? null,
        occurrenceCount: learnable.occurrenceCount,
        aliases: learnable.aliases,
        examples: learnable.examples.slice(0, 5).map((example) => ({
            id: example.id,
            text: example.exampleText,
            translation: example.translation,
            source: example.source,
        })),
    };
}

function trimText(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;
}

async function runTool<TData>(input: {
    context: ChatToolContext;
    toolName: string;
    execute: () => Promise<TData>;
}): Promise<ToolResult<TData>> {
    try {
        const data = await withTimeout({
            operation: input.execute(),
            timeoutMs: getToolTimeoutMs(),
            timeoutMessage: `${input.toolName} timed out.`,
            timeoutCode: "tool_timeout",
            signal: input.context.signal,
        });

        return ok(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : `${input.toolName} failed.`;
        const code: ChatFailureCode =
            error && typeof error === "object" && "failureCode" in error && typeof error.failureCode === "string"
                ? (error.failureCode as ChatFailureCode)
                : "tool_error";

        logChatWarn("tool.failed", { toolName: input.toolName, errorCode: code, message });

        return fail(code === "timeout" ? "tool_timeout" : code, message);
    }
}

export class ChatToolService {
    public createToolSet(context: ChatToolContext): ToolSet {
        return {
            searchLearnables: tool({
                description: "Search learnables semantically by user query.",
                inputSchema: z.object({
                    query: z.string().min(1),
                    limit: z.number().int().positive().max(20).default(8),
                }),
                execute: async ({ query, limit }) =>
                    runTool({
                        context,
                        toolName: "searchLearnables",
                        execute: async () => {
                            const matches = await context.services.semanticSearchService.search({
                                languageCode: context.languageCode,
                                query,
                                limit,
                            });

                            return {
                                matches: matches.map((match) => ({
                                    confidence: match.confidence,
                                    reason: match.reason,
                                    learnable: toLearnableSummary(match.learnable),
                                })),
                            };
                        },
                    }),
            }),
            lookupLearnable: tool({
                description: "Look up one learnable exactly by text or alias.",
                inputSchema: z.object({
                    text: z.string().min(1),
                }),
                execute: async ({ text }) =>
                    runTool({
                        context,
                        toolName: "lookupLearnable",
                        execute: async () => {
                            const found =
                                (await context.services.learnableCatalogService.lookupByText(context.languageCode, text)) ??
                                (await context.services.semanticSearchService
                                    .search({
                                        languageCode: context.languageCode,
                                        query: text,
                                        limit: 1,
                                    })
                                    .then((matches) =>
                                        matches[0]?.confidence && matches[0].confidence >= 0.45 ? matches[0].learnable : null,
                                    ));

                            if (!found) {
                                return { found: null };
                            }

                            const [related, backlinks] = await Promise.all([
                                context.services.learnableCatalogService.listRelatedLearnables(found.id),
                                context.services.learnableCatalogService.listLearnableBacklinks(found.id),
                            ]);

                            return {
                                found: toLearnableSummary(found),
                                related,
                                backlinks,
                            };
                        },
                    }),
            }),
            getLearnableDetails: tool({
                description: "Fetch full learnable details, occurrences, related items, and backlinks.",
                inputSchema: z.object({
                    learnableId: z.string().min(1),
                }),
                execute: async ({ learnableId }) =>
                    runTool({
                        context,
                        toolName: "getLearnableDetails",
                        execute: async () => {
                            const learnable = await context.services.learnableCatalogService.getLearnable(learnableId as Learnable["id"]);
                            if (!learnable) {
                                return { learnable: null };
                            }

                            const [occurrences, related, backlinks] = await Promise.all([
                                context.services.learnableCatalogService.listOccurrences(learnable.id),
                                context.services.learnableCatalogService.listRelatedLearnables(learnable.id),
                                context.services.learnableCatalogService.listLearnableBacklinks(learnable.id),
                            ]);

                            return {
                                learnable: toLearnableSummary(learnable),
                                occurrences: occurrences.slice(0, 10).map((occurrence) => ({
                                    id: occurrence.id,
                                    sourceSpanText: occurrence.sourceSpanText,
                                    sourceSentenceText: occurrence.sourceSentenceText,
                                    rationale: occurrence.rationale ?? null,
                                    createdAtIso: occurrence.createdAt.toISOString(),
                                })),
                                related,
                                backlinks,
                            };
                        },
                    }),
            }),
            listRecentWorkspaces: tool({
                description: "List recent sentence workspaces for the current user.",
                inputSchema: z.object({
                    limit: z.number().int().positive().max(20).default(8),
                    query: z.string().optional(),
                }),
                execute: async ({ limit, query }) =>
                    runTool({
                        context,
                        toolName: "listRecentWorkspaces",
                        execute: async () => {
                            const workspaces = await context.services.learnableCatalogService.listSentenceWorkspaces(
                                context.userId,
                                context.languageCode,
                                {
                                    limit,
                                    query,
                                },
                            );

                            return {
                                workspaces: workspaces.map((workspace) => ({
                                    id: workspace.id,
                                    sourceText: workspace.sourceText,
                                    sourceTextPreview: trimText(workspace.sourceText, 220),
                                    summary: workspace.summary ?? null,
                                    status: workspace.status,
                                    createdAtIso: workspace.createdAt.toISOString(),
                                    updatedAtIso: workspace.updatedAt.toISOString(),
                                })),
                            };
                        },
                    }),
            }),
            getWorkspace: tool({
                description: "Fetch a sentence workspace and its analysis items.",
                inputSchema: z.object({
                    workspaceId: z.string().min(1),
                }),
                execute: async ({ workspaceId }) =>
                    runTool({
                        context,
                        toolName: "getWorkspace",
                        execute: async () => {
                            const workspace = await context.services.learnableCatalogService.getWorkspace(workspaceId as never);
                            if (!workspace || workspace.createdByUserId !== context.userId) {
                                return { workspace: null };
                            }

                            return {
                                workspace: {
                                    id: workspace.id,
                                    sourceText: workspace.sourceText,
                                    sourceTextPreview: trimText(workspace.sourceText, 280),
                                    summary: workspace.summary ?? null,
                                    status: workspace.status,
                                    createdAtIso: workspace.createdAt.toISOString(),
                                    updatedAtIso: workspace.updatedAt.toISOString(),
                                    items: workspace.items.map((item) => ({
                                        id: item.id,
                                        proposedType: item.proposedType,
                                        proposedText: item.proposedText,
                                        proposedTranslation: item.proposedTranslation,
                                        proposedNotes: item.proposedNotes,
                                        reviewAction: item.reviewAction,
                                    })),
                                },
                            };
                        },
                    }),
            }),
            annotateText: tool({
                description: "Annotate text with known learnables from the catalog.",
                inputSchema: z.object({
                    text: z.string().min(1),
                }),
                execute: async ({ text }) =>
                    runTool({
                        context,
                        toolName: "annotateText",
                        execute: async () => {
                            const exactMatches = await context.services.learnableCatalogService.annotateText(context.languageCode, text);
                            const learnables =
                                exactMatches.length > 0
                                    ? exactMatches
                                    : await context.services.semanticSearchService
                                          .search({
                                              languageCode: context.languageCode,
                                              query: text,
                                              limit: 5,
                                          })
                                          .then((matches) =>
                                              matches.filter((match) => match.confidence >= 0.35).map((match) => match.learnable),
                                          );

                            return {
                                matches: learnables.map((learnable) => toLearnableSummary(learnable)),
                            };
                        },
                    }),
            }),
            searchOccurrences: tool({
                description: "Find saved sentence occurrences for a learnable.",
                inputSchema: z.object({
                    learnableId: z.string().min(1),
                    limit: z.number().int().positive().max(20).default(8),
                }),
                execute: async ({ learnableId, limit }) =>
                    runTool({
                        context,
                        toolName: "searchOccurrences",
                        execute: async () => {
                            const occurrences = await context.services.learnableCatalogService.listOccurrences(learnableId as never);

                            return {
                                occurrences: occurrences.slice(0, limit).map((occurrence) => ({
                                    id: occurrence.id,
                                    sourceSpanText: occurrence.sourceSpanText,
                                    sourceSentenceText: occurrence.sourceSentenceText,
                                    rationale: occurrence.rationale ?? null,
                                    createdAtIso: occurrence.createdAt.toISOString(),
                                })),
                            };
                        },
                    }),
            }),
            getProgressSnapshot: tool({
                description: "Fetch catalog totals and recent workspaces for this user.",
                inputSchema: z.object({
                    limit: z.number().int().positive().max(20).default(8),
                }),
                execute: async ({ limit }) =>
                    runTool({
                        context,
                        toolName: "getProgressSnapshot",
                        execute: async () => {
                            const [totalLearnables, topLearnables, recentWorkspaces] = await Promise.all([
                                context.services.learnableCatalogService.countLearnables({
                                    languageCode: context.languageCode,
                                    archived: false,
                                }),
                                context.services.learnableCatalogService.listLearnables({
                                    languageCode: context.languageCode,
                                    archived: false,
                                    limit,
                                    sort: "frequency",
                                }),
                                context.services.learnableCatalogService.listSentenceWorkspaces(context.userId, context.languageCode, {
                                    limit,
                                }),
                            ]);

                            return {
                                totalLearnables,
                                topLearnables: topLearnables.map((learnable) => toLearnableSummary(learnable)),
                                recentWorkspaces: recentWorkspaces.map((workspace) => ({
                                    id: workspace.id,
                                    sourceText: workspace.sourceText,
                                    summary: workspace.summary ?? null,
                                    createdAtIso: workspace.createdAt.toISOString(),
                                })),
                            };
                        },
                    }),
            }),
            searchThreadMemory: tool({
                description: "Search stored memory for the current thread.",
                inputSchema: z.object({
                    query: z.string().min(1),
                    limit: z.number().int().positive().max(10).default(5),
                }),
                execute: async ({ query, limit }) =>
                    runTool({
                        context,
                        toolName: "searchThreadMemory",
                        execute: async () => {
                            const embedding = await context.embedder.embed(query);
                            const matches = await context.repository.searchThreadMemory({
                                threadId: context.threadId,
                                embedding,
                                limit,
                            });

                            return {
                                matches: matches.filter((match) => match.confidence >= 0.55),
                            };
                        },
                    }),
            }),
        } satisfies ToolSet;
    }
}
