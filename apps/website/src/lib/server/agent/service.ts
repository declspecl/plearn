import { getAppConfig } from "../app-config";
import { createLearningMcpToolSet } from "./mcp";
import type { AgentRepository } from "./store";
import { type AgentThreadRecord } from "./store";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { Learnable } from "@plearn/core/learning/model";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import type { Services } from "@plearn/trpc/server";
import { generateObject, streamText } from "ai";
import { randomUUID } from "node:crypto";
import "server-only";
import { z } from "zod";

const titleSchema = z.object({
    title: z.string().min(3).max(60),
});

const summarySchema = z.object({
    summary: z.string().min(10).max(400),
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

function buildSystemPrompt(input: { thread: AgentThreadRecord; summary: string | null }) {
    return [
        "You are Plearn's Vietnamese learning assistant.",
        "You can call tools to fetch user-scoped learning data.",
        "Do not fabricate user data. Use tools when facts are needed.",
        "Mirror the user's language by default. If the user writes in English, answer in English unless they request Vietnamese.",
        "For greetings or casual small-talk, reply briefly and do not use tools.",
        "Do not claim you are fetching, checking, or reviewing user progress unless a progress/data tool was actually called in this turn.",
        "Only call progress/data tools when the user explicitly asks for progress, stats, history, or account data.",
        "Never output pseudo-code, fake tool calls, or placeholder function names.",
        "Do not list internal tool names, function names, or implementation details unless the user explicitly asks for technical internals.",
        "If the user asks what you can do, answer in user-facing capability language rather than naming tools.",
        "Do not claim an MCP interface is available to the user unless the product actually exposes one in the UI.",
        "When you provide factual catalog/progress claims, ground them in tool output.",
        "Keep answers concise and practical for daily Vietnamese learning.",
        "Prioritize Southern Vietnamese usage and natural phrasing.",
        `Thread language code: ${input.thread.languageCode}`,
        input.summary ? `Thread summary: ${input.summary}` : "Thread summary: none yet.",
    ].join("\n");
}

function toChatHistory(messages: readonly { role: "system" | "user" | "assistant" | "tool"; content: string }[]) {
    return messages
        .filter(
            (message): message is { role: "user" | "assistant"; content: string } =>
                message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({
            role: message.role,
            content: message.content,
        }));
}

function isGreetingOnly(message: string) {
    return /^(hi|hello|hey|yo|sup|good (morning|afternoon|evening)|howdy)\b[!.?]*$/i.test(message.trim());
}

function isProgressQuery(message: string) {
    return /(what have i learned recently|what did i learn recently|recent learning|recently learned|progress|stats|how am i doing|what have i been studying|show my stats|history)/i.test(
        message.trim(),
    );
}

function isDeveloperToolAuditRequest(
    message: string,
    recentMessages: readonly { role: "system" | "user" | "assistant" | "tool"; content: string }[],
) {
    const trimmed = message.trim();
    if (
        /(run (the )?(tool )?audit|probe tools|test (all |the )?tools|call each one|try calling each one|debug (all |the )?tools)/i.test(
            trimmed,
        )
    ) {
        return true;
    }

    if (!/^continue[.!?]*$/i.test(trimmed)) {
        return false;
    }

    return recentMessages.some((message) => /tool|debug|audit|mcp/i.test(message.content));
}

function toLearnableSummary(learnable: Learnable) {
    return {
        id: learnable.id,
        canonicalText: learnable.canonicalText,
        translation: learnable.translation,
        type: learnable.type,
        usageNotes: learnable.usageNotes,
        occurrenceCount: learnable.occurrenceCount,
        examples: learnable.examples.slice(0, 3).map((example) => ({
            text: example.exampleText,
            translation: example.translation,
        })),
    };
}

async function buildProgressSnapshot(input: { services: Services; userId: string; languageCode: string; limit: number }) {
    const [learnables, workspaces] = await Promise.all([
        input.services.learnableCatalogService.listLearnables({
            languageCode: input.languageCode,
            limit: 100,
            sort: "frequency",
        }),
        input.services.learnableCatalogService.listSentenceWorkspaces(input.userId, input.languageCode, { limit: input.limit }),
    ]);

    return {
        totalLearnables: learnables.length,
        topLearnables: learnables.slice(0, input.limit).map((item) => toLearnableSummary(item)),
        recentWorkspaces: workspaces.slice(0, input.limit).map((workspace) => ({
            id: workspace.id,
            sourceText: workspace.sourceText,
            summary: workspace.summary ?? null,
            createdAtIso: workspace.createdAt.toISOString(),
        })),
    };
}

async function maybeGenerateThreadTitle(input: {
    repository: AgentRepository;
    threadId: string;
    existingTitleLockedByUser: boolean;
    threadTitleStatus: "pending" | "ready" | "failed";
    userMessage: string;
    assistantMessage: string;
}) {
    if (input.existingTitleLockedByUser || input.threadTitleStatus === "ready") {
        return;
    }

    try {
        const result = await generateObject({
            model: getAnalysisModel(),
            schema: titleSchema,
            prompt: [
                "Generate a short conversation title for this Vietnamese learning thread.",
                "Constraints:",
                "- 3 to 60 characters",
                "- sentence case",
                "- no surrounding quotes",
                "- summarize user intent, not the answer detail",
                `User message: ${input.userMessage}`,
                `Assistant message: ${input.assistantMessage}`,
            ].join("\n"),
        });

        await input.repository.updateThreadTitle(input.threadId, result.object.title.trim());
    } catch {
        await input.repository.markThreadTitleFailed(input.threadId);
    }
}

async function maybeGenerateThreadSummary(input: {
    repository: AgentRepository;
    threadId: string;
    transcript: readonly { role: "user" | "assistant"; content: string }[];
    embedText: (text: string) => Promise<number[]>;
    sourceMessageIds: readonly string[];
}) {
    try {
        const transcriptText = input.transcript.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n\n");
        const result = await generateObject({
            model: getAnalysisModel(),
            schema: summarySchema,
            prompt: [
                "Summarize this Vietnamese-learning conversation for future context.",
                "Include user goals, key language points, and unresolved follow-ups.",
                "Be factual and concise.",
                transcriptText,
            ].join("\n\n"),
        });

        await input.repository.upsertRollingSummary(input.threadId, result.object.summary, {
            embedding: await input.embedText(result.object.summary),
            embeddingSourceText: result.object.summary,
            sourceMessageIds: input.sourceMessageIds,
        });
    } catch {
        await input.repository.markThreadSummaryFailed(input.threadId);
    }
}

function buildAssistantParts(input: {
    text: string;
    toolCalls: readonly { toolCallId: string; toolName: string; input: unknown }[];
    toolResults: readonly { toolCallId: string; toolName: string; output: unknown }[];
}) {
    const parts: unknown[] = [];
    for (const toolCall of input.toolCalls) {
        parts.push({
            type: "tool-call",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input,
        });
    }
    for (const toolResult of input.toolResults) {
        parts.push({
            type: "tool-result",
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
            output: toolResult.output,
        });
    }
    if (input.text.trim()) {
        parts.push({ type: "text", text: input.text });
    }
    return parts;
}

function summarizeForProbe(value: unknown): string {
    const text = JSON.stringify(value, null, 2);
    return text.length > 800 ? `${text.slice(0, 800)}\n...truncated...` : text;
}

function summarizeAuditResult(toolName: string, value: unknown): string {
    if (!value || typeof value !== "object") {
        return summarizeForProbe(value);
    }

    const record = value as Record<string, unknown>;
    switch (toolName) {
        case "search_learnables": {
            const matches = Array.isArray(record.matches) ? record.matches : [];
            const first = matches[0] as { learnable?: { canonicalText?: string; translation?: string }; confidence?: number } | undefined;
            return matches.length === 0
                ? "0 matches"
                : `${matches.length} matches; top=${first?.learnable?.canonicalText ?? "unknown"} (${first?.learnable?.translation ?? "no translation"}) @ ${typeof first?.confidence === "number" ? first.confidence.toFixed(2) : "n/a"}`;
        }
        case "lookup_learnable": {
            const found = record.found as { canonicalText?: string; translation?: string } | null | undefined;
            return found
                ? `found ${found.canonicalText ?? "item"} (${found.translation ?? "no translation"})`
                : "no exact or fallback match";
        }
        case "get_learnable_details": {
            const occurrences = Array.isArray(record.occurrences) ? record.occurrences.length : 0;
            const related = Array.isArray(record.related) ? record.related.length : 0;
            return record.learnable ? `${occurrences} occurrences; ${related} related links` : "learnable not found";
        }
        case "list_recent_workspaces": {
            const workspaces = Array.isArray(record.workspaces) ? record.workspaces : [];
            const first = workspaces[0] as { sourceTextPreview?: string } | undefined;
            return workspaces.length === 0
                ? "0 workspaces"
                : `${workspaces.length} workspaces; latest=${first?.sourceTextPreview ?? "available"}`;
        }
        case "get_workspace": {
            const workspace = record.workspace as { items?: unknown[]; sourceTextPreview?: string } | null | undefined;
            return workspace
                ? `${Array.isArray(workspace.items) ? workspace.items.length : 0} items; ${workspace.sourceTextPreview ?? "workspace loaded"}`
                : "workspace not found";
        }
        case "annotate_text": {
            const matches = Array.isArray(record.matches) ? record.matches : [];
            return `${matches.length} annotated matches`;
        }
        case "search_occurrences": {
            const occurrences = Array.isArray(record.occurrences) ? record.occurrences : [];
            return `${occurrences.length} saved occurrences`;
        }
        case "get_progress_snapshot": {
            return `${typeof record.totalLearnables === "number" ? record.totalLearnables : "unknown"} learnables; ${Array.isArray(record.recentWorkspaces) ? record.recentWorkspaces.length : 0} recent workspaces`;
        }
        case "search_thread_memory": {
            const matches = Array.isArray(record.matches) ? record.matches : [];
            return matches.length === 0 ? "0 matches in thread memory" : `${matches.length} memory matches`;
        }
        default: {
            return summarizeForProbe(value);
        }
    }
}

interface StreamEventToolPart {
    readonly toolCallId: string;
    readonly toolName: string;
    readonly input?: unknown;
    readonly output?: unknown;
}

function createNdjsonStream(execute: (send: (event: Record<string, unknown>) => void) => Promise<void>): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            };

            void execute(send)
                .catch((error) => {
                    send({
                        type: "error",
                        message: error instanceof Error ? error.message : "Streaming failed.",
                    });
                })
                .finally(() => {
                    controller.close();
                });
        },
    });

    return new Response(stream, {
        headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-cache, no-transform",
        },
    });
}

