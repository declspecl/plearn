"use client";

import type { ChatThreadSummary } from "@/lib/chat/types";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function ChatThreadList(props: {
    threads: readonly ChatThreadSummary[];
    activeThreadId: string | null;
    isLocked: boolean;
    onSelect: (threadId: string) => void;
    onRename: (thread: ChatThreadSummary) => void;
    onDelete: (threadId: string) => void;
}) {
    return (
        <div className="space-y-1">
            {props.threads.map((thread) => (
                <div
                    key={thread.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                        "group flex w-full cursor-pointer flex-col rounded-md px-3 py-2 text-left transition-colors",
                        props.activeThreadId === thread.id
                            ? "text-foreground bg-[color:var(--plearn-line-soft)]"
                            : "text-[color:var(--plearn-ink-3)] hover:bg-[color:var(--plearn-line-soft)]/50",
                        props.isLocked && props.activeThreadId !== thread.id ? "cursor-not-allowed opacity-60" : "",
                    )}
                    onClick={() => {
                        if (!props.isLocked || props.activeThreadId === thread.id) {
                            props.onSelect(thread.id);
                        }
                    }}
                    onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.key === " ") && (!props.isLocked || props.activeThreadId === thread.id)) {
                            event.preventDefault();
                            props.onSelect(thread.id);
                        }
                    }}
                >
                    <div className="flex w-full items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium">{thread.title || "New chat"}</p>
                            <p className="mt-1 line-clamp-1 text-xs opacity-70">{thread.summary?.trim() || "No summary yet"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {thread.hasActiveRun ? (
                                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                                    Live
                                </span>
                            ) : null}
                            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="hover:text-foreground text-[color:var(--plearn-ink-4)]"
                                    disabled={props.isLocked}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        props.onRename(thread);
                                    }}
                                    aria-label="Rename thread"
                                >
                                    <PencilSimple weight="bold" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="text-[color:var(--plearn-ink-4)] hover:text-red-400"
                                    disabled={props.isLocked}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        props.onDelete(thread.id);
                                    }}
                                    aria-label="Delete thread"
                                >
                                    <Trash weight="bold" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
