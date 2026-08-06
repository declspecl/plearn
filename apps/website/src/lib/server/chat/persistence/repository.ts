import type { ChatFailureCode, ChatMessagePart, ChatMessageStatus, ChatRunStatus } from "@/lib/chat/types";
import type { DatabaseInstance } from "@plearn/db/client";
import { agentMessages, agentThreadMemory, agentThreadRuns, agentThreads } from "@plearn/db/schema";
import { and, asc, cosineDistance, desc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import "server-only";

type ThreadStatus = "active" | "archived";
type ThreadGenerationStatus = "pending" | "ready" | "failed";
type MessageRole = "system" | "user" | "assistant" | "tool";
type MemoryKind = "rolling_summary" | "fact" | "preference" | "task_state";

export interface ChatThreadRecord {
    readonly id: string;
    readonly createdByUserId: string;
    readonly languageCode: string;
    readonly status: ThreadStatus;
    readonly title: string;
    readonly titleStatus: ThreadGenerationStatus;
    readonly summary: string | null;
    readonly summaryStatus: ThreadGenerationStatus;
    readonly titleLockedByUser: boolean;
    readonly lastMessageAt: Date;
    readonly archivedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ChatMessageRecord {
    readonly id: string;
    readonly threadId: string;
    readonly role: MessageRole;
    readonly status: ChatMessageStatus;
    readonly content: string;
    readonly partsJson: readonly ChatMessagePart[];
    readonly finishReason: string | null;
    readonly failureCode: ChatFailureCode | null;
    readonly failureMessage: string | null;
    readonly retryOfMessageId: string | null;
    readonly modelProvider: string | null;
    readonly modelId: string | null;
    readonly tokenUsageJson: unknown;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ChatRunRecord {
    readonly id: string;
    readonly threadId: string;
    readonly triggerMessageId: string | null;
    readonly assistantMessageId: string | null;
    readonly clientTurnId: string | null;
    readonly status: ChatRunStatus;
    readonly errorMessage: string | null;
    readonly startedAt: Date;
    readonly completedAt: Date | null;
    readonly cancelledAt: Date | null;
    readonly createdAt: Date;
}

function toTextParts(content: string): readonly ChatMessagePart[] {
    return [{ type: "text", text: content }];
}

function extractContent(partsJson: unknown): string {
    if (!Array.isArray(partsJson)) {
        return "";
    }

    return partsJson
        .filter((part) => part && typeof part === "object" && "type" in part)
        .map((part) => {
            const value = part as { type?: unknown; text?: unknown };

            return value.type === "text" && typeof value.text === "string" ? value.text : "";
        })
        .join("");
}

function normalizeParts(partsJson: unknown): readonly ChatMessagePart[] {
    if (!Array.isArray(partsJson)) {
        return [];
    }

    return partsJson.filter((part): part is ChatMessagePart => Boolean(part && typeof part === "object" && "type" in part));
}

function toMessageRecord(row: typeof agentMessages.$inferSelect): ChatMessageRecord {
    return {
        id: row.id,
        threadId: row.threadId,
        role: row.role,
        status: row.status,
        content: extractContent(row.partsJson),
        partsJson: normalizeParts(row.partsJson),
        finishReason: row.finishReason,
        failureCode: (row.failureCode as ChatFailureCode | null) ?? null,
        failureMessage: row.failureMessage,
        retryOfMessageId: row.retryOfMessageId,
        modelProvider: row.modelProvider,
        modelId: row.modelId,
        tokenUsageJson: row.tokenUsageJson,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function toRunRecord(row: typeof agentThreadRuns.$inferSelect): ChatRunRecord {
    return {
        id: row.id,
        threadId: row.threadId,
        triggerMessageId: row.triggerMessageId,
        assistantMessageId: row.assistantMessageId,
        clientTurnId: row.clientTurnId,
        status: row.status,
        errorMessage: row.errorMessage,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        cancelledAt: row.cancelledAt,
        createdAt: row.createdAt,
    };
}

export class ChatRepository {
    public constructor(private readonly db: DatabaseInstance) {}

    public async createThread(input: { createdByUserId: string; languageCode: string }) {
        const [row] = await this.db
            .insert(agentThreads)
            .values({
                id: randomUUID(),
                createdByUserId: input.createdByUserId,
                kind: "learning_chat",
                languageCode: input.languageCode,
                title: "New chat",
            })
            .returning();

        if (!row) {
            throw new Error("Thread creation failed.");
        }

        return row;
    }

    public async listThreads(userId: string) {
        const threads = await this.db
            .select()
            .from(agentThreads)
            .where(
                and(
                    eq(agentThreads.createdByUserId, userId),
                    eq(agentThreads.kind, "learning_chat"),
                    eq(agentThreads.status, "active"),
                    isNull(agentThreads.archivedAt),
                ),
            )
            .orderBy(desc(agentThreads.lastMessageAt))
            .limit(100);

        const threadIds = threads.map((thread) => thread.id);
        if (threadIds.length === 0) {
            return [];
        }

        const runs = await this.db
            .select()
            .from(agentThreadRuns)
            .where(inArray(agentThreadRuns.threadId, threadIds))
            .orderBy(desc(agentThreadRuns.startedAt));

        const latestRunByThreadId = new Map<string, ChatRunRecord>();
        const activeRunByThreadId = new Map<string, ChatRunRecord>();

        for (const run of runs.map((row) => toRunRecord(row))) {
            if (!latestRunByThreadId.has(run.threadId)) {
                latestRunByThreadId.set(run.threadId, run);
            }

            if (run.status === "running" && !activeRunByThreadId.has(run.threadId)) {
                activeRunByThreadId.set(run.threadId, run);
            }
        }

        return threads.map((thread) => ({
            thread,
            hasActiveRun: activeRunByThreadId.has(thread.id),
            lastRunStatus: latestRunByThreadId.get(thread.id)?.status ?? null,
            activeRunId: activeRunByThreadId.get(thread.id)?.id ?? null,
        }));
    }

    public async getThread(userId: string, threadId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreads)
            .where(and(eq(agentThreads.id, threadId), eq(agentThreads.createdByUserId, userId), eq(agentThreads.kind, "learning_chat")))
            .limit(1);

        return row;
    }

    public async getActiveRun(threadId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.status, "running")))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        return row ? toRunRecord(row) : null;
    }

    public async findRunByClientTurnId(threadId: string, clientTurnId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.clientTurnId, clientTurnId)))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        return row ? toRunRecord(row) : null;
    }

    public async getThreadDetail(userId: string, threadId: string, options?: { before?: Date; limit?: number }) {
        const thread = await this.getThread(userId, threadId);
        if (!thread) {
            return null;
        }

        const limit = Math.min(options?.limit ?? 60, 100);
        const rows = await this.db
            .select()
            .from(agentMessages)
            .where(and(eq(agentMessages.threadId, threadId), options?.before ? lt(agentMessages.createdAt, options.before) : undefined))
            .orderBy(desc(agentMessages.createdAt))
            .limit(limit);

        const activeRun = await this.getActiveRun(threadId);
        const latestRun = await this.findLatestRun(threadId);
        const messages = rows.toReversed().map((row) => toMessageRecord(row));
        const nextCursor = rows.length === limit ? (rows.at(-1)?.createdAt.toISOString() ?? null) : null;

        return {
            thread,
            messages,
            nextCursor,
            activeRunId: activeRun?.id ?? null,
            hasActiveRun: Boolean(activeRun),
            lastRunStatus: latestRun?.status ?? null,
        };
    }

    public async findMessage(threadId: string, messageId: string) {
        const [row] = await this.db
            .select()
            .from(agentMessages)
            .where(and(eq(agentMessages.threadId, threadId), eq(agentMessages.id, messageId)))
            .limit(1);

        return row ? toMessageRecord(row) : null;
    }

    public async createMessage(input: {
        threadId: string;
        role: MessageRole;
        status: ChatMessageStatus;
        content?: string;
        partsJson?: readonly ChatMessagePart[];
        modelProvider?: string | null;
        modelId?: string | null;
        finishReason?: string | null;
        failureCode?: ChatFailureCode | null;
        failureMessage?: string | null;
        retryOfMessageId?: string | null;
        tokenUsageJson?: unknown;
        toolCallsJson?: unknown;
        toolResultsJson?: unknown;
    }) {
        const [row] = await this.db
            .insert(agentMessages)
            .values({
                id: randomUUID(),
                threadId: input.threadId,
                role: input.role,
                status: input.status,
                partsJson: input.partsJson ?? toTextParts(input.content ?? ""),
                modelProvider: input.modelProvider ?? null,
                modelId: input.modelId ?? null,
                finishReason: input.finishReason ?? null,
                failureCode: input.failureCode ?? null,
                failureMessage: input.failureMessage ?? null,
                retryOfMessageId: input.retryOfMessageId ?? null,
                tokenUsageJson: input.tokenUsageJson ?? null,
                toolCallsJson: input.toolCallsJson ?? null,
                toolResultsJson: input.toolResultsJson ?? null,
            })
            .returning();

        if (!row) {
            throw new Error("Message creation failed.");
        }

        await this.touchThread(input.threadId, row.createdAt);

        return toMessageRecord(row);
    }

    public async updateMessage(
        messageId: string,
        input: {
            status?: ChatMessageStatus;
            content?: string;
            partsJson?: readonly ChatMessagePart[];
            modelProvider?: string | null;
            modelId?: string | null;
            finishReason?: string | null;
            failureCode?: ChatFailureCode | null;
            failureMessage?: string | null;
            tokenUsageJson?: unknown;
            toolCallsJson?: unknown;
            toolResultsJson?: unknown;
        },
    ) {
        const [row] = await this.db
            .update(agentMessages)
            .set({
                status: input.status,
                partsJson: input.partsJson ?? (input.content === undefined ? undefined : toTextParts(input.content)),
                modelProvider: input.modelProvider,
                modelId: input.modelId,
                finishReason: input.finishReason,
                failureCode: input.failureCode,
                failureMessage: input.failureMessage,
                tokenUsageJson: input.tokenUsageJson,
                toolCallsJson: input.toolCallsJson,
                toolResultsJson: input.toolResultsJson,
                updatedAt: new Date(),
            })
            .where(eq(agentMessages.id, messageId))
            .returning();

        if (!row) {
            throw new Error("Message update failed.");
        }

        await this.touchThread(row.threadId, row.updatedAt);

        return toMessageRecord(row);
    }

    public async createRun(input: {
        threadId: string;
        triggerMessageId: string | null;
        assistantMessageId: string;
        clientTurnId?: string | null;
    }) {
        const [row] = await this.db
            .insert(agentThreadRuns)
            .values({
                id: randomUUID(),
                threadId: input.threadId,
                triggerMessageId: input.triggerMessageId,
                assistantMessageId: input.assistantMessageId,
                clientTurnId: input.clientTurnId ?? null,
                status: "running",
            })
            .returning();

        if (!row) {
            throw new Error("Run creation failed.");
        }

        return toRunRecord(row);
    }

    public async finalizeRun(
        runId: string,
        input: {
            status: ChatRunStatus;
            errorMessage?: string | null;
        },
    ) {
        const now = new Date();
        const [row] = await this.db
            .update(agentThreadRuns)
            .set({
                status: input.status,
                errorMessage: input.errorMessage ?? null,
                completedAt: input.status === "running" ? undefined : now,
                cancelledAt: input.status === "cancelled" ? now : null,
            })
            .where(eq(agentThreadRuns.id, runId))
            .returning();

        if (!row) {
            throw new Error("Run update failed.");
        }

        return toRunRecord(row);
    }

    public async findLatestRun(threadId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(eq(agentThreadRuns.threadId, threadId))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        return row ? toRunRecord(row) : null;
    }

    public async listRecentMessages(threadId: string, limit: number, options?: { excludeMessageIds?: readonly string[] }) {
        const rows = await this.db
            .select()
            .from(agentMessages)
            .where(eq(agentMessages.threadId, threadId))
            .orderBy(desc(agentMessages.createdAt))
            .limit(Math.min(limit, 100));

        const excluded = new Set(options?.excludeMessageIds);

        return rows
            .toReversed()
            .map((row) => toMessageRecord(row))
            .filter((message) => !excluded.has(message.id));
    }

    public async findRetrySource(threadId: string, assistantMessageId: string) {
        const [runRow] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.assistantMessageId, assistantMessageId)))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        if (!runRow?.triggerMessageId) {
            return null;
        }

        const [messageRow] = await this.db.select().from(agentMessages).where(eq(agentMessages.id, runRow.triggerMessageId)).limit(1);

        if (!messageRow) {
            return null;
        }

        return {
            run: toRunRecord(runRow),
            message: toMessageRecord(messageRow),
        };
    }

    public async getRollingSummary(threadId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreadMemory)
            .where(and(eq(agentThreadMemory.threadId, threadId), eq(agentThreadMemory.memoryKind, "rolling_summary")))
            .orderBy(desc(agentThreadMemory.updatedAt))
            .limit(1);

        return row?.content ?? null;
    }

    public async upsertRollingSummary(
        threadId: string,
        summary: string,
        options?: { embedding?: number[]; embeddingSourceText?: string; sourceMessageIds?: readonly string[] },
    ) {
        const [existing] = await this.db
            .select()
            .from(agentThreadMemory)
            .where(and(eq(agentThreadMemory.threadId, threadId), eq(agentThreadMemory.memoryKind, "rolling_summary")))
            .orderBy(desc(agentThreadMemory.updatedAt))
            .limit(1);

        await (existing
            ? this.db
                  .update(agentThreadMemory)
                  .set({
                      content: summary,
                      embedding: options?.embedding ?? null,
                      embeddingSourceText: options?.embeddingSourceText ?? null,
                      sourceMessageIdsJson: options?.sourceMessageIds ? [...options.sourceMessageIds] : null,
                      updatedAt: new Date(),
                  })
                  .where(eq(agentThreadMemory.id, existing.id))
            : this.db.insert(agentThreadMemory).values({
                  id: randomUUID(),
                  threadId,
                  memoryKind: "rolling_summary",
                  content: summary,
                  embedding: options?.embedding,
                  embeddingSourceText: options?.embeddingSourceText,
                  sourceMessageIdsJson: options?.sourceMessageIds ? [...options.sourceMessageIds] : null,
              }));

        await this.db
            .update(agentThreads)
            .set({
                summary,
                summaryStatus: "ready",
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public async addMemoryEntry(input: {
        threadId: string;
        memoryKind: Exclude<MemoryKind, "rolling_summary">;
        content: string;
        embedding?: number[];
        embeddingSourceText?: string;
        sourceMessageIds?: readonly string[];
    }) {
        await this.db.insert(agentThreadMemory).values({
            id: randomUUID(),
            threadId: input.threadId,
            memoryKind: input.memoryKind,
            content: input.content,
            embedding: input.embedding,
            embeddingSourceText: input.embeddingSourceText,
            sourceMessageIdsJson: input.sourceMessageIds ? [...input.sourceMessageIds] : null,
        });
    }

    public async searchThreadMemory(input: { threadId: string; embedding: number[]; limit: number }) {
        const rows = await this.db
            .select({
                id: agentThreadMemory.id,
                content: agentThreadMemory.content,
                memoryKind: agentThreadMemory.memoryKind,
                sourceMessageIdsJson: agentThreadMemory.sourceMessageIdsJson,
                distance: cosineDistance(agentThreadMemory.embedding, input.embedding),
            })
            .from(agentThreadMemory)
            .where(and(eq(agentThreadMemory.threadId, input.threadId), isNotNull(agentThreadMemory.embedding)))
            .orderBy(({ distance }) => asc(distance))
            .limit(input.limit);

        return rows.map((row) => ({
            id: row.id,
            content: row.content,
            memoryKind: row.memoryKind,
            sourceMessageIds: Array.isArray(row.sourceMessageIdsJson)
                ? row.sourceMessageIdsJson.filter((item): item is string => typeof item === "string")
                : [],
            confidence: Math.max(0, 1 - Number(row.distance)),
        }));
    }

    public updateThreadTitle(threadId: string, title: string) {
        return this.db
            .update(agentThreads)
            .set({
                title,
                titleStatus: "ready",
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public updateThreadTitleByUser(threadId: string, title: string) {
        return this.db
            .update(agentThreads)
            .set({
                title,
                titleStatus: "ready",
                titleLockedByUser: true,
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public deleteThread(threadId: string) {
        return this.db
            .update(agentThreads)
            .set({
                status: "archived",
                archivedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public markThreadTitleFailed(threadId: string) {
        return this.db.update(agentThreads).set({ titleStatus: "failed", updatedAt: new Date() }).where(eq(agentThreads.id, threadId));
    }

    public markThreadSummaryFailed(threadId: string) {
        return this.db.update(agentThreads).set({ summaryStatus: "failed", updatedAt: new Date() }).where(eq(agentThreads.id, threadId));
    }

    public async repairStaleRuns(input: { startedBefore: Date; failureMessage: string; failureCode: ChatFailureCode }) {
        const staleRuns = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.status, "running"), lt(agentThreadRuns.startedAt, input.startedBefore)));

        if (staleRuns.length === 0) {
            return 0;
        }

        const now = new Date();
        const assistantMessageIds = staleRuns.map((run) => run.assistantMessageId).filter((id): id is string => typeof id === "string");

        await this.db
            .update(agentThreadRuns)
            .set({
                status: "timed_out",
                errorMessage: input.failureMessage,
                completedAt: now,
                cancelledAt: null,
            })
            .where(
                inArray(
                    agentThreadRuns.id,
                    staleRuns.map((run) => run.id),
                ),
            );

        if (assistantMessageIds.length > 0) {
            await this.db
                .update(agentMessages)
                .set({
                    status: "failed",
                    failureCode: input.failureCode,
                    failureMessage: input.failureMessage,
                    updatedAt: now,
                })
                .where(and(inArray(agentMessages.id, assistantMessageIds), eq(agentMessages.status, "streaming")));
        }

        return staleRuns.length;
    }

    private touchThread(threadId: string, timestamp: Date) {
        return this.db
            .update(agentThreads)
            .set({
                lastMessageAt: timestamp,
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }
}
