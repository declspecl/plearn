import { ChatThreadService } from "../../../../apps/website/src/lib/server/chat/thread-service";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../apps/website/src/lib/server/chat/runtime/helpers", () => ({
    getStaleRunGraceMs: () => 60_000,
}));

describe("ChatThreadService", () => {
    it("blocks rename while a run is active", async () => {
        const repository = {
            repairStaleRuns: vi.fn(),
            getThread: vi.fn(async () => ({
                id: "thread-1",
                createdByUserId: "user-1",
                languageCode: "vi",
                status: "active",
                title: "Thread",
                titleStatus: "ready",
                summary: null,
                summaryStatus: "pending",
                titleLockedByUser: false,
                lastMessageAt: new Date("2025-01-01T00:00:00.000Z"),
                archivedAt: null,
                createdAt: new Date("2025-01-01T00:00:00.000Z"),
                updatedAt: new Date("2025-01-01T00:00:00.000Z"),
            })),
            getActiveRun: vi.fn(async () => ({
                id: "run-1",
                threadId: "thread-1",
                triggerMessageId: "message-1",
                assistantMessageId: "message-2",
                clientTurnId: "turn-1",
                status: "running",
                errorMessage: null,
                startedAt: new Date("2025-01-01T00:00:00.000Z"),
                completedAt: null,
                cancelledAt: null,
                createdAt: new Date("2025-01-01T00:00:00.000Z"),
            })),
            updateThreadTitleByUser: vi.fn(),
        };

        const service = new ChatThreadService(repository as never);
        const result = await service.renameThread("user-1", "thread-1", "Renamed");

        expect(result).toEqual({
            ok: false,
            status: 409,
            code: "thread_locked",
            message: "A chat turn is still running in this thread.",
        });
        expect(repository.updateThreadTitleByUser).not.toHaveBeenCalled();
    });

    it("archives a thread when no run is active", async () => {
        const repository = {
            repairStaleRuns: vi.fn(),
            getThread: vi.fn(async () => ({
                id: "thread-1",
                createdByUserId: "user-1",
                languageCode: "vi",
                status: "active",
                title: "Thread",
                titleStatus: "ready",
                summary: null,
                summaryStatus: "pending",
                titleLockedByUser: false,
                lastMessageAt: new Date("2025-01-01T00:00:00.000Z"),
                archivedAt: null,
                createdAt: new Date("2025-01-01T00:00:00.000Z"),
                updatedAt: new Date("2025-01-01T00:00:00.000Z"),
            })),
            getActiveRun: vi.fn(async () => null),
            deleteThread: vi.fn(async () => undefined),
        };

        const service = new ChatThreadService(repository as never);
        const result = await service.deleteThread("user-1", "thread-1");

        expect(result).toEqual({ ok: true });
        expect(repository.deleteThread).toHaveBeenCalledWith("thread-1");
    });
});
