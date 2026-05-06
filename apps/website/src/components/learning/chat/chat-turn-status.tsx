"use client";

import type { ChatMessage, ChatUiStatus } from "@/lib/chat/types";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function getStatusLabel(status: ChatUiStatus) {
    switch (status) {
        case "connecting": {
            return "Connecting";
        }
        case "thinking": {
            return "Thinking";
        }
        case "using_tools": {
            return "Using tools";
        }
        case "writing": {
            return "Writing";
        }
        case "retrying": {
            return "Retrying";
        }
        case "failed": {
            return "Failed";
        }
        case "timed_out": {
            return "Timed out";
        }
        case "cancelled": {
            return "Cancelled";
        }
        case "completed": {
            return "Completed";
        }
        default: {
            return "Idle";
        }
    }
}

export function ChatTurnStatus(props: {
    status: ChatUiStatus;
    message?: string;
    failedMessage?: ChatMessage;
    onRetry?: (messageId: string) => void;
    onCopyPartial?: (message: ChatMessage) => void;
}) {
    const isTerminalFailure = props.status === "failed" || props.status === "timed_out" || props.status === "cancelled";

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span
                className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    props.status === "failed" || props.status === "timed_out"
                        ? "border-red-300/50 bg-red-400/10 text-red-200"
                        : props.status === "cancelled"
                          ? "border-slate-300/50 bg-slate-400/10 text-slate-200"
                          : props.status === "completed"
                            ? "border-emerald-300/50 bg-emerald-400/10 text-emerald-200"
                            : "border-[color:var(--border)] bg-[color:var(--plearn-line-soft)]/70 text-[color:var(--plearn-ink-3)]",
                )}
            >
                <span
                    className={cn(
                        "h-2 w-2 rounded-full",
                        props.status === "failed" || props.status === "timed_out"
                            ? "bg-red-400"
                            : props.status === "cancelled"
                              ? "bg-slate-400"
                              : props.status === "completed"
                                ? "bg-emerald-400"
                                : "animate-pulse bg-amber-400",
                    )}
                />
                <span>{props.message ?? getStatusLabel(props.status)}</span>
            </span>
            {isTerminalFailure && props.failedMessage && props.onRetry ? (
                <Button type="button" size="sm" variant="outline" onClick={() => props.onRetry?.(props.failedMessage!.id)}>
                    Retry
                </Button>
            ) : null}
            {isTerminalFailure && props.failedMessage?.content && props.onCopyPartial ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => props.onCopyPartial?.(props.failedMessage!)}>
                    Copy partial
                </Button>
            ) : null}
        </div>
    );
}
