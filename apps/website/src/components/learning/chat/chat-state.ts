import type { ActiveChatRun, ChatControllerState } from "./chat-types";
import type { ChatMessage, ChatStreamEvent, ChatThreadDetail, ChatThreadSummary } from "@/lib/chat/types";

type ChatEvent =
    | { readonly type: "LOAD_STARTED" }
    | { readonly type: "THREADS_LOADED"; readonly threads: readonly ChatThreadSummary[]; readonly activeThreadId: string | null }
    | { readonly type: "THREAD_DETAIL_LOADED"; readonly detail: ChatThreadDetail }
    | { readonly type: "THREAD_CREATED"; readonly thread: ChatThreadSummary }
    | { readonly type: "THREAD_SELECTED"; readonly threadId: string }
    | { readonly type: "DRAFT_CHANGED"; readonly value: string }
    | { readonly type: "SUBMIT_REQUESTED"; readonly draft: string; readonly retryMessageId: string | null; readonly threadId: string }
    | { readonly type: "RUN_EVENT_RECEIVED"; readonly event: ChatStreamEvent }
    | { readonly type: "RUN_FAILED"; readonly message: string; readonly restoreDraft?: boolean }
    | { readonly type: "RUN_COMPLETED" }
    | { readonly type: "THREAD_RENAMED"; readonly threadId: string; readonly title: string }
    | { readonly type: "THREAD_DELETED"; readonly threadId: string }
    | { readonly type: "MUTATION_ERROR"; readonly message?: string }
    | { readonly type: "CLEAR_MUTATION_ERROR" };

export const initialChatState: ChatControllerState = {
    status: "loading",
    draft: "",
    lastRecoverableDraft: "",
    threads: [],
    activeThreadId: null,
    messagesByThreadId: {},
    activeRun: null,
    retryTargetMessageId: null,
};

function updateThreadInList(threads: readonly ChatThreadSummary[], thread: ChatThreadSummary) {
    const filtered = threads.filter((item) => item.id !== thread.id);

    return [thread, ...filtered];
}

function appendMessage(messages: readonly ChatMessage[], message: ChatMessage) {
    return [...messages.filter((item) => item.id !== message.id), message];
}

function mapMessage(messages: readonly ChatMessage[], messageId: string, mutate: (message: ChatMessage) => ChatMessage) {
    return messages.map((message) => (message.id === messageId ? mutate(message) : message));
}

function buildOptimisticUserMessage(draft: string): ChatMessage {
    const now = new Date().toISOString();

    return {
        id: `temp-user-${Date.now()}`,
        role: "user",
        status: "completed",
        content: draft,
        parts: [{ type: "text", text: draft }],
        failureCode: null,
        failureMessage: null,
        retryOfMessageId: null,
        createdAt: now,
        updatedAt: now,
    };
}

function applyRunEvent(state: ChatControllerState, event: ChatStreamEvent): ChatControllerState {
    switch (event.type) {
        case "run-start": {
            const activeRun: ActiveChatRun = {
                runId: event.runId,
                threadId: event.threadId,
                assistantMessageId: event.assistantMessageId,
                status: state.retryTargetMessageId ? "retrying" : "connecting",
                retryOfMessageId: event.retryOfMessageId,
            };

            return {
                ...state,
                status: "streaming",
                activeRun,
            };
        }
        case "assistant-message-created": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: appendMessage(existing, event.assistantMessage),
                },
            };
        }
        case "status": {
            return state.activeRun && state.activeRun.runId === event.runId
                ? {
                      ...state,
                      activeRun: {
                          ...state.activeRun,
                          status: event.status,
                      },
                  }
                : state;
        }
        case "text-delta": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "streaming",
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: mapMessage(existing, event.assistantMessageId, (message) => ({
                        ...message,
                        content: message.content + event.text,
                        parts: [
                            ...message.parts.filter((part) => part.type !== "text"),
                            { type: "text", text: message.content + event.text },
                        ],
                        updatedAt: new Date().toISOString(),
                    })),
                },
            };
        }
        case "tool-call-start": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: mapMessage(existing, event.assistantMessageId, (message) => ({
                        ...message,
                        parts: [
                            ...message.parts,
                            {
                                type: "tool-call",
                                toolCallId: event.toolCallId,
                                toolName: event.toolName,
                                input: event.input,
                            },
                        ],
                        updatedAt: new Date().toISOString(),
                    })),
                },
            };
        }
        case "tool-call-finish": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: mapMessage(existing, event.assistantMessageId, (message) => ({
                        ...message,
                        parts: [
                            ...message.parts,
                            {
                                type: "tool-result",
                                toolCallId: event.toolCallId,
                                toolName: event.toolName,
                                output: event.output,
                            },
                        ],
                        updatedAt: new Date().toISOString(),
                    })),
                },
            };
        }
        case "tool-call-fail": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: mapMessage(existing, event.assistantMessageId, (message) => ({
                        ...message,
                        parts: [
                            ...message.parts,
                            {
                                type: "tool-error",
                                toolCallId: event.toolCallId,
                                toolName: event.toolName,
                                errorCode: event.errorCode,
                                errorMessage: event.errorMessage,
                            },
                        ],
                        updatedAt: new Date().toISOString(),
                    })),
                },
            };
        }
        case "error": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "error",
                errorMessage: event.message,
                draft: state.lastRecoverableDraft ? "" : state.draft,
                activeRun:
                    state.activeRun && state.activeRun.runId === event.runId
                        ? {
                              ...state.activeRun,
                              status:
                                  event.failureCode === "timeout"
                                      ? "timed_out"
                                      : event.failureCode === "client_cancelled"
                                        ? "cancelled"
                                        : "failed",
                          }
                        : state.activeRun,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: mapMessage(existing, event.assistantMessageId, (message) => ({
                        ...message,
                        status: event.failureCode === "client_cancelled" ? "cancelled" : "failed",
                        failureCode: event.failureCode,
                        failureMessage: event.message,
                        updatedAt: new Date().toISOString(),
                    })),
                },
            };
        }
        case "done": {
            return {
                ...state,
                status: "ready",
                errorMessage: undefined,
                activeRun: null,
                retryTargetMessageId: null,
            };
        }
        default: {
            return state;
        }
    }
}

