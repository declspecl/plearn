"use client";

import { ChatMessageItem } from "./chat-message-item";
import type { ActiveChatRun } from "./chat-types";
import type { ChatMessage } from "@/lib/chat/types";

export function ChatMessageList(props: {
    messages: readonly ChatMessage[];
    activeRun: ActiveChatRun | null;
    onRetry: (messageId: string) => void;
    onCopyPartial: (message: ChatMessage) => void;
}) {
    if (props.messages.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-[color:var(--plearn-ink-4)]">Start a thread and ask about your Vietnamese learning data.</p>
            </div>
        );
    }

    return (
        <>
            {props.messages.map((message) => (
                <ChatMessageItem
                    key={message.id}
                    message={message}
                    isActiveRunMessage={props.activeRun?.assistantMessageId === message.id}
                    activeStatus={props.activeRun?.assistantMessageId === message.id ? props.activeRun.status : undefined}
                    onRetry={props.onRetry}
                    onCopyPartial={props.onCopyPartial}
                />
            ))}
        </>
    );
}
