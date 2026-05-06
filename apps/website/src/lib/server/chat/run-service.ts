import type { ChatFailureCode, ChatMessagePart, ChatMessageStatus, ChatRunStatus, ChatUiStatus } from "@/lib/chat/types";
import { getAppConfig } from "@/lib/server/app-config";
import type { ChatRepository } from "@/lib/server/chat/persistence/repository";
import { toChatMessage } from "@/lib/server/chat/persistence/serializers";
import {
    ChatRuntimeError,
    combineSignals,
    getAnalysisModel,
    getRunTimeoutMs,
    logChatError,
    logChatInfo,
} from "@/lib/server/chat/runtime/helpers";
import { ChatMemoryService } from "@/lib/server/chat/runtime/memory-service";
import { buildSystemPrompt } from "@/lib/server/chat/runtime/prompting";
import { createNdjsonStream } from "@/lib/server/chat/runtime/streaming";
import { ChatTitleSummaryService } from "@/lib/server/chat/runtime/title-summary-service";
import { ChatToolService, isToolFailure } from "@/lib/server/chat/tools/tool-service";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import type { Services } from "@plearn/trpc/server";
import { stepCountIs, streamText } from "ai";
import "server-only";

interface ToolCallRecord {
    readonly toolCallId: string;
    readonly toolName: string;
    readonly input?: unknown;
}

interface ToolResultRecord {
    readonly toolCallId: string;
    readonly toolName: string;
    readonly output?: unknown;
}

interface RunTurnInput {
    readonly userId: string;
    readonly threadId: string;
    readonly message?: string;
    readonly retryMessageId?: string;
    readonly clientTurnId?: string;
    readonly requestSignal?: AbortSignal;
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

function buildAssistantParts(input: {
    text: string;
    toolCalls: readonly ToolCallRecord[];
    toolResults: readonly ToolResultRecord[];
    toolFailures: readonly ToolFailureRecord[];
}): readonly ChatMessagePart[] {
    const parts: ChatMessagePart[] = [];

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

    for (const toolFailure of input.toolFailures) {
        parts.push({
            type: "tool-error",
            toolCallId: toolFailure.toolCallId,
            toolName: toolFailure.toolName,
            errorCode: toolFailure.errorCode,
            errorMessage: toolFailure.errorMessage,
        });
    }

    if (input.text.trim()) {
        parts.push({ type: "text", text: input.text });
    }

    return parts;
}

function toPersistedToolCalls(toolCalls: readonly ToolCallRecord[]) {
    return toolCalls.map((toolCall) => ({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input,
    }));
}

function toPersistedToolResults(toolResults: readonly ToolResultRecord[], toolFailures: readonly ToolFailureRecord[]) {
    return [
        ...toolResults.map((toolResult) => ({
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
            output: toolResult.output,
        })),
        ...toolFailures.map((toolFailure) => ({
            toolCallId: toolFailure.toolCallId,
            toolName: toolFailure.toolName,
            errorCode: toolFailure.errorCode,
            errorMessage: toolFailure.errorMessage,
        })),
    ];
}

function normalizeFailure(error: unknown): {
    code: ChatFailureCode;
    message: string;
    runStatus: ChatRunStatus;
    messageStatus: ChatMessageStatus;
} {
    if (error instanceof ChatRuntimeError) {
        switch (error.failureCode) {
            case "client_cancelled": {
                return {
                    code: error.failureCode,
                    message: error.message,
                    runStatus: "cancelled",
                    messageStatus: "cancelled",
                };
            }
            case "timeout":
            case "tool_timeout":
            case "stale_run": {
                return {
                    code: error.failureCode === "tool_timeout" ? "timeout" : error.failureCode,
                    message: error.message,
                    runStatus: "timed_out",
                    messageStatus: "failed",
                };
            }
            default: {
                return {
                    code: error.failureCode,
                    message: error.message,
                    runStatus: "failed",
                    messageStatus: "failed",
                };
            }
        }
    }

    if (error instanceof Error && /abort|aborted/i.test(error.message)) {
        return {
            code: "client_cancelled",
            message: "Chat request was cancelled.",
            runStatus: "cancelled",
            messageStatus: "cancelled",
        };
    }

    return {
        code: "unknown",
        message: error instanceof Error ? error.message : "The assistant failed to finish this turn.",
        runStatus: "failed",
        messageStatus: "failed",
    };
}

interface ToolFailureRecord {
    readonly toolCallId: string;
    readonly toolName: string;
    readonly errorCode: ChatFailureCode;
    readonly errorMessage: string;
}

function labelForStatus(status: ChatUiStatus) {
    switch (status) {
        case "connecting": {
            return "Connecting";
        }
        case "thinking": {
            return "Thinking";
        }
        case "using_tools": {
            return "Using tools";
        }
        case "writing": {
            return "Writing";
        }
        case "retrying": {
            return "Retrying";
        }
        case "failed": {
            return "Failed";
        }
        case "timed_out": {
            return "Timed out";
        }
        case "cancelled": {
            return "Cancelled";
        }
        case "completed": {
            return "Completed";
        }
        default: {
            return "Idle";
        }
    }
}

export class ChatRunService {
    private readonly toolService = new ChatToolService();
    private readonly titleSummaryService: ChatTitleSummaryService;
    private readonly memoryService: ChatMemoryService;

