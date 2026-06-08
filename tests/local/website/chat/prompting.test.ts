import { buildSystemPrompt, detectResponseLanguage } from "../../../../apps/website/src/lib/server/chat/runtime/prompting";
import { describe, expect, it } from "vitest";

const baseThread = {
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
} as const;

describe("chat prompting", () => {
    it("detects English turns even inside a Vietnamese learning thread", () => {
        expect(detectResponseLanguage({ message: "what have I learned recently?", threadLanguageCode: "vi" })).toBe("english");
    });

    it("detects Vietnamese turns from Vietnamese text", () => {
        expect(detectResponseLanguage({ message: "mình mới học gì gần đây vậy?", threadLanguageCode: "vi" })).toBe("vietnamese");
    });

    it("detects Japanese turns from Japanese text", () => {
        expect(detectResponseLanguage({ message: "最近何を勉強しましたか？", threadLanguageCode: "ja" })).toBe("japanese");
    });

    it("inherits English narration when the previous turn asked for text to annotate", () => {
        expect(
            detectResponseLanguage({
                message: "Bạn thích làm gì trong thời gian rảnh?",
                threadLanguageCode: "vi",
                recentUserMessages: ["hi", "what have I learned recently?", "can you annotate some text?"],
            }),
        ).toBe("english");
    });

    it("keeps English narration when an English instruction wraps quoted Vietnamese text", () => {
        expect(
            detectResponseLanguage({
                message: 'Can you annotate "Bạn thích làm gì trong thời gian rảnh?"',
                threadLanguageCode: "vi",
                recentUserMessages: ["what have I learned recently?"],
            }),
        ).toBe("english");
    });

    it("inherits English context for short ambiguous payload messages", () => {
        expect(
            detectResponseLanguage({
                message: "v",
                threadLanguageCode: "vi",
                recentUserMessages: ["can you annotate some text?"],
            }),
        ).toBe("english");
    });

    it("inherits English narration when a Japanese payload follows an English annotation request", () => {
        expect(
            detectResponseLanguage({
                message: "私は寿司を食べます。",
                threadLanguageCode: "ja",
                recentUserMessages: ["can you annotate some text?"],
            }),
        ).toBe("english");
    });

    it("builds an English narration instruction for English turns", () => {
        const prompt = buildSystemPrompt({
            thread: baseThread,
            summary: null,
            userMessage: "what have I learned recently?",
            recentUserMessages: ["hi"],
        });

        expect(prompt).toContain("Detected response language for this turn: english.");
        expect(prompt).toContain("write the surrounding explanation entirely in English");
        expect(prompt).toContain("Do not switch the main prose into Vietnamese.");
    });

    it("builds a Japanese narration instruction for Japanese turns", () => {
        const prompt = buildSystemPrompt({
            thread: { ...baseThread, languageCode: "ja" },
            summary: null,
            userMessage: "日本語で説明して",
            recentUserMessages: [],
        });

        expect(prompt).toContain("You are Plearn's Japanese learning assistant.");
        expect(prompt).toContain("Detected response language for this turn: japanese.");
        expect(prompt).toContain("write the surrounding explanation in Japanese");
    });
});
