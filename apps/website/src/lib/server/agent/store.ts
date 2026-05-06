import type { DatabaseInstance } from "@plearn/db/client";
import { agentMessages, agentThreadMemory, agentThreadRuns, agentThreads } from "@plearn/db/schema";
import { and, asc, cosineDistance, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import "server-only";

type ThreadStatus = "active" | "archived";
type ThreadGenerationStatus = "pending" | "ready" | "failed";
type RunStatus = "running" | "completed" | "failed" | "cancelled";
type MessageRole = "user" | "assistant" | "system" | "tool";

export interface AgentThreadRecord {
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

export interface AgentMessageRecord {
    readonly id: string;
    readonly threadId: string;
    readonly role: MessageRole;
    readonly content: string;
    readonly partsJson: unknown;
    readonly toolCallsJson: unknown;
    readonly toolResultsJson: unknown;
    readonly createdAt: Date;
}

function toPartsJson(content: string) {
    return [{ type: "text", text: content }];
}

function extractContent(partsJson: unknown): string {
    if (!Array.isArray(partsJson)) {
        return "";
    }

    const texts = partsJson
        .filter((part) => part && typeof part === "object" && "type" in part && "text" in part)
        .map((part) => (part as { text?: unknown }).text)
        .filter((text): text is string => typeof text === "string");

    return texts.join("");
}

export class AgentRepository {
    public constructor(private readonly db: DatabaseInstance) {}

    public async createThread(input: { id?: string; createdByUserId: string; languageCode: string }) {
        const [row] = await this.db
            .insert(agentThreads)
            .values({
                id: input.id ?? randomUUID(),
                createdByUserId: input.createdByUserId,
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
        return this.db
            .select()
            .from(agentThreads)
            .where(and(eq(agentThreads.createdByUserId, userId), eq(agentThreads.status, "active"), isNull(agentThreads.archivedAt)))
            .orderBy(desc(agentThreads.lastMessageAt))
            .limit(100);
    }

    public async getThread(userId: string, threadId: string) {
        const [row] = await this.db
            .select()
            .from(agentThreads)
            .where(and(eq(agentThreads.id, threadId), eq(agentThreads.createdByUserId, userId)))
            .limit(1);

        return row;
    }

    public async getThreadWithMessages(userId: string, threadId: string) {
        const thread = await this.getThread(userId, threadId);
        if (!thread) {
            return null;
        }
        const messageRows = await this.db
            .select()
            .from(agentMessages)
            .where(eq(agentMessages.threadId, thread.id))
            .orderBy(asc(agentMessages.createdAt));

        return {
            thread,
            messages: messageRows.map((row) => ({
                id: row.id,
                threadId: row.threadId,
                role: row.role,
                content: extractContent(row.partsJson),
                partsJson: row.partsJson,
                toolCallsJson: row.toolCallsJson,
                toolResultsJson: row.toolResultsJson,
                createdAt: row.createdAt,
            })),
        };
    }

    public async createMessage(input: {
        id: string;
        threadId: string;
        role: MessageRole;
        content?: string;
        partsJson?: unknown;
        modelProvider?: string;
        modelId?: string;
        finishReason?: string;
        tokenUsage?: unknown;
        toolCallsJson?: unknown;
        toolResultsJson?: unknown;
    }): Promise<AgentMessageRecord> {
        const partsJson = input.partsJson ?? toPartsJson(input.content ?? "");
        const [row] = await this.db
            .insert(agentMessages)
            .values({
                id: input.id,
                threadId: input.threadId,
                role: input.role,
                partsJson,
                modelProvider: input.modelProvider ?? null,
                modelId: input.modelId ?? null,
                finishReason: input.finishReason ?? null,
                tokenUsageJson: input.tokenUsage ?? null,
                toolCallsJson: input.toolCallsJson ?? null,
                toolResultsJson: input.toolResultsJson ?? null,
            })
            .returning();
        if (!row) {
            throw new Error("Message creation failed.");
        }

        await this.db
            .update(agentThreads)
            .set({
                lastMessageAt: row.createdAt,
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, input.threadId));

        return {
            id: row.id,
            threadId: row.threadId,
            role: row.role,
            content: extractContent(row.partsJson),
            partsJson: row.partsJson,
            toolCallsJson: row.toolCallsJson,
            toolResultsJson: row.toolResultsJson,
            createdAt: row.createdAt,
        };
    }

    public async listRecentMessages(threadId: string, limit: number): Promise<readonly AgentMessageRecord[]> {
        const rows = await this.db
            .select()
            .from(agentMessages)
            .where(eq(agentMessages.threadId, threadId))
            .orderBy(desc(agentMessages.createdAt))
            .limit(limit);

        return rows.toReversed().map((row) => ({
            id: row.id,
            threadId: row.threadId,
            role: row.role,
            content: extractContent(row.partsJson),
            partsJson: row.partsJson,
            toolCallsJson: row.toolCallsJson,
            toolResultsJson: row.toolResultsJson,
            createdAt: row.createdAt,
        }));
    }

    public async getRollingSummary(threadId: string): Promise<string | null> {
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
    ): Promise<void> {
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
        memoryKind: "fact" | "preference" | "task_state";
        content: string;
        embedding?: number[];
        embeddingSourceText?: string;
        sourceMessageIds?: readonly string[];
    }): Promise<void> {
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

    public updateThreadTitle(threadId: string, title: string): Promise<unknown> {
        return this.db
            .update(agentThreads)
            .set({
                title,
                titleStatus: "ready",
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public updateThreadTitleByUser(threadId: string, title: string): Promise<unknown> {
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

    public deleteThread(threadId: string): Promise<unknown> {
        return this.db
            .update(agentThreads)
            .set({
                status: "archived",
                archivedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(agentThreads.id, threadId));
    }

    public markThreadTitleFailed(threadId: string): Promise<unknown> {
        return this.db.update(agentThreads).set({ titleStatus: "failed", updatedAt: new Date() }).where(eq(agentThreads.id, threadId));
    }

    public markThreadSummaryFailed(threadId: string): Promise<unknown> {
        return this.db.update(agentThreads).set({ summaryStatus: "failed", updatedAt: new Date() }).where(eq(agentThreads.id, threadId));
    }

    public createRun(input: {
        id: string;
        threadId: string;
        triggerMessageId: string;
        startedAt: Date;
        status: RunStatus;
    }): Promise<unknown> {
        return this.db.insert(agentThreadRuns).values({
            id: input.id,
            threadId: input.threadId,
            triggerMessageId: input.triggerMessageId,
            startedAt: input.startedAt,
            status: input.status,
        });
    }

    public completeRunForThread(
        threadId: string,
        input: {
            startedAt: Date;
            completedAt: Date;
            status: RunStatus;
            errorMessage?: string;
        },
    ): Promise<unknown> {
        return this.db
            .update(agentThreadRuns)
            .set({
                status: input.status,
                completedAt: input.completedAt,
                errorMessage: input.errorMessage ?? null,
            })
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.startedAt, input.startedAt)));
    }
}