function toPersistableToolCalls(toolCalls: readonly StreamEventToolPart[]) {
    return toolCalls.map((item) => ({
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        input: item.input,
    }));
}

function toPersistableToolResults(toolResults: readonly StreamEventToolPart[]) {
    return toolResults.map((item) => ({
        toolCallId: item.toolCallId,
        toolName: item.toolName,
        output: item.output,
    }));
}

function getDeveloperToolProbeRequest(
    message: string,
    recentMessages: readonly { role: "system" | "user" | "assistant" | "tool"; content: string }[],
) {
    const debugContext = recentMessages.some((item) => /tool|debug|developer|mcp/i.test(item.content));
    if (!debugContext) {
        return null;
    }

    const trimmed = message.trim();
    if (/annotate/i.test(trimmed)) {
        const quoted = trimmed.match(/["“](.+?)["”]/)?.[1];
        return {
            toolName: "annotate_text",
            args: { text: quoted ?? "xin chao ban" },
            intro: `Running annotation on: ${JSON.stringify(quoted ?? "xin chao ban")}`,
        } as const;
    }
    if (/\bsearch\b/i.test(trimmed)) {
        const quoted = trimmed.match(/["“](.+?)["”]/)?.[1];
        return {
            toolName: "search_learnables",
            args: { query: quoted ?? "meeting someone", limit: 5 },
            intro: `Running semantic search for: ${JSON.stringify(quoted ?? "meeting someone")}`,
        } as const;
    }
    if (/lookup/i.test(trimmed)) {
        const quoted = trimmed.match(/["“](.+?)["”]/)?.[1];
        return {
            toolName: "lookup_learnable",
            args: { text: quoted ?? "gặp" },
            intro: `Looking up: ${JSON.stringify(quoted ?? "gặp")}`,
        } as const;
    }
    if (/progress|stats|recent/i.test(trimmed)) {
        return {
            toolName: "get_progress_snapshot",
            args: { limit: 5 },
            intro: "Fetching a progress snapshot.",
        } as const;
    }

    return null;
}

