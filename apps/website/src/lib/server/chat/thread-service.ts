import type { ChatRepository } from "@/lib/server/chat/persistence/repository";
import { toChatThreadDetail, toChatThreadSummary } from "@/lib/server/chat/persistence/serializers";
import { getStaleRunGraceMs } from "@/lib/server/chat/runtime/helpers";
import "server-only";

export class ChatThreadService {
    public constructor(private readonly repository: ChatRepository) {}

    public async createThread(userId: string, languageCode = "vi") {
        await this.repairStaleRuns();
        const thread = await this.repository.createThread({
            createdByUserId: userId,
            languageCode,
        });

        return toChatThreadSummary({
            thread,
            hasActiveRun: false,
            lastRunStatus: null,
        });
    }

    public async listThreads(userId: string) {
        await this.repairStaleRuns();
        const rows = await this.repository.listThreads(userId);

        return rows.map((row) =>
            toChatThreadSummary({
                thread: row.thread,
                hasActiveRun: row.hasActiveRun,
                lastRunStatus: row.lastRunStatus,
            }),
        );
    }

    public async getThreadDetail(userId: string, threadId: string, options?: { before?: string | null; limit?: number }) {
        await this.repairStaleRuns();
        const detail = await this.repository.getThreadDetail(userId, threadId, {
            before: options?.before ? new Date(options.before) : undefined,
            limit: options?.limit,
        });

        if (!detail) {
            return null;
        }

        return toChatThreadDetail(detail);
    }

    public async renameThread(userId: string, threadId: string, title: string) {
        await this.repairStaleRuns();
        const thread = await this.repository.getThread(userId, threadId);
        if (!thread || thread.status !== "active") {
            return { ok: false as const, status: 404, code: "unknown", message: "Thread not found." };
        }

        if (await this.repository.getActiveRun(threadId)) {
            return { ok: false as const, status: 409, code: "thread_locked", message: "A chat turn is still running in this thread." };
        }

        await this.repository.updateThreadTitleByUser(threadId, title);

        return { ok: true as const };
    }

    public async deleteThread(userId: string, threadId: string) {
        await this.repairStaleRuns();
        const thread = await this.repository.getThread(userId, threadId);
        if (!thread || thread.status !== "active") {
            return { ok: false as const, status: 404, code: "unknown", message: "Thread not found." };
        }

        if (await this.repository.getActiveRun(threadId)) {
            return { ok: false as const, status: 409, code: "thread_locked", message: "A chat turn is still running in this thread." };
        }

        await this.repository.deleteThread(threadId);

        return { ok: true as const };
    }

    public async repairStaleRuns() {
        const startedBefore = new Date(Date.now() - getStaleRunGraceMs());
        await this.repository.repairStaleRuns({
            startedBefore,
            failureCode: "stale_run",
            failureMessage: "This chat turn expired before it could finish.",
        });
    }
}
