import type { ChatMessage, ChatMutationError, ChatThreadDetail, ChatThreadSummary, ChatUiStatus } from "@/lib/chat/types";

export type { ChatMessage, ChatMutationError, ChatThreadDetail, ChatThreadSummary, ChatUiStatus } from "@/lib/chat/types";

export interface ChatToolActivity {
    readonly id: string;
    readonly label: string;
    readonly status: "running" | "completed" | "failed";
    readonly failureMessage?: string;
}

export interface ActiveChatRun {
    readonly runId: string;
    readonly threadId: string;
    readonly assistantMessageId: string;
    readonly status: ChatUiStatus;
    readonly retryOfMessageId: string | null;
}

export interface ChatControllerState {
    readonly status: "loading" | "ready" | "submitting" | "streaming" | "error";
    readonly draft: string;
    readonly lastRecoverableDraft: string;
    readonly threads: readonly ChatThreadSummary[];
    readonly activeThreadId: string | null;
    readonly messagesByThreadId: Readonly<Record<string, readonly ChatMessage[]>>;
    readonly activeRun: ActiveChatRun | null;
    readonly errorMessage?: string;
    readonly mutationError?: string;
    readonly retryTargetMessageId: string | null;
}

export interface ChatController {
    readonly state: ChatControllerState;
    readonly activeThread: ChatThreadSummary | null;
    readonly activeMessages: readonly ChatMessage[];
    readonly isBusy: boolean;
    readonly isThreadLocked: boolean;
    readonly setDraft: (value: string) => void;
    readonly loadThread: (threadId: string) => Promise<ChatThreadDetail | null>;
    readonly createThread: () => Promise<void>;
    readonly submit: (options?: { retryMessageId?: string }) => Promise<void>;
    readonly renameThread: (threadId: string, title: string) => Promise<ChatMutationError | null>;
    readonly deleteThread: (threadId: string) => Promise<ChatMutationError | null>;
    readonly clearMutationError: () => void;
}