function getLastAssistantProbeContext(recentMessages: readonly { role: "system" | "user" | "assistant" | "tool"; content: string }[]) {
    const assistantMessages = [...recentMessages].reverse().filter((item) => item.role === "assistant");
    for (const message of assistantMessages) {
        const quoted = message.content.match(/"(.+?)"/)?.[1];
        if (/Running annotation on:/i.test(message.content)) {
            return {
                kind: "annotate" as const,
                previousText: quoted ?? null,
            };
        }
        if (/Running semantic search for:/i.test(message.content)) {
            return {
                kind: "search" as const,
                previousText: quoted ?? null,
            };
        }
    }

    return null;
}

function chooseAlternateAnnotationText(previousText?: string | null) {
    const samples = ["minh an roi ma", "toi gap ban o quan ca phe", "de co the noi chuyen voi ban"];
    return samples.find((sample) => sample !== previousText) ?? samples[0]!;
}

function getDirectToolRequest(
    message: string,
    recentMessages: readonly { role: "system" | "user" | "assistant" | "tool"; content: string }[],
) {
    const trimmed = message.trim();
    const quoted = trimmed.match(/["“](.+?)["”]/)?.[1];
    const debugContext = recentMessages.some((item) => /tool|debug|developer|mcp/i.test(item.content));
    const lastProbeContext = getLastAssistantProbeContext(recentMessages);

    if (/annotate/i.test(trimmed)) {
        return {
            toolName: "annotate_text",
            args: { text: quoted ?? "minh an roi ma" },
            intro: `Annotating: ${JSON.stringify(quoted ?? "minh an roi ma")}`,
        } as const;
    }

    if (/(others?|another|more|different one|something else|try another)/i.test(trimmed) && lastProbeContext?.kind === "annotate") {
        const nextText = chooseAlternateAnnotationText(lastProbeContext.previousText);
        return {
            toolName: "annotate_text",
            args: { text: nextText },
            intro: `Annotating another example: ${JSON.stringify(nextText)}`,
        } as const;
    }

    if (/(others?|another|more|different one|something else|try another)/i.test(trimmed) && lastProbeContext?.kind === "search") {
        const nextQuery = lastProbeContext.previousText === "meeting someone" ? "family conversation" : "meeting someone";
        return {
            toolName: "search_learnables",
            args: { query: nextQuery, limit: 5 },
            intro: `Running another semantic search for: ${JSON.stringify(nextQuery)}`,
        } as const;
    }

    if (debugContext && /(call some tools|use some tools|try some tools|call a tool|run a tool)/i.test(trimmed)) {
        return {
            toolName: "search_learnables",
            args: { query: "meeting someone", limit: 5 },
            intro: "Running a sample tool call.",
        } as const;
    }

    return null;
}

