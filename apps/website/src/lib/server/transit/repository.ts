import type { SanitizedTransitExtraction, TransitBrief, TransitThreadDetail, TransitThreadSummary } from "@/lib/transit/types";
import type { DatabaseInstance } from "@plearn/db/client";
import { agentMessages, agentThreadRuns, agentThreads } from "@plearn/db/schema";
import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import "server-only";

export type TransitMessagePart =
    | { readonly type: "text"; readonly text: string }
    | { readonly type: "transit-extraction"; readonly extraction: SanitizedTransitExtraction }
    | { readonly type: "transit-brief"; readonly brief: TransitBrief };

function normalizeParts(value: unknown): readonly TransitMessagePart[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((part): part is TransitMessagePart => {
        if (!part || typeof part !== "object" || !("type" in part)) {
            return false;
        }

        return ["text", "transit-extraction", "transit-brief"].includes(String(part.type));
    });
}

function extractText(parts: readonly TransitMessagePart[]) {
    return parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
}

function toThreadSummary(thread: typeof agentThreads.$inferSelect, activeThreadIds: ReadonlySet<string> = new Set()): TransitThreadSummary {
    return {
        id: thread.id,
        title: thread.title,
        summary: thread.summary,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        createdAt: thread.createdAt.toISOString(),
        hasActiveRun: activeThreadIds.has(thread.id),
    };
}

export class TransitRepository {
    public constructor(private readonly db: DatabaseInstance) {}

    public async createThread(userId: string) {
        const [thread] = await this.db
            .insert(agentThreads)
            .values({
                id: randomUUID(),
                createdByUserId: userId,
                kind: "transit",
                languageCode: "ja",
                title: "New rail journey",
                titleStatus: "ready",
                summaryStatus: "pending",
            })
            .returning();

        if (!thread) {
            throw new Error("Transit thread creation failed.");
        }

        return toThreadSummary(thread);
    }

    public async listThreads(userId: string) {
        const threads = await this.db
            .select()
            .from(agentThreads)
            .where(
                and(
                    eq(agentThreads.createdByUserId, userId),
                    eq(agentThreads.kind, "transit"),
                    eq(agentThreads.status, "active"),
                    isNull(agentThreads.archivedAt),
                ),
            )
            .orderBy(desc(agentThreads.lastMessageAt))
            .limit(50);
        const threadIds = threads.map((thread) => thread.id);
        if (threadIds.length === 0) {
            return [];
        }

        const activeRuns = await this.db
            .select({ threadId: agentThreadRuns.threadId })
            .from(agentThreadRuns)
            .where(and(inArray(agentThreadRuns.threadId, threadIds), eq(agentThreadRuns.status, "running")));
        const activeThreadIds = new Set(activeRuns.map((run) => run.threadId));

        return threads.map((thread) => toThreadSummary(thread, activeThreadIds));
    }

    public async getThread(userId: string, threadId: string) {
        const [thread] = await this.db
            .select()
            .from(agentThreads)
            .where(
                and(
                    eq(agentThreads.id, threadId),
                    eq(agentThreads.createdByUserId, userId),
                    eq(agentThreads.kind, "transit"),
                    eq(agentThreads.status, "active"),
                    isNull(agentThreads.archivedAt),
                ),
            )
            .limit(1);

        return thread ?? null;
    }

    public async getThreadDetail(userId: string, threadId: string): Promise<TransitThreadDetail | null> {
        const thread = await this.getThread(userId, threadId);
        if (!thread) {
            return null;
        }

        const [rows, activeRun] = await Promise.all([
            this.db
                .select()
                .from(agentMessages)
                .where(eq(agentMessages.threadId, threadId))
                .orderBy(desc(agentMessages.createdAt))
                .limit(80),
            this.getActiveRunForThread(threadId),
        ]);
        let extraction: SanitizedTransitExtraction | null = null;
        let brief: TransitBrief | null = null;

        for (const row of rows) {
            for (const part of normalizeParts(row.partsJson)) {
                if (!extraction && part.type === "transit-extraction") {
                    extraction = part.extraction;
                }
                if (!brief && part.type === "transit-brief") {
                    brief = part.brief;
                }
            }
        }

        return {
            thread: toThreadSummary(thread, activeRun ? new Set([thread.id]) : new Set()),
            extraction,
            brief,
            messages: rows
                .toReversed()
                .filter((row): row is typeof row & { role: "user" | "assistant" } => row.role === "user" || row.role === "assistant")
                .map((row) => {
                    const parts = normalizeParts(row.partsJson);

                    return {
                        id: row.id,
                        role: row.role,
                        text: extractText(parts),
                        createdAt: row.createdAt.toISOString(),
                    };
                })
                .filter((message) => message.text.length > 0),
        };
    }

    public async archiveThread(userId: string, threadId: string) {
        const thread = await this.getThread(userId, threadId);
        if (!thread) {
            return false;
        }

        await this.db
            .update(agentThreads)
            .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
            .where(eq(agentThreads.id, threadId));

        return true;
    }