export function chatReducer(state: ChatControllerState, event: ChatEvent): ChatControllerState {
    switch (event.type) {
        case "LOAD_STARTED": {
            return {
                ...state,
                status: "loading",
                mutationError: undefined,
            };
        }
        case "THREADS_LOADED": {
            return {
                ...state,
                status: "ready",
                threads: event.threads,
                activeThreadId: event.activeThreadId,
                mutationError: undefined,
            };
        }
        case "THREAD_DETAIL_LOADED": {
            return {
                ...state,
                status: state.status === "loading" ? "ready" : state.status,
                threads: updateThreadInList(state.threads, event.detail.thread),
                activeThreadId: event.detail.thread.id,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.detail.thread.id]: event.detail.messages,
                },
                activeRun: event.detail.activeRunId
                    ? {
                          runId: event.detail.activeRunId,
                          threadId: event.detail.thread.id,
                          assistantMessageId:
                              event.detail.messages.findLast((message) => message.role === "assistant" && message.status === "streaming")
                                  ?.id ?? "",
                          status: "thinking",
                          retryOfMessageId: null,
                      }
                    : state.activeRun?.threadId === event.detail.thread.id
                      ? state.activeRun
                      : null,
            };
        }
        case "THREAD_CREATED": {
            return {
                ...state,
                status: "ready",
                threads: [event.thread, ...state.threads.filter((thread) => thread.id !== event.thread.id)],
                activeThreadId: event.thread.id,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.thread.id]: [],
                },
            };
        }
        case "THREAD_SELECTED": {
            return {
                ...state,
                activeThreadId: event.threadId,
                mutationError: undefined,
            };
        }
        case "DRAFT_CHANGED": {
            return {
                ...state,
                draft: event.value,
                mutationError: undefined,
            };
        }
        case "SUBMIT_REQUESTED": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "submitting",
                draft: event.retryMessageId ? state.draft : "",
                lastRecoverableDraft: event.draft,
                retryTargetMessageId: event.retryMessageId,
                errorMessage: undefined,
                messagesByThreadId: event.retryMessageId
                    ? state.messagesByThreadId
                    : {
                          ...state.messagesByThreadId,
                          [event.threadId]: [...existing, buildOptimisticUserMessage(event.draft)],
                      },
            };
        }
        case "RUN_EVENT_RECEIVED": {
            return applyRunEvent(state, event.event);
        }
        case "RUN_FAILED": {
            return {
                ...state,
                status: "error",
                errorMessage: event.message,
                draft: event.restoreDraft ? state.lastRecoverableDraft : state.draft,
                activeRun: null,
            };
        }
        case "RUN_COMPLETED": {
            return {
                ...state,
                status: "ready",
                activeRun: null,
                retryTargetMessageId: null,
                errorMessage: undefined,
            };
        }
        case "THREAD_RENAMED": {
            return {
                ...state,
                threads: state.threads.map((thread) => (thread.id === event.threadId ? { ...thread, title: event.title } : thread)),
            };
        }
        case "THREAD_DELETED": {
            const nextThreads = state.threads.filter((thread) => thread.id !== event.threadId);

            return {
                ...state,
                threads: nextThreads,
                activeThreadId: state.activeThreadId === event.threadId ? (nextThreads[0]?.id ?? null) : state.activeThreadId,
            };
        }
        case "MUTATION_ERROR": {
            return {
                ...state,
                mutationError: event.message,
            };
        }
        case "CLEAR_MUTATION_ERROR": {
            return {
                ...state,
                mutationError: undefined,
            };
        }
        default: {
            return state;
        }
    }
}
