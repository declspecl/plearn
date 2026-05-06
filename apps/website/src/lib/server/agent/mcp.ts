import type { AgentRepository } from "./store";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Learnable } from "@plearn/core/learning/model";
import type { Services } from "@plearn/trpc/server";
import { tool, type ToolSet } from "ai";
import "server-only";
import * as z from "zod/v3";

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

function toMcpContent(structuredContent: unknown) {
    return [
        {
            type: "text" as const,
            text: JSON.stringify(structuredContent, null, 2),
        },
    ];
}

function readStructuredResult(result: {
    structuredContent?: Record<string, unknown>;
    content?: readonly { type: string; text?: string }[];
    isError?: boolean;
    toolResult?: unknown;
}) {
    if ("toolResult" in result) {
        return result.toolResult;
    }

    if (result.structuredContent) {
        return result.structuredContent;
    }

    const text = result.content?.find((item) => item.type === "text" && typeof item.text === "string")?.text;
    if (!text) {
        return result;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return { text, isError: result.isError ?? false };
    }
}

export async function createLearningMcpToolSet(input: {
    services: Services;
    repository: AgentRepository;
    userId: string;
    threadId: string;
    languageCode: string;
    embedText: (text: string) => Promise<number[]>;
}) {
    const server = new McpServer({
        name: "plearn-learning-mcp",
        version: "1.0.0",
    });
    const registerTool = server.registerTool.bind(server) as any;

    registerTool(
        "search_learnables",
        {
            description: "Semantic search across Vietnamese learnables",
            inputSchema: {
                query: z.string().min(1),
                limit: z.number().int().positive().max(20).optional(),
            },
        },
        async (args: unknown) => {
            const { query, limit } = args as { query: string; limit?: number };
            const resolvedLimit = limit ?? 8;
            const matches = await input.services.semanticSearchService.search({
                languageCode: input.languageCode,
                query,
                limit: resolvedLimit,
            });
            const structuredContent = {
                matches: matches.map((match) => ({
                    confidence: match.confidence,
                    reason: match.reason,
                    learnable: toLearnableSummary(match.learnable),
                })),
            };

            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "lookup_learnable",
        {
            description: "Exact or alias lookup for one learnable",
            inputSchema: {
                text: z.string().min(1),
            },
        },
        async (args: unknown) => {
            const { text } = args as { text: string };
            const found =
                (await input.services.learnableCatalogService.lookupByText(input.languageCode, text)) ??
                (await input.services.semanticSearchService
                    .search({
                        languageCode: input.languageCode,
                        query: text,
                        limit: 1,
                    })
                    .then((matches) => (matches[0]?.confidence && matches[0].confidence >= 0.45 ? matches[0].learnable : null)));
            if (!found) {
                const structuredContent = { found: null };
                return { content: toMcpContent(structuredContent), structuredContent };
            }

            const [related, backlinks] = await Promise.all([
                input.services.learnableCatalogService.listRelatedLearnables(found.id),
                input.services.learnableCatalogService.listLearnableBacklinks(found.id),
            ]);
            const structuredContent = {
                found: toLearnableSummary(found),
                related,
                backlinks,
            };
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "get_learnable_details",
        {
            description: "Fetch full learnable details, occurrences, related learnables, and backlinks",
            inputSchema: {
                learnableId: z.string().min(1),
            },
        },
        async (args: unknown) => {
            const { learnableId } = args as { learnableId: string };
            const learnable = await input.services.learnableCatalogService.getLearnable(learnableId as Learnable["id"]);
            if (!learnable) {
                const structuredContent = { learnable: null };
                return { content: toMcpContent(structuredContent), structuredContent };
            }

            const [occurrences, related, backlinks] = await Promise.all([
                input.services.learnableCatalogService.listOccurrences(learnable.id),
                input.services.learnableCatalogService.listRelatedLearnables(learnable.id),
                input.services.learnableCatalogService.listLearnableBacklinks(learnable.id),
            ]);

            const structuredContent = {
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
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "list_recent_workspaces",
        {
            description: "Fetch recent sentence workspaces for the authenticated user",
            inputSchema: {
                limit: z.number().int().positive().max(20).optional(),
                query: z.string().optional(),
            },
        },
        async (args: unknown) => {
            const { limit, query } = args as { limit?: number; query?: string };
            const resolvedLimit = limit ?? 8;
            const workspaces = await input.services.learnableCatalogService.listSentenceWorkspaces(input.userId, input.languageCode, {
                limit: resolvedLimit,
                query,
            });
            const structuredContent = {
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
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "get_workspace",
        {
            description: "Fetch one sentence workspace including analysis items",
            inputSchema: {
                workspaceId: z.string().min(1),
            },
        },
        async (args: unknown) => {
            const { workspaceId } = args as { workspaceId: string };
            const workspace = await input.services.learnableCatalogService.getWorkspace(workspaceId as never);
            if (workspace && workspace.createdByUserId !== input.userId) {
                const structuredContent = { workspace: null };
                return {
                    content: toMcpContent(structuredContent),
                    structuredContent,
                    isError: true,
                };
            }
            const structuredContent = workspace
                ? {
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
                  }
                : { workspace: null };

            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "annotate_text",
        {
            description: "Annotate text with known learnables from the catalog",
            inputSchema: {
                text: z.string().min(1),
            },
        },
        async (args: unknown) => {
            const { text } = args as { text: string };
            const exactMatches = await input.services.learnableCatalogService.annotateText(input.languageCode, text);
            const learnables =
                exactMatches.length > 0
                    ? exactMatches
                    : await input.services.semanticSearchService
                          .search({
                              languageCode: input.languageCode,
                              query: text,
                              limit: 5,
                          })
                          .then((matches) => matches.filter((match) => match.confidence >= 0.35).map((match) => match.learnable));
            const structuredContent = {
                matches: learnables.map((learnable) => toLearnableSummary(learnable)),
            };
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "search_occurrences",
        {
            description: "Find saved sentence occurrences for a learnable",
            inputSchema: {
                learnableId: z.string().min(1),
                limit: z.number().int().positive().max(20).optional(),
            },
        },
        async (args: unknown) => {
            const { learnableId, limit } = args as { learnableId: string; limit?: number };
            const resolvedLimit = limit ?? 8;
            const occurrences = await input.services.learnableCatalogService.listOccurrences(learnableId as never);
            const structuredContent = {
                occurrences: occurrences.slice(0, resolvedLimit).map((occurrence) => ({
                    id: occurrence.id,
                    sourceSpanText: occurrence.sourceSpanText,
                    sourceSentenceText: occurrence.sourceSentenceText,
                    rationale: occurrence.rationale ?? null,
                    createdAtIso: occurrence.createdAt.toISOString(),
                })),
            };
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "get_progress_snapshot",
        {
            description: "Fetch the user's recent learning progress snapshot",
            inputSchema: {
                limit: z.number().int().positive().max(20).optional(),
            },
        },
        async (args: unknown) => {
            const { limit } = args as { limit?: number };
            const resolvedLimit = limit ?? 8;
            const [learnables, workspaces] = await Promise.all([
                input.services.learnableCatalogService.listLearnables({
                    languageCode: input.languageCode,
                    limit: 100,
                    sort: "frequency",
                }),
                input.services.learnableCatalogService.listSentenceWorkspaces(input.userId, input.languageCode, { limit: resolvedLimit }),
            ]);

            const structuredContent = {
                totalLearnables: learnables.length,
                topLearnables: learnables.slice(0, resolvedLimit).map((item) => toLearnableSummary(item)),
                recentWorkspaces: workspaces.slice(0, resolvedLimit).map((workspace) => ({
                    id: workspace.id,
                    sourceText: workspace.sourceText,
                    summary: workspace.summary ?? null,
                    createdAtIso: workspace.createdAt.toISOString(),
                })),
            };
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    registerTool(
        "search_thread_memory",
        {
            description: "Semantic search across this conversation thread's stored memory",
            inputSchema: {
                query: z.string().min(1),
                limit: z.number().int().positive().max(10).optional(),
            },
        },
        async (args: unknown) => {
            const { query, limit } = args as { query: string; limit?: number };
            const resolvedLimit = limit ?? 5;
            const embedding = await input.embedText(query);
            const results = await input.repository.searchThreadMemory({
                threadId: input.threadId,
                embedding,
                limit: resolvedLimit,
            });
            const structuredContent = {
                matches: results,
            };
            return {
                content: toMcpContent(structuredContent),
                structuredContent,
            };
        },
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client(
        {
            name: "plearn-agent-client",
            version: "1.0.0",
        },
        { capabilities: {} },
    );
    await client.connect(clientTransport);

    const tools = {
        searchLearnables: tool({
            description: "Search learnables semantically by user query",
            inputSchema: z.object({
                query: z.string().min(1),
                limit: z.number().int().positive().max(20).default(8),
            }),
            execute: async ({ query, limit }) => {
                const result = await client.callTool({ name: "search_learnables", arguments: { query, limit } });
                return readStructuredResult(result);
            },
        }),
        lookupLearnable: tool({
            description: "Look up a specific learnable exactly by text/alias",
            inputSchema: z.object({
                text: z.string().min(1),
            }),
            execute: async ({ text }) => {
                const result = await client.callTool({ name: "lookup_learnable", arguments: { text } });
                return readStructuredResult(result);
            },
        }),
        getLearnableDetails: tool({
            description: "Fetch full learnable details, examples, related items, and occurrences",
            inputSchema: z.object({
                learnableId: z.string().min(1),
            }),
            execute: async ({ learnableId }) => {
                const result = await client.callTool({ name: "get_learnable_details", arguments: { learnableId } });
                return readStructuredResult(result);
            },
        }),
        listRecentWorkspaces: tool({
            description: "Fetch recent learning workspaces for the current user",
            inputSchema: z.object({
                limit: z.number().int().positive().max(20).default(8),
                query: z.string().optional(),
            }),
            execute: async ({ limit, query }) => {
                const result = await client.callTool({ name: "list_recent_workspaces", arguments: { limit, query } });
                return readStructuredResult(result);
            },
        }),
        getWorkspace: tool({
            description: "Fetch one workspace and its analyzed items",
            inputSchema: z.object({
                workspaceId: z.string().min(1),
            }),
            execute: async ({ workspaceId }) => {
                const result = await client.callTool({ name: "get_workspace", arguments: { workspaceId } });
                return readStructuredResult(result);
            },
        }),
        annotateText: tool({
            description: "Annotate text with known learnables",
            inputSchema: z.object({
                text: z.string().min(1),
            }),
            execute: async ({ text }) => {
                const result = await client.callTool({ name: "annotate_text", arguments: { text } });
                return readStructuredResult(result);
            },
        }),
        searchOccurrences: tool({
            description: "Find saved sentence occurrences for a learnable",
            inputSchema: z.object({
                learnableId: z.string().min(1),
                limit: z.number().int().positive().max(20).default(8),
            }),
            execute: async ({ learnableId, limit }) => {
                const result = await client.callTool({ name: "search_occurrences", arguments: { learnableId, limit } });
                return readStructuredResult(result);
            },
        }),
        getProgressSnapshot: tool({
            description: "Fetch user progress overview and recent sentence workspaces",
            inputSchema: z.object({
                limit: z.number().int().positive().max(20).default(8),
            }),
            execute: async ({ limit }) => {
                const result = await client.callTool({ name: "get_progress_snapshot", arguments: { limit } });
                return readStructuredResult(result);
            },
        }),
        searchThreadMemory: tool({
            description: "Search the current thread's memory semantically",
            inputSchema: z.object({
                query: z.string().min(1),
                limit: z.number().int().positive().max(10).default(5),
            }),
            execute: async ({ query, limit }) => {
                const result = await client.callTool({ name: "search_thread_memory", arguments: { query, limit } });
                return readStructuredResult(result);
            },
        }),
    } satisfies ToolSet;

    return {
        tools,
        listTools: async () => {
            const result = await client.listTools();
            return result.tools.map((tool) => ({
                name: tool.name,
                description: tool.description ?? "",
            }));
        },
        callTool: async (name: string, args: Record<string, unknown>) => {
            const result = await client.callTool({ name, arguments: args });
            return readStructuredResult(result);
        },
        close: async () => {
            await client.close();
            await server.close();
        },
    };
}
