import type { ChatRepository, ChatThreadRecord } from "@/lib/server/chat/persistence/repository";
import { getAnalysisModel, getToolTimeoutMs, logChatWarn, withTimeout } from "@/lib/server/chat/runtime/helpers";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import { generateObject } from "ai";
import "server-only";
import { z } from "zod";

const titleSchema = z.object({
    title: z.string().min(3).max(60),
});

const summarySchema = z.object({
    summary: z.string().min(10).max(400),
});

export class ChatTitleSummaryService {
    public constructor(
        private readonly repository: ChatRepository,
        private readonly embedder: LearningEmbedder,
    ) {}

    public async finalizeCompletedTurn(input: {
        thread: ChatThreadRecord;
        transcript: readonly { role: "user" | "assistant"; content: string; id: string }[];
        assistantMessage: string;
        userMessage: string | null;
    }) {
        const jobs: Promise<unknown>[] = [
            this.maybeGenerateThreadSummary({
                threadId: input.thread.id,
                transcript: input.transcript,
            }),
        ];

        if (input.userMessage) {
            jobs.push(
                this.maybeGenerateThreadTitle({
                    threadId: input.thread.id,
                    existingTitleLockedByUser: input.thread.titleLockedByUser,
                    threadTitleStatus: input.thread.titleStatus,
                    userMessage: input.userMessage,
                    assistantMessage: input.assistantMessage,
                }),
            );
        }

        await Promise.allSettled(jobs);
    }

    private async maybeGenerateThreadTitle(input: {
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
            const result = await withTimeout({
                operation: generateObject({
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
                }),
                timeoutMs: getToolTimeoutMs(),
                timeoutMessage: "Title generation timed out.",
                timeoutCode: "tool_timeout",
            });

            await this.repository.updateThreadTitle(input.threadId, result.object.title.trim());
        } catch (error) {
            logChatWarn("thread.title.failed", {
                threadId: input.threadId,
                message: error instanceof Error ? error.message : "Title generation failed.",
            });
            await this.repository.markThreadTitleFailed(input.threadId);
        }
    }

    private async maybeGenerateThreadSummary(input: {
        threadId: string;
        transcript: readonly { role: "user" | "assistant"; content: string; id: string }[];
    }) {
        try {
            const transcriptText = input.transcript.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n\n");
            const result = await withTimeout({
                operation: generateObject({
                    model: getAnalysisModel(),
                    schema: summarySchema,
                    prompt: [
                        "Summarize this Vietnamese-learning conversation for future context.",
                        "Include user goals, key language points, and unresolved follow-ups.",
                        "Be factual and concise.",
                        transcriptText,
                    ].join("\n\n"),
                }),
                timeoutMs: getToolTimeoutMs(),
                timeoutMessage: "Thread summary generation timed out.",
                timeoutCode: "tool_timeout",
            });

            const summary = result.object.summary;
            const embedding = await withTimeout({
                operation: this.embedder.embed(summary),
                timeoutMs: getToolTimeoutMs(),
                timeoutMessage: "Thread summary embedding timed out.",
                timeoutCode: "tool_timeout",
            });

            await this.repository.upsertRollingSummary(input.threadId, summary, {
                embedding,
                embeddingSourceText: summary,
                sourceMessageIds: input.transcript.map((item) => item.id),
            });
        } catch (error) {
            logChatWarn("thread.summary.failed", {
                threadId: input.threadId,
                message: error instanceof Error ? error.message : "Thread summary generation failed.",
            });
            await this.repository.markThreadSummaryFailed(input.threadId);
        }
    }
}
