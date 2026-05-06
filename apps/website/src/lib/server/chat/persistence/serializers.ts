import type { ChatMessage, ChatThreadDetail, ChatThreadSummary } from "@/lib/chat/types";
import type { ChatRunStatus } from "@/lib/chat/types";
import type { ChatMessageRecord, ChatThreadRecord } from "@/lib/server/chat/persistence/repository";

export function toChatMessage(message: ChatMessageRecord): ChatMessage {
    return {
        id: message.id,
        role: message.role,
        status: message.status,
        content: message.content,
        parts: message.partsJson,
        failureCode: message.failureCode,
        failureMessage: message.failureMessage,
        retryOfMessageId: message.retryOfMessageId,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
    };
}

export function toChatThreadSummary(input: {
    thread: ChatThreadRecord;
    hasActiveRun: boolean;
    lastRunStatus: ChatRunStatus | null;
}): ChatThreadSummary {
    return {
        id: input.thread.id,
        title: input.thread.title,
        summary: input.thread.summary,
        languageCode: input.thread.languageCode,
        lastMessageAt: input.thread.lastMessageAt.toISOString(),
        createdAt: input.thread.createdAt.toISOString(),
        updatedAt: input.thread.updatedAt.toISOString(),
        hasActiveRun: input.hasActiveRun,
        lastRunStatus: input.lastRunStatus,
    };
}

export function toChatThreadDetail(input: {
    thread: ChatThreadRecord;
    messages: readonly ChatMessageRecord[];
    hasActiveRun: boolean;
    lastRunStatus: ChatRunStatus | null;
    nextCursor: string | null;
    activeRunId: string | null;
}): ChatThreadDetail {
    return {
        thread: toChatThreadSummary({
            thread: input.thread,
            hasActiveRun: input.hasActiveRun,
            lastRunStatus: input.lastRunStatus,
        }),
        messages: input.messages.map((message) => toChatMessage(message)),
        nextCursor: input.nextCursor,
        activeRunId: input.activeRunId,
    };
}
