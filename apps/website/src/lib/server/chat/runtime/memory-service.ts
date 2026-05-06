import type { ChatRepository } from "@/lib/server/chat/persistence/repository";
import { getToolTimeoutMs, logChatWarn, withTimeout } from "@/lib/server/chat/runtime/helpers";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import "server-only";

export class ChatMemoryService {
    public constructor(
        private readonly repository: ChatRepository,
        private readonly embedder: LearningEmbedder,
    ) {}

    public async rememberTurn(input: {
        threadId: string;
        triggerMessageId: string | null;
        assistantMessageId: string;
        userMessage: string | null;
        assistantMessage: string;
    }) {
        const content = input.userMessage
            ? `User: ${input.userMessage}\nAssistant: ${input.assistantMessage}`
            : `Assistant retry: ${input.assistantMessage}`;

        try {
            const embedding = await withTimeout({
                operation: this.embedder.embed(content),
                timeoutMs: getToolTimeoutMs(),
                timeoutMessage: "Memory embedding timed out.",
                timeoutCode: "tool_timeout",
            });

            await this.repository.addMemoryEntry({
                threadId: input.threadId,
                memoryKind: "fact",
                content,
                embedding,
                embeddingSourceText: content,
                sourceMessageIds: [input.triggerMessageId, input.assistantMessageId].filter((id): id is string => Boolean(id)),
            });
        } catch (error) {
            logChatWarn("thread.memory.failed", {
                threadId: input.threadId,
                message: error instanceof Error ? error.message : "Thread memory write failed.",
            });
        }
    }
}
