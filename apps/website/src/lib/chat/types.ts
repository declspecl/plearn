export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export type ChatMessageStatus = "streaming" | "completed" | "failed" | "cancelled";

export type ChatRunStatus = "running" | "completed" | "failed" | "cancelled" | "timed_out";

export type ChatFailureCode =
    | "unknown"
    | "timeout"
    | "tool_error"
    | "tool_timeout"
    | "network_error"
    | "run_in_progress"
    | "client_cancelled"
    | "stale_run"
    | "thread_locked"
    | "invalid_retry";

export type ChatUiStatus =
    | "idle"
    | "connecting"
    | "thinking"
    | "using_tools"
    | "writing"
    | "retrying"
    | "failed"
    | "timed_out"
    | "cancelled"
    | "completed";

export interface ChatTextPart {
    readonly type: "text";
    readonly text: string;
}

export interface ChatToolCallPart {
    readonly type: "tool-call";
    readonly toolCallId: string;
    readonly toolName: string;
    readonly input?: unknown;
}

export interface ChatToolResultPart {
    readonly type: "tool-result";
    readonly toolCallId: string;
    readonly toolName: string;
    readonly output?: unknown;
}

export interface ChatToolErrorPart {
    readonly type: "tool-error";
    readonly toolCallId: string;
    readonly toolName: string;
    readonly errorCode: ChatFailureCode;
    readonly errorMessage: string;
}

export type ChatMessagePart = ChatTextPart | ChatToolCallPart | ChatToolResultPart | ChatToolErrorPart;

export interface ChatMessage {
    readonly id: string;
    readonly role: ChatMessageRole;
    readonly status: ChatMessageStatus;
    readonly content: string;
    readonly parts: readonly ChatMessagePart[];
    readonly failureCode: ChatFailureCode | null;
    readonly failureMessage: string | null;
    readonly retryOfMessageId: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface ChatThreadSummary {
    readonly id: string;
    readonly title: string;
    readonly summary: string | null;
    readonly languageCode: string;
    readonly lastMessageAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly hasActiveRun: boolean;
    readonly lastRunStatus: ChatRunStatus | null;
}

export interface ChatThreadDetail {
    readonly thread: ChatThreadSummary;
    readonly messages: readonly ChatMessage[];
    readonly nextCursor: string | null;
    readonly activeRunId: string | null;
}

export interface ChatRunStartEvent {
    readonly type: "run-start";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly retryOfMessageId: string | null;
}

export interface ChatAssistantMessageCreatedEvent {
    readonly type: "assistant-message-created";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessage: ChatMessage;
}

export interface ChatStatusEvent {
    readonly type: "status";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly status: ChatUiStatus;
    readonly message: string;
}

export interface ChatTextDeltaEvent {
    readonly type: "text-delta";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly text: string;
}

export interface ChatToolCallStartEvent {
    readonly type: "tool-call-start";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly toolCallId: string;
    readonly toolName: string;
    readonly input?: unknown;
}

export interface ChatToolCallFinishEvent {
    readonly type: "tool-call-finish";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly toolCallId: string;
    readonly toolName: string;
    readonly output?: unknown;
}

export interface ChatToolCallFailEvent {
    readonly type: "tool-call-fail";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly toolCallId: string;
    readonly toolName: string;
    readonly errorCode: ChatFailureCode;
    readonly errorMessage: string;
}

export interface ChatErrorEvent {
    readonly type: "error";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly failureCode: ChatFailureCode;
    readonly message: string;
}

export interface ChatDoneEvent {
    readonly type: "done";
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly finalStatus: Exclude<ChatUiStatus, "idle" | "connecting" | "thinking" | "using_tools" | "writing" | "retrying">;
}

export type ChatStreamEvent =
    | ChatRunStartEvent
    | ChatAssistantMessageCreatedEvent
    | ChatStatusEvent
    | ChatTextDeltaEvent
    | ChatToolCallStartEvent
    | ChatToolCallFinishEvent
    | ChatToolCallFailEvent
    | ChatErrorEvent
    | ChatDoneEvent;

export interface ChatMutationError {
    readonly code: ChatFailureCode;
    readonly message: string;
    readonly runId?: string;
}

export interface ChatSubmitRequest {
    readonly message?: string;
    readonly clientTurnId?: string;
    readonly retryMessageId?: string;
}