function buildToolDrivenReply(toolName: string, output: unknown) {
    if (!output || typeof output !== "object") {
        return summarizeForProbe(output);
    }

    const record = output as Record<string, unknown>;

    switch (toolName) {
        case "annotate_text": {
            const matches = Array.isArray(record.matches) ? record.matches : [];
            if (matches.length === 0) {
                return "I didn't find any strong matches for that text in your saved learnables yet.";
            }

            const lines = matches.slice(0, 6).map((item) => {
                const match = item as { canonicalText?: string; translation?: string; type?: string };
                return `- ${match.canonicalText ?? "Unknown"}${match.translation ? ` — ${match.translation}` : ""}${match.type ? ` (${match.type})` : ""}`;
            });

            return [`I found ${matches.length} matching learned item${matches.length === 1 ? "" : "s"}:`, ...lines].join("\n");
        }
        case "search_learnables": {
            const matches = Array.isArray(record.matches) ? record.matches : [];
            if (matches.length === 0) {
                return "That search did not return any matching learnables.";
            }
            const lines = matches.slice(0, 5).map((item) => {
                const match = item as { confidence?: number; learnable?: { canonicalText?: string; translation?: string } };
                return `- ${match.learnable?.canonicalText ?? "Unknown"}${match.learnable?.translation ? ` — ${match.learnable.translation}` : ""}${typeof match.confidence === "number" ? ` (${match.confidence.toFixed(2)})` : ""}`;
            });
            return ["Here are a few matching learnables:", ...lines].join("\n");
        }
        case "lookup_learnable": {
            const found = record.found as { canonicalText?: string; translation?: string; usageNotes?: string } | null | undefined;
            if (!found) {
                return "I couldn't find an exact saved learnable for that text.";
            }
            return [
                `${found.canonicalText ?? "That item"}${found.translation ? ` means ${found.translation}` : ""}.`,
                found.usageNotes ?? "",
            ]
                .filter(Boolean)
                .join("\n");
        }
        case "get_progress_snapshot": {
            const topLearnables = Array.isArray(record.topLearnables) ? record.topLearnables : [];
            const recentWorkspaces = Array.isArray(record.recentWorkspaces) ? record.recentWorkspaces : [];
            const topLines = topLearnables.slice(0, 4).map((item) => {
                const learnable = item as { canonicalText?: string; translation?: string; occurrenceCount?: number };
                return `- ${learnable.canonicalText ?? "Unknown"}${learnable.translation ? ` — ${learnable.translation}` : ""}${typeof learnable.occurrenceCount === "number" ? ` (${learnable.occurrenceCount}x)` : ""}`;
            });
            return [
                `You have ${typeof record.totalLearnables === "number" ? record.totalLearnables : "some"} saved learnables.`,
                topLines.length > 0 ? "Top recent items:" : "",
                ...topLines,
                recentWorkspaces.length > 0 ? `Recent study sessions: ${recentWorkspaces.length}` : "",
            ]
                .filter(Boolean)
                .join("\n");
        }
        default: {
            return summarizeForProbe(output);
        }
    }
}