    public async createMessage(input: {
        threadId: string;
        role: "user" | "assistant";
        status: "streaming" | "completed" | "failed" | "cancelled";
        parts: readonly TransitMessagePart[];
        failureCode?: string | null;
        failureMessage?: string | null;
        modelId?: string | null;
        tokenUsage?: unknown;
    }) {
        const now = new Date();
        const [message] = await this.db
            .insert(agentMessages)
            .values({
                id: randomUUID(),
                threadId: input.threadId,
                role: input.role,
                status: input.status,
                partsJson: input.parts,
                failureCode: input.failureCode ?? null,
                failureMessage: input.failureMessage ?? null,
                modelProvider: input.modelId ? "openai" : null,
                modelId: input.modelId ?? null,
                tokenUsageJson: input.tokenUsage ?? null,
            })
            .returning();
        if (!message) {
            throw new Error("Transit message creation failed.");
        }

        await this.db.update(agentThreads).set({ lastMessageAt: now, updatedAt: now }).where(eq(agentThreads.id, input.threadId));

        return message;
    }

    public async updateAssistantMessage(input: {
        messageId: string;
        status: "completed" | "failed" | "cancelled";
        parts: readonly TransitMessagePart[];
        failureCode?: string | null;
        failureMessage?: string | null;
        modelId?: string | null;
        tokenUsage?: unknown;
    }) {
        await this.db
            .update(agentMessages)
            .set({
                status: input.status,
                partsJson: input.parts,
                failureCode: input.failureCode ?? null,
                failureMessage: input.failureMessage ?? null,
                modelProvider: input.modelId ? "openai" : null,
                modelId: input.modelId ?? null,
                tokenUsageJson: input.tokenUsage ?? null,
                updatedAt: new Date(),
            })
            .where(eq(agentMessages.id, input.messageId));
    }

    public async createRun(input: { threadId: string; triggerMessageId: string; assistantMessageId: string; clientTurnId: string }) {
        const [run] = await this.db
            .insert(agentThreadRuns)
            .values({
                id: randomUUID(),
                threadId: input.threadId,
                triggerMessageId: input.triggerMessageId,
                assistantMessageId: input.assistantMessageId,
                clientTurnId: input.clientTurnId,
                status: "running",
            })
            .returning();
        if (!run) {
            throw new Error("Transit run creation failed.");
        }

        return run;
    }

    public async finalizeRun(runId: string, status: "completed" | "failed" | "cancelled" | "timed_out", errorMessage?: string | null) {
        const now = new Date();
        await this.db
            .update(agentThreadRuns)
            .set({
                status,
                errorMessage: errorMessage ?? null,
                completedAt: now,
                cancelledAt: status === "cancelled" ? now : null,
            })
            .where(eq(agentThreadRuns.id, runId));
    }

    public async getActiveRunForThread(threadId: string) {
        const [run] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.status, "running")))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        return run ?? null;
    }

    public async getActiveRunForUser(userId: string) {
        const [run] = await this.db
            .select({ run: agentThreadRuns })
            .from(agentThreadRuns)
            .innerJoin(agentThreads, eq(agentThreadRuns.threadId, agentThreads.id))
            .where(and(eq(agentThreads.createdByUserId, userId), eq(agentThreads.kind, "transit"), eq(agentThreadRuns.status, "running")))
            .orderBy(desc(agentThreadRuns.startedAt))
            .limit(1);

        return run?.run ?? null;
    }

    public async countRecentRuns(userId: string, since: Date) {
        const runs = await this.db
            .select({ id: agentThreadRuns.id })
            .from(agentThreadRuns)
            .innerJoin(agentThreads, eq(agentThreadRuns.threadId, agentThreads.id))
            .where(and(eq(agentThreads.createdByUserId, userId), eq(agentThreads.kind, "transit"), gte(agentThreadRuns.createdAt, since)));

        return runs.length;
    }

    public async findRunByClientTurnId(threadId: string, clientTurnId: string) {
        const [run] = await this.db
            .select()
            .from(agentThreadRuns)
            .where(and(eq(agentThreadRuns.threadId, threadId), eq(agentThreadRuns.clientTurnId, clientTurnId)))
            .limit(1);

        return run ?? null;
    }

    public async repairStaleRuns(startedBefore: Date) {
        const transitThreads = await this.db.select({ id: agentThreads.id }).from(agentThreads).where(eq(agentThreads.kind, "transit"));
        if (transitThreads.length === 0) {
            return;
        }
        const stale = await this.db
            .select()
            .from(agentThreadRuns)
            .where(
                and(
                    inArray(
                        agentThreadRuns.threadId,
                        transitThreads.map((thread) => thread.id),
                    ),
                    eq(agentThreadRuns.status, "running"),
                    lt(agentThreadRuns.startedAt, startedBefore),
                ),
            );
        if (stale.length === 0) {
            return;
        }

        const now = new Date();
        await this.db
            .update(agentThreadRuns)
            .set({ status: "timed_out", errorMessage: "Transit run expired.", completedAt: now })
            .where(
                inArray(
                    agentThreadRuns.id,
                    stale.map((run) => run.id),
                ),
            );
        const assistantIds = stale.map((run) => run.assistantMessageId).filter((messageId): messageId is string => messageId !== null);
        if (assistantIds.length > 0) {
            await this.db
                .update(agentMessages)
                .set({ status: "failed", failureCode: "timeout", failureMessage: "Transit run expired.", updatedAt: now })
                .where(inArray(agentMessages.id, assistantIds));
        }
    }

    public updateThreadFromBrief(threadId: string, brief: TransitBrief) {
        const leg = brief.legs[0];
        const origin = leg?.origin.value?.nameEn;
        const destination = leg?.destination.value?.nameEn;
        const title = origin && destination ? `${origin} → ${destination}` : "Rail journey";

        return this.db
            .update(agentThreads)
            .set({ title, titleStatus: "ready", summary: brief.summary, summaryStatus: "ready", updatedAt: new Date() })
            .where(eq(agentThreads.id, threadId));
    }
}
