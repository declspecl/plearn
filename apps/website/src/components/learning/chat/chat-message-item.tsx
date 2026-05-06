"use client";

import { ChatTurnStatus } from "./chat-turn-status";
import type { ChatToolActivity } from "./chat-types";
import type { ChatMessage } from "@/lib/chat/types";
import type { ChatUiStatus } from "@/lib/chat/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function getToolActivityLabel(toolName?: string) {
    switch (toolName) {
        case "searchLearnables": {
            return "Searching matching learnables...";
        }
        case "lookupLearnable": {
            return "Looking up that learnable...";
        }
        case "getLearnableDetails": {
            return "Loading examples and related notes...";
        }
        case "listRecentWorkspaces": {
            return "Checking recent study sessions...";
        }
        case "getWorkspace": {
            return "Opening a saved study session...";
        }
        case "annotateText": {
            return "Scanning text for known learnables...";
        }
        case "searchOccurrences": {
            return "Finding saved examples...";
        }
        case "getProgressSnapshot": {
            return "Reviewing catalog and workspace progress...";
        }
        case "searchThreadMemory": {
            return "Checking earlier thread context...";
        }
        default: {
            return "Using a learning tool...";
        }
    }
}

function getToolActivities(message: ChatMessage): readonly ChatToolActivity[] {
    const resultByToolCallId = new Map<string, ChatToolActivity>();

    for (const part of message.parts) {
        if (part.type === "tool-call") {
            resultByToolCallId.set(part.toolCallId, {
                id: part.toolCallId,
                label: getToolActivityLabel(part.toolName),
                status: "running",
            });
        }

        if (part.type === "tool-result") {
            resultByToolCallId.set(part.toolCallId, {
                id: part.toolCallId,
                label: getToolActivityLabel(part.toolName),
                status: "completed",
            });
        }

        if (part.type === "tool-error") {
            resultByToolCallId.set(part.toolCallId, {
                id: part.toolCallId,
                label: getToolActivityLabel(part.toolName),
                status: "failed",
                failureMessage: part.errorMessage,
            });
        }
    }

    return [...resultByToolCallId.values()];
}

export function ChatMessageItem(props: {
    message: ChatMessage;
    isActiveRunMessage: boolean;
    activeStatus?: ChatUiStatus;
    onRetry?: (messageId: string) => void;
    onCopyPartial?: (message: ChatMessage) => void;
}) {
    const toolActivities = getToolActivities(props.message);
    const showFailure = props.message.role === "assistant" && (props.message.status === "failed" || props.message.status === "cancelled");

    return (
        <article
            className={cn(
                "group relative mx-auto flex w-full max-w-3xl flex-col gap-2",
                props.message.role === "user" ? "items-end" : "items-start",
            )}
        >
            <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-medium text-[color:var(--plearn-ink-4)]">
                    {props.message.role === "assistant" ? "Assistant" : "You"}
                </span>
            </div>
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-5 py-3.5",
                    props.message.role === "assistant"
                        ? "text-foreground border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)]"
                        : "bg-foreground text-background",
                )}
            >
                {props.message.role === "assistant" ? (
                    <div className="space-y-3">
                        {props.isActiveRunMessage && props.activeStatus ? <ChatTurnStatus status={props.activeStatus} /> : null}
                        {showFailure ? (
                            <ChatTurnStatus
                                status={
                                    props.message.status === "cancelled"
                                        ? "cancelled"
                                        : props.message.failureCode === "timeout"
                                          ? "timed_out"
                                          : "failed"
                                }
                                message={props.message.failureMessage ?? "This turn failed."}
                                failedMessage={props.message}
                                onRetry={props.onRetry}
                                onCopyPartial={props.onCopyPartial}
                            />
                        ) : null}
                        {toolActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-line-soft)]/60 px-3 py-2 text-xs text-[color:var(--plearn-ink-3)]"
                            >
                                <span
                                    className={cn(
                                        "h-2 w-2 rounded-full",
                                        activity.status === "completed"
                                            ? "bg-emerald-500"
                                            : activity.status === "failed"
                                              ? "bg-red-400"
                                              : "animate-pulse bg-amber-500",
                                    )}
                                />
                                <span>{activity.label}</span>
                                {activity.failureMessage ? (
                                    <span className="ml-auto text-[10px] text-red-300">{activity.failureMessage}</span>
                                ) : null}
                            </div>
                        ))}
                        <div className="chat-markdown prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.message.content || "…"}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{props.message.content || "…"}</p>
                )}
            </div>
            {showFailure && props.message.content ? (
                <div className="flex gap-2 px-1">
                    {props.onRetry ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => props.onRetry?.(props.message.id)}>
                            Retry
                        </Button>
                    ) : null}
                    {props.onCopyPartial ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => props.onCopyPartial?.(props.message)}>
                            Copy partial
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}