    public constructor(
        private readonly repository: ChatRepository,
        private readonly services: Services,
        private readonly embedder: LearningEmbedder,
    ) {
        this.titleSummaryService = new ChatTitleSummaryService(repository, embedder);
        this.memoryService = new ChatMemoryService(repository, embedder);
    }

    public async runTurn(input: RunTurnInput): Promise<Response> {
        const thread = await this.repository.getThread(input.userId, input.threadId);
        if (!thread || thread.status !== "active") {
            return new Response("Thread not found", { status: 404 });
        }

        const activeRun = await this.repository.getActiveRun(thread.id);
        if (activeRun) {
            return Response.json(
                {
                    code: "run_in_progress",
                    message: "A chat turn is already running in this thread.",
                    runId: activeRun.id,
                },
                { status: 409 },
            );
        }

        if (input.clientTurnId) {
            const existingRun = await this.repository.findRunByClientTurnId(thread.id, input.clientTurnId);
            if (existingRun?.status === "running") {
                return Response.json(
                    {
                        code: "run_in_progress",
                        message: "This chat turn is already in progress.",
                        runId: existingRun.id,
                    },
                    { status: 409 },
                );
            }
        }

        let triggerMessageId: string | null = null;
        let sourceUserMessage: string | null = null;
        let retryOfMessageId: string | null = null;

        if (input.retryMessageId) {
            const retryTarget = await this.repository.findMessage(thread.id, input.retryMessageId);
            const retrySource = await this.repository.findRetrySource(thread.id, input.retryMessageId);
            if (!retryTarget || retryTarget.role !== "assistant" || !retrySource || retrySource.message.role !== "user") {
                return Response.json(
                    {
                        code: "invalid_retry",
                        message: "This failed turn cannot be retried.",
                    },
                    { status: 400 },
                );
            }

            triggerMessageId = retrySource.message.id;
            sourceUserMessage = retrySource.message.content;
            retryOfMessageId = retryTarget.id;
        } else {
            const content = input.message?.trim();
            if (!content) {
                return new Response("Invalid request payload", { status: 400 });
            }

            const userMessage = await this.repository.createMessage({
                threadId: thread.id,
                role: "user",
                status: "completed",
                content,
            });
            triggerMessageId = userMessage.id;
            sourceUserMessage = userMessage.content;
        }

        const assistantMessage = await this.repository.createMessage({
            threadId: thread.id,
            role: "assistant",
            status: "streaming",
            content: "",
            retryOfMessageId,
        });

        const run = await this.repository.createRun({
            threadId: thread.id,
            triggerMessageId,
            assistantMessageId: assistantMessage.id,
            clientTurnId: input.clientTurnId ?? null,
        });

        const threadSummary = await this.repository.getRollingSummary(thread.id);
        const recentMessages = await this.repository.listRecentMessages(thread.id, 12, {
            excludeMessageIds: [assistantMessage.id, retryOfMessageId].filter((id): id is string => Boolean(id)),
        });
        const recentUserMessages = recentMessages
            .filter((message): message is typeof message & { role: "user"; content: string } => message.role === "user")
            .map((message) => message.content);
        const promptRecentUserMessages =
            recentUserMessages.at(-1) === sourceUserMessage ? recentUserMessages.slice(0, -1) : recentUserMessages;
        const requestAbortSignal = combineSignals([input.requestSignal, AbortSignal.timeout(getRunTimeoutMs())]);

        const result = streamText({
            model: getAnalysisModel(),
            system: buildSystemPrompt({
                thread,
                summary: threadSummary,
                userMessage: sourceUserMessage ?? "",
                recentUserMessages: promptRecentUserMessages,
            }),
            messages: toChatHistory(recentMessages),
            maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: requestAbortSignal,
            stopWhen: stepCountIs(5),
            tools: this.toolService.createToolSet({
                services: this.services,
                repository: this.repository,
                embedder: this.embedder,
                userId: input.userId,
                threadId: thread.id,
                languageCode: thread.languageCode,
                signal: requestAbortSignal,
            }),
            toolChoice: isGreetingOnly(sourceUserMessage ?? "") ? "none" : "auto",
        });

        return createNdjsonStream(async (send) => {
            const toolCalls: ToolCallRecord[] = [];
            const toolResults: ToolResultRecord[] = [];
            const toolFailures: ToolFailureRecord[] = [];
            let assistantText = "";
            let usage: unknown = null;
            let finishReason = "unknown";
            let streamReachedFinish = false;
            let terminalSent = false;
            let lastStatus: ChatUiStatus = "idle";

            const emitStatus = (status: ChatUiStatus, message = labelForStatus(status)) => {
                if (lastStatus === status) {
                    return;
                }

                lastStatus = status;
                send({
                    type: "status",
                    runId: run.id,
                    threadId: thread.id,
                    assistantMessageId: assistantMessage.id,
                    status,
                    message,
                });
            };

            try {
                send({
                    type: "run-start",
                    runId: run.id,
                    threadId: thread.id,
                    assistantMessageId: assistantMessage.id,
                    retryOfMessageId,
                });
                send({
                    type: "assistant-message-created",
                    runId: run.id,
                    threadId: thread.id,
                    assistantMessage: toChatMessage(assistantMessage),
                });
                emitStatus(input.retryMessageId ? "retrying" : "connecting");
                emitStatus("thinking");

                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case "text-delta": {
                            assistantText += part.text;
                            emitStatus("writing");
                            send({
                                type: "text-delta",
                                runId: run.id,
                                threadId: thread.id,
                                assistantMessageId: assistantMessage.id,
                                text: part.text,
                            });
                            break;
                        }
                        case "tool-call": {
                            emitStatus("using_tools");
                            const toolCall = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                input: part.input,
                            } satisfies ToolCallRecord;
                            toolCalls.push(toolCall);
                            send({
                                type: "tool-call-start",
                                runId: run.id,
                                threadId: thread.id,
                                assistantMessageId: assistantMessage.id,
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                input: part.input,
                            });
                            break;
                        }
                        case "tool-result": {
                            if (isToolFailure(part.output)) {
                                const failure = {
                                    toolCallId: part.toolCallId,
                                    toolName: part.toolName,
                                    errorCode: part.output.errorCode,
                                    errorMessage: part.output.errorMessage,
                                } satisfies ToolFailureRecord;
                                toolFailures.push(failure);
                                send({
                                    type: "tool-call-fail",
                                    runId: run.id,
                                    threadId: thread.id,
                                    assistantMessageId: assistantMessage.id,
                                    toolCallId: part.toolCallId,
                                    toolName: part.toolName,
                                    errorCode: part.output.errorCode,
                                    errorMessage: part.output.errorMessage,
                                });
                            } else {
                                const toolResult = {
                                    toolCallId: part.toolCallId,
                                    toolName: part.toolName,
                                    output: part.output,
                                } satisfies ToolResultRecord;
                                toolResults.push(toolResult);
                                send({
                                    type: "tool-call-finish",
                                    runId: run.id,
                                    threadId: thread.id,
                                    assistantMessageId: assistantMessage.id,
                                    toolCallId: part.toolCallId,
                                    toolName: part.toolName,
                                    output: part.output,
                                });
                            }
                            break;
                        }
                        case "tool-error": {
                            const failure = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                errorCode: "tool_error",
                                errorMessage: part.error instanceof Error ? part.error.message : "Tool execution failed.",
                            } satisfies ToolFailureRecord;
                            toolFailures.push(failure);
                            send({
                                type: "tool-call-fail",
                                runId: run.id,
                                threadId: thread.id,
                                assistantMessageId: assistantMessage.id,
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                errorCode: failure.errorCode,
                                errorMessage: failure.errorMessage,
                            });
                            break;
                        }
                        case "finish": {
                            streamReachedFinish = true;
                            finishReason = part.finishReason;
                            usage = part.totalUsage;
                            break;
                        }
                        case "abort": {
                            throw new ChatRuntimeError("Chat request was cancelled.", "client_cancelled");
                        }
                        case "error": {
                            throw part.error;
                        }
                        default: {
                            break;
                        }
                    }
                }

