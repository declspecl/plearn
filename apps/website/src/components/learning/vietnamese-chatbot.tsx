"use client";

import { ChatShell } from "./chat/chat-shell";

export function VietnameseChatbot() {
    return <ChatShell languageCode="vi" languageName="Vietnamese" />;
}

export function JapaneseChatbot() {
    return <ChatShell languageCode="ja" languageName="Japanese" />;
}