export class LearningAgentService {
    public constructor(
        private readonly repository: AgentRepository,
        private readonly services: Services,
        private readonly embedder: LearningEmbedder,
    ) {}

    public async createThread(userId: string, languageCode = "vi") {
        return this.repository.createThread({
            id: randomUUID(),
            createdByUserId: userId,
            languageCode,
        });
    }

    public listThreads(userId: string) {
        return this.repository.listThreads(userId);
    }

    public getThreadWithMessages(userId: string, threadId: string) {
        return this.repository.getThreadWithMessages(userId, threadId);
    }

    public async renameThread(userId: string, threadId: string, title: string) {
        const thread = await this.repository.getThread(userId, threadId);
        if (!thread || thread.status !== "active") {
            throw new Error("Thread not found");
        }
        await this.repository.updateThreadTitleByUser(threadId, title);
    }

    public async deleteThread(userId: string, threadId: string) {
        const thread = await this.repository.getThread(userId, threadId);
        if (!thread || thread.status !== "active") {
            throw new Error("Thread not found");
        }
        await this.repository.deleteThread(threadId);
    }

    public async runTurn(input: { userId: string; threadId: string; message: string }): Promise<Response> {
        const thread = await this.repository.getThread(input.userId, input.threadId);
        if (!thread || thread.status !== "active") {
            return new Response("Thread not found", { status: 404 });
        }

        const userMessage = await this.repository.createMessage({
            id: randomUUID(),
            threadId: thread.id,
            role: "user",
            content: input.message,
        });

        const threadSummary = await this.repository.getRollingSummary(thread.id);
        const recentMessages = await this.repository.listRecentMessages(thread.id, 12);
        const timeoutMs = getAppConfig().LEARNING_ANALYSIS_TIMEOUT_MS;
        const trimmedMessage = input.message.trim();
        const greetingOnly = isGreetingOnly(trimmedMessage);
        const progressQuery = isProgressQuery(trimmedMessage);
        const progressSnapshot = progressQuery
            ? await buildProgressSnapshot({
                  services: this.services,
                  userId: input.userId,
                  languageCode: thread.languageCode,
                  limit: 8,
              })
            : null;
        const mcp = await createLearningMcpToolSet({
            services: this.services,
            repository: this.repository,
            userId: input.userId,
            threadId: thread.id,
            languageCode: thread.languageCode,
            embedText: (text) => this.embedder.embed(text),
        });
        let mcpClosed = false;
        const closeMcp = async () => {
            if (mcpClosed) {
                return;
            }
            mcpClosed = true;
            await mcp.close();
        };
        const directDeveloperProbe = getDeveloperToolProbeRequest(trimmedMessage, recentMessages);
        const directToolRequest = getDirectToolRequest(trimmedMessage, recentMessages);

        if (isDeveloperToolAuditRequest(trimmedMessage, recentMessages)) {
            const startedAt = new Date();
            return createNdjsonStream(async (send) => {
                await this.repository.createRun({
                    id: randomUUID(),
                    threadId: thread.id,
                    triggerMessageId: userMessage.id,
                    status: "running",
                    startedAt,
                });
                const toolCalls: StreamEventToolPart[] = [];
                const toolResults: StreamEventToolPart[] = [];

                const runProbe = async <TResult>(toolName: string, args: Record<string, unknown>) => {
                    const toolCallId = randomUUID();
                    const toolCall = { toolCallId, toolName, input: args } satisfies StreamEventToolPart;
                    toolCalls.push(toolCall);
                    send({ type: "tool-call", ...toolCall });
                    const output = (await mcp.callTool(toolName, args)) as TResult;
                    const toolResult = { toolCallId, toolName, output } satisfies StreamEventToolPart;
                    toolResults.push(toolResult);
                    send({ type: "tool-result", ...toolResult });
                    return output;
                };

                const availableTools = await mcp.listTools();
                const searchResult = (await runProbe<{ matches?: Array<{ learnable?: { id?: string; canonicalText?: string } }> }>(
                    "search_learnables",
                    {
                        query: "meeting someone",
                        limit: 3,
                    },
                )) ?? { matches: [] };
                const firstLearnable = searchResult.matches?.[0]?.learnable;
                const lookupText = typeof firstLearnable?.canonicalText === "string" ? firstLearnable.canonicalText : "xin chao";
                const lookupResult = (await runProbe<{ found?: { id?: string } | null }>("lookup_learnable", { text: lookupText })) ?? {
                    found: null,
                };
                const learnableId =
                    typeof lookupResult.found?.id === "string"
                        ? lookupResult.found.id
                        : typeof firstLearnable?.id === "string"
                          ? firstLearnable.id
                          : null;
                const workspacesResult = (await runProbe<{ workspaces?: Array<{ id?: string }> }>("list_recent_workspaces", {
                    limit: 3,
                })) ?? { workspaces: [] };
                const workspaceId = typeof workspacesResult.workspaces?.[0]?.id === "string" ? workspacesResult.workspaces[0].id : null;

                if (learnableId) {
                    await runProbe("get_learnable_details", { learnableId });
                    await runProbe("search_occurrences", { learnableId, limit: 3 });
                }

                if (workspaceId) {
                    await runProbe("get_workspace", { workspaceId });
                }

                await runProbe("annotate_text", { text: "xin chao ban" });
                await runProbe("get_progress_snapshot", { limit: 3 });
                await runProbe("search_thread_memory", { query: "developer debugging tools", limit: 3 });

                const assistantText = [
                    "Ran a developer MCP tool audit.",
                    `Available tools: ${availableTools.map((tool) => tool.name).join(", ")}`,
                    ...toolResults.map((result) => `- ${result.toolName}: ok - ${summarizeAuditResult(result.toolName, result.output)}`),
                ].join("\n");

                send({ type: "text-delta", text: assistantText });

                const assistantMessageId = randomUUID();
                await this.repository.createMessage({
                    id: assistantMessageId,
                    threadId: thread.id,
                    role: "assistant",
                    partsJson: buildAssistantParts({
                        text: assistantText,
                        toolCalls: toPersistableToolCalls(toolCalls),
                        toolResults: toPersistableToolResults(toolResults),
                    }),
                    modelProvider: "system",
                    modelId: "developer-tool-audit",
                    finishReason: "stop",
                    toolCallsJson: toPersistableToolCalls(toolCalls),
                    toolResultsJson: toPersistableToolResults(toolResults),
                });

                const transcript = await this.repository.listRecentMessages(thread.id, 20);
                await Promise.all([
                    maybeGenerateThreadSummary({
                        repository: this.repository,
                        threadId: thread.id,
                        transcript: toChatHistory(transcript),
                        embedText: (text) => this.embedder.embed(text),
                        sourceMessageIds: transcript.map((message) => message.id),
                    }),
                    this.repository.addMemoryEntry({
                        threadId: thread.id,
                        memoryKind: "fact",
                        content: `Developer tool audit:\n${assistantText}`,
                        embedding: await this.embedder.embed(`Developer tool audit:\n${assistantText}`),
                        embeddingSourceText: `Developer tool audit:\n${assistantText}`,
                        sourceMessageIds: [userMessage.id, assistantMessageId],
                    }),
                    this.repository.completeRunForThread(thread.id, {
                        startedAt,
                        completedAt: new Date(),
                        status: "completed",
                    }),
                ]);

                await closeMcp();
                send({ type: "done" });
            });
        }

        const requestedProbe = directDeveloperProbe ?? directToolRequest;
        if (requestedProbe) {
            const startedAt = new Date();
            return createNdjsonStream(async (send) => {
                await this.repository.createRun({
                    id: randomUUID(),
                    threadId: thread.id,
                    triggerMessageId: userMessage.id,
                    status: "running",
                    startedAt,
                });

                const toolCallId = randomUUID();
                const toolCall = {
                    toolCallId,
                    toolName: requestedProbe.toolName,
                    input: requestedProbe.args,
                } satisfies StreamEventToolPart;
                send({ type: "tool-call", ...toolCall });
                send({ type: "text-delta", text: `${requestedProbe.intro}\n\n` });

                const output = await mcp.callTool(requestedProbe.toolName, requestedProbe.args);
                const toolResult = {
                    toolCallId,
                    toolName: requestedProbe.toolName,
                    output,
                } satisfies StreamEventToolPart;
                send({ type: "tool-result", ...toolResult });

                const assistantText = [requestedProbe.intro, "", buildToolDrivenReply(requestedProbe.toolName, output)].join("\n");
                send({ type: "text-delta", text: buildToolDrivenReply(requestedProbe.toolName, output) });

                const assistantMessageId = randomUUID();
                await this.repository.createMessage({
                    id: assistantMessageId,
                    threadId: thread.id,
                    role: "assistant",
                    partsJson: buildAssistantParts({
                        text: assistantText,
                        toolCalls: toPersistableToolCalls([toolCall]),
                        toolResults: toPersistableToolResults([toolResult]),
                    }),
                    modelProvider: "system",
                    modelId: directDeveloperProbe ? "developer-tool-probe" : "direct-tool-probe",
                    finishReason: "stop",
                    toolCallsJson: toPersistableToolCalls([toolCall]),
                    toolResultsJson: toPersistableToolResults([toolResult]),
                });

                await this.repository.completeRunForThread(thread.id, {
                    startedAt,
                    completedAt: new Date(),
                    status: "completed",
                });

                await closeMcp();
                send({ type: "done" });
            });
        }

        let assistantTextBuffer = "";
        const startTime = new Date();

        const result = streamText({
            model: getAnalysisModel(),
            system: [
                buildSystemPrompt({ thread, summary: threadSummary }),
                progressSnapshot
                    ? `Progress snapshot for this turn: ${JSON.stringify(progressSnapshot)}. Use it directly and do not say you still need to check.`
                    : null,
            ]
                .filter(Boolean)
                .join("\n\n"),
            messages: toChatHistory(recentMessages),
            maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
            tools: mcp.tools,
            toolChoice: greetingOnly || progressQuery ? "none" : "auto",
            onFinish: async ({ response, usage, finishReason, toolCalls, toolResults }) => {
                const finalAssistantText =
                    assistantTextBuffer.trim() ||
                    (toolResults.length > 0
                        ? buildToolDrivenReply(toolResults[toolResults.length - 1]!.toolName, toolResults[toolResults.length - 1]!.output)
                        : "I checked your data, but the response was interrupted before I could finish writing it.");

                const assistantMessageId = randomUUID();
                await this.repository.createMessage({
                    id: assistantMessageId,
                    threadId: thread.id,
                    role: "assistant",
                    partsJson: buildAssistantParts({
                        text: finalAssistantText,
                        toolCalls: toolCalls.map((item) => ({ toolCallId: item.toolCallId, toolName: item.toolName, input: item.input })),
                        toolResults: toolResults.map((item) => ({
                            toolCallId: item.toolCallId,
                            toolName: item.toolName,
                            output: item.output,
                        })),
                    }),
                    modelProvider: getAppConfig().LEARNING_ANALYSIS_PROVIDER,
                    modelId: getAppConfig().LEARNING_ANALYSIS_MODEL,
                    finishReason,
                    tokenUsage: usage,
                    toolCallsJson: toolCalls,
                    toolResultsJson: toolResults,
                });

                const transcript = await this.repository.listRecentMessages(thread.id, 20);
                await Promise.all([
                    maybeGenerateThreadTitle({
                        repository: this.repository,
                        threadId: thread.id,
                        existingTitleLockedByUser: thread.titleLockedByUser,
                        threadTitleStatus: thread.titleStatus,
                        userMessage: userMessage.content,
                        assistantMessage: finalAssistantText,
                    }),
                    maybeGenerateThreadSummary({
                        repository: this.repository,
                        threadId: thread.id,
                        transcript: toChatHistory(transcript),
                        embedText: (text) => this.embedder.embed(text),
                        sourceMessageIds: transcript.map((message) => message.id),
                    }),
                    this.repository.addMemoryEntry({
                        threadId: thread.id,
                        memoryKind: "fact",
                        content: `User: ${userMessage.content}\nAssistant: ${finalAssistantText}`,
                        embedding: await this.embedder.embed(`User: ${userMessage.content}\nAssistant: ${finalAssistantText}`),
                        embeddingSourceText: `User: ${userMessage.content}\nAssistant: ${finalAssistantText}`,
                        sourceMessageIds: [userMessage.id, assistantMessageId],
                    }),
                ]);

                await this.repository.completeRunForThread(thread.id, {
                    startedAt: startTime,
                    completedAt: new Date(),
                    status: "completed",
                });

                await closeMcp();
                void response;
            },
            onError: async () => {
                await closeMcp();
            },
        });

        await this.repository.createRun({
            id: randomUUID(),
            threadId: thread.id,
            triggerMessageId: userMessage.id,
            status: "running",
            startedAt: startTime,
        });

        return createNdjsonStream(async (send) => {
            try {
                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case "text-delta": {
                            assistantTextBuffer += part.text;
                            send({ type: "text-delta", text: part.text });
                            break;
                        }
                        case "tool-call": {
                            const toolCall = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                input: part.input,
                            } satisfies StreamEventToolPart;
                            send({ type: "tool-call", ...toolCall });
                            break;
                        }
                        case "tool-result": {
                            const toolResult = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                output: part.output,
                            } satisfies StreamEventToolPart;
                            send({ type: "tool-result", ...toolResult });
                            break;
                        }
                        case "error": {
                            send({
                                type: "error",
                                message: part.error instanceof Error ? part.error.message : "Streaming failed.",
                            });
                            break;
                        }
                        case "finish": {
                            send({ type: "done", finishReason: part.finishReason });
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
            } finally {
                await closeMcp();
            }
        });
    }
}