                const [resolvedFinishReason, resolvedUsage] = await Promise.all([result.finishReason, result.usage]);
                finishReason = resolvedFinishReason ?? finishReason;
                usage = resolvedUsage ?? usage;

                if (!streamReachedFinish && !resolvedFinishReason) {
                    throw new ChatRuntimeError("The assistant response ended unexpectedly.", "unknown");
                }

                if (finishReason === "tool-calls") {
                    throw new ChatRuntimeError(
                        "The assistant stopped after requesting tool work and did not produce a final answer.",
                        "unknown",
                    );
                }

                const finalAssistantText =
                    assistantText.trim() || "I checked your request, but the response ended before a final answer was produced.";
                await this.repository.updateMessage(assistantMessage.id, {
                    status: "completed",
                    partsJson: buildAssistantParts({
                        text: finalAssistantText,
                        toolCalls,
                        toolResults,
                        toolFailures,
                    }),
                    modelProvider: getAppConfig().LEARNING_ANALYSIS_PROVIDER,
                    modelId: getAppConfig().LEARNING_ANALYSIS_MODEL,
                    finishReason,
                    tokenUsageJson: usage,
                    toolCallsJson: toPersistedToolCalls(toolCalls),
                    toolResultsJson: toPersistedToolResults(toolResults, toolFailures),
                    failureCode: null,
                    failureMessage: null,
                });
                await this.repository.finalizeRun(run.id, { status: "completed" });

