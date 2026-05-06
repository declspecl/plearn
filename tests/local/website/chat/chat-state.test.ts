import { chatReducer, initialChatState } from "../../../../apps/website/src/components/learning/chat/chat-state";
import { describe, expect, it } from "vitest";

describe("chatReducer", () => {
    it("keeps a failed assistant turn visible when a streamed error arrives", () => {
        const stateAfterStart = chatReducer(initialChatState, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "run-start",
                runId: "run-1",
                threadId: "thread-1",
                assistantMessageId: "assistant-1",
                retryOfMessageId: null,
            },
        });

        const stateWithPlaceholder = chatReducer(stateAfterStart, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "assistant-message-created",
                runId: "run-1",
                threadId: "thread-1",
                assistantMessage: {
                    id: "assistant-1",
                    role: "assistant",
                    status: "streaming",
                    content: "",
                    parts: [],
                    failureCode: null,
                    failureMessage: null,
                    retryOfMessageId: null,
                    createdAt: "2025-01-01T00:00:00.000Z",
                    updatedAt: "2025-01-01T00:00:00.000Z",
                },
            },
        });

        const stateWithPartial = chatReducer(stateWithPlaceholder, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "text-delta",
                runId: "run-1",
                threadId: "thread-1",
                assistantMessageId: "assistant-1",
                text: "Partial answer",
            },
        });

        const failedState = chatReducer(stateWithPartial, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "error",
                runId: "run-1",
                threadId: "thread-1",
                assistantMessageId: "assistant-1",
                failureCode: "timeout",
                message: "The turn timed out.",
            },
        });

        const message = failedState.messagesByThreadId["thread-1"]?.find((item) => item.id === "assistant-1");
        expect(message?.status).toBe("failed");
        expect(message?.content).toBe("Partial answer");
        expect(message?.failureMessage).toBe("The turn timed out.");
        expect(failedState.activeRun?.status).toBe("timed_out");
    });

    it("clears active run state after completion", () => {
        const startedState = chatReducer(initialChatState, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "run-start",
                runId: "run-2",
                threadId: "thread-2",
                assistantMessageId: "assistant-2",
                retryOfMessageId: null,
            },
        });

        const finishedState = chatReducer(startedState, {
            type: "RUN_EVENT_RECEIVED",
            event: {
                type: "done",
                runId: "run-2",
                threadId: "thread-2",
                assistantMessageId: "assistant-2",
                finalStatus: "completed",
            },
        });

        expect(finishedState.activeRun).toBeNull();
        expect(finishedState.status).toBe("ready");
    });
});
