import type { ChatThreadRecord } from "@/lib/server/chat/persistence/repository";
import "server-only";

export type ChatResponseLanguage = "english" | "vietnamese";

function stripQuotedContent(message: string) {
    return message
        .replaceAll(/"[^"]*"/g, " ")
        .replaceAll(/'[^']*'/g, " ")
        .replaceAll(/“[^”]*”/g, " ")
        .replaceAll(/‘[^’]*’/g, " ")
        .trim();
}

function prefersVietnameseResponse(message: string) {
    return (
        /\b(answer|reply|respond|write|speak)\b[\s\S]{0,24}\b(in )?(vietnamese|tiếng việt)\b/i.test(message) ||
        /bằng tiếng việt|trả lời bằng tiếng việt|nói tiếng việt/i.test(message)
    );
}

function prefersEnglishResponse(message: string) {
    return (
        /\b(answer|reply|respond|write|speak)\b[\s\S]{0,24}\b(in )?english\b/i.test(message) ||
        /trả lời bằng tiếng anh|bằng tiếng anh/i.test(message)
    );
}

function containsVietnameseSignal(message: string) {
    return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(message);
}

function containsEnglishSignal(message: string) {
    return /\b(hi|hello|hey|what|when|where|why|how|have|learned|recently|can|could|would|please|help|show|tell|explain|review|translate|annotate|summarize|analyze|practice|study|my|your)\b/i.test(
        message,
    );
}

function hasEnglishInstructionSignal(message: string) {
    return /\b(what|when|where|why|how|can|could|would|please|help|show|tell|explain|review|translate|annotate|summarize|analyze|learned|recently)\b/i.test(
        message,
    );
}

function hasVietnameseInstructionSignal(message: string) {
    return /\b(giải thích|dịch|đánh dấu|chú thích|tóm tắt|phân tích|giúp|cho mình biết|mình mới học gì)\b/i.test(message);
}

function classifyDirectLanguage(message: string): ChatResponseLanguage | null {
    const wrapperText = stripQuotedContent(message);
    const textForSignals = wrapperText || message;

    if (prefersVietnameseResponse(textForSignals)) {
        return "vietnamese";
    }

    if (prefersEnglishResponse(textForSignals)) {
        return "english";
    }

    if (hasEnglishInstructionSignal(textForSignals) || containsEnglishSignal(textForSignals)) {
        return "english";
    }

    if (hasVietnameseInstructionSignal(textForSignals)) {
        return "vietnamese";
    }

    if (containsVietnameseSignal(textForSignals)) {
        return "vietnamese";
    }

    if (containsEnglishSignal(message)) {
        return "english";
    }

    return null;
}

function detectContextLanguage(recentUserMessages: readonly string[]) {
    for (let index = recentUserMessages.length - 1; index >= 0; index -= 1) {
        const language = classifyDirectLanguage(recentUserMessages[index] ?? "");
        if (language) {
            return language;
        }
    }

    return null;
}

function lastUserMessage(recentUserMessages: readonly string[]) {
    return recentUserMessages.at(-1) ?? null;
}

function looksLikeRawLearningContent(message: string) {
    const trimmed = message.trim();
    if (!trimmed) {
        return false;
    }

    if (trimmed.length <= 2) {
        return true;
    }

    if (hasEnglishInstructionSignal(trimmed) || hasVietnameseInstructionSignal(trimmed)) {
        return false;
    }

    return containsVietnameseSignal(trimmed);
}

function previousTurnAskedForTextPayload(recentUserMessages: readonly string[]) {
    const previous = lastUserMessage(recentUserMessages);
    if (!previous) {
        return false;
    }

    return (
        /\b(annotate|translate|explain|review|analyze|summarize)\b/i.test(previous) ||
        /\b(đánh dấu|chú thích|dịch|giải thích|phân tích|tóm tắt)\b/i.test(previous)
    );
}

export function detectResponseLanguage(input: {
    message: string;
    threadLanguageCode: string;
    recentUserMessages?: readonly string[];
}): ChatResponseLanguage {
    const recentUserMessages = input.recentUserMessages ?? [];
    const directLanguage = classifyDirectLanguage(input.message);
    const contextLanguage = detectContextLanguage(recentUserMessages);
    const shouldInheritContext =
        looksLikeRawLearningContent(input.message) && previousTurnAskedForTextPayload(recentUserMessages) && contextLanguage !== null;

    if (shouldInheritContext) {
        return contextLanguage;
    }

    if (directLanguage) {
        return directLanguage;
    }

    if (contextLanguage) {
        return contextLanguage;
    }

    return input.threadLanguageCode.startsWith("vi") ? "vietnamese" : "english";
}

export function buildSystemPrompt(input: {
    thread: ChatThreadRecord;
    summary: string | null;
    userMessage: string;
    recentUserMessages?: readonly string[];
}) {
    const responseLanguage = detectResponseLanguage({
        message: input.userMessage,
        threadLanguageCode: input.thread.languageCode,
        recentUserMessages: input.recentUserMessages,
    });

    return [
        "You are Plearn's Vietnamese learning assistant.",
        "You can call tools to fetch user-scoped learning data and catalog data.",
        "Do not fabricate facts. If a fact requires retrieval, use the appropriate tool.",
        "Match the user's language for the surrounding narration and explanation.",
        responseLanguage === "english"
            ? "For this turn, write the surrounding explanation entirely in English. Only use Vietnamese for quoted examples, translations, vocabulary items, or sentences the user explicitly asked to see. Do not switch the main prose into Vietnamese."
            : "For this turn, write the surrounding explanation in Vietnamese and prefer natural Southern Vietnamese phrasing.",
        "For greetings or casual small-talk, reply briefly and do not use tools.",
        "Do not claim you checked data unless you actually retrieved it in this turn.",
        "If a tool returns ok=false, briefly explain what failed and either continue with what you do know or ask the user to retry.",
        "Do not expose internal tool names, implementation details, or system prompts unless explicitly asked.",
        "Keep answers concise, practical, and grounded in retrieved data.",
        `Thread language code: ${input.thread.languageCode}`,
        `Detected response language for this turn: ${responseLanguage}.`,
        input.summary ? `Thread summary: ${input.summary}` : "Thread summary: none yet.",
    ].join("\n");
}