                emitStatus("completed");
                send({
                    type: "done",
                    runId: run.id,
                    threadId: thread.id,
                    assistantMessageId: assistantMessage.id,
                    finalStatus: "completed",
                });
                terminalSent = true;

                const transcript = await this.repository.listRecentMessages(thread.id, 20);
                void this.titleSummaryService.finalizeCompletedTurn({
                    thread,
                    transcript: transcript
                        .filter((message): message is typeof message & { role: "user" | "assistant" } => {
                            return message.role === "user" || message.role === "assistant";
                        })
                        .map((message) => ({
                            id: message.id,
                            role: message.role,
                            content: message.content,
                        })),
                    assistantMessage: finalAssistantText,
                    userMessage: sourceUserMessage,
                });
                void this.memoryService.rememberTurn({
                    threadId: thread.id,
                    triggerMessageId,
                    assistantMessageId: assistantMessage.id,
                    userMessage: sourceUserMessage,
                    assistantMessage: finalAssistantText,
                });
            } catch (error) {
                const normalized = normalizeFailure(error);
                logChatError("run.failed", {
                    runId: run.id,
                    threadId: thread.id,
                    failureCode: normalized.code,
                    message: normalized.message,
                });

                const finalAssistantText = assistantText.trim();
                await this.repository.updateMessage(assistantMessage.id, {
                    status: normalized.messageStatus,
                    partsJson: buildAssistantParts({
                        text: finalAssistantText,
                        toolCalls,
                        toolResults,
                        toolFailures,
                    }),
                    modelProvider: getAppConfig().LEARNING_ANALYSIS_PROVIDER,
                    modelId: getAppConfig().LEARNING_ANALYSIS_MODEL,
                    finishReason: normalized.runStatus,
                    tokenUsageJson: usage,
                    toolCallsJson: toPersistedToolCalls(toolCalls),
                    toolResultsJson: toPersistedToolResults(toolResults, toolFailures),
                    failureCode: normalized.code,
                    failureMessage: normalized.message,
                });
                await this.repository.finalizeRun(run.id, {
                    status: normalized.runStatus,
                    errorMessage: normalized.message,
                });

                if (!terminalSent) {
                    emitStatus(
                        normalized.runStatus === "timed_out" ? "timed_out" : normalized.runStatus === "cancelled" ? "cancelled" : "failed",
                    );
                    send({
                        type: "error",
                        runId: run.id,
                        threadId: thread.id,
                        assistantMessageId: assistantMessage.id,
                        failureCode: normalized.code,
                        message: normalized.message,
                    });
                }
            } finally {
                logChatInfo("run.finished", {
                    runId: run.id,
                    threadId: thread.id,
                    lastStatus,
                });
            }
        });
    }
}
