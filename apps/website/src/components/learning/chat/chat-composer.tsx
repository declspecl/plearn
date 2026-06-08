"use client";

import type { ChatUiStatus } from "@/lib/chat/types";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import { Kbd, KbdGroup } from "~/components/ui/kbd";
import { Textarea } from "~/components/ui/textarea";

function labelForStatus(status: ChatUiStatus | null) {
    switch (status) {
        case "connecting": {
            return "Connecting...";
        }
        case "thinking": {
            return "Thinking...";
        }
        case "using_tools": {
            return "Using tools...";
        }
        case "writing": {
            return "Writing...";
        }
        case "retrying": {
            return "Retrying...";
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
            return "Ready";
        }
    }
}

export function ChatComposer(props: {
    draft: string;
    disabled: boolean;
    activeStatus: ChatUiStatus | null;
    errorMessage?: string;
    mutationError?: string;
    placeholder?: string;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
}) {
    return (
        <div className="relative shrink-0 bg-[color:var(--plearn-bg-1)] p-4 pt-2 md:p-6 md:pt-4">
            <div className="pointer-events-none absolute right-0 bottom-full left-0 h-16 bg-gradient-to-t from-[color:var(--plearn-bg-1)] to-transparent" />
            <div className="mx-auto max-w-3xl">
                <div className="focus-within:ring-ring relative flex items-end rounded-2xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] shadow-lg transition-all focus-within:border-transparent focus-within:ring-2">
                    <Textarea
                        unstyled
                        value={props.draft}
                        onChange={(event) => props.onDraftChange(event.target.value)}
                        onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !props.disabled) {
                                event.preventDefault();
                                props.onSubmit();
                            }
                        }}
                        placeholder={props.placeholder ?? "Ask about your catalog, progress, or language usage..."}
                        className="max-h-64 min-h-[56px] w-full bg-transparent px-4 py-4 text-sm"
                        style={{ resize: "none" }}
                        disabled={props.disabled}
                    />
                    <div className="flex h-[56px] shrink-0 items-center pr-2">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-xl"
                            onClick={props.onSubmit}
                            disabled={!props.draft.trim() || props.disabled}
                        >
                            {props.disabled ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <PaperPlaneRight weight="fill" className="h-5 w-5" />
                            )}
                            <span className="sr-only">Send message</span>
                        </Button>
                    </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--plearn-ink-4)]">
                        <KbdGroup>
                            <Kbd className="h-4 min-w-4 px-1 text-[10px]">Cmd</Kbd>
                            <span className="opacity-50">/</span>
                            <Kbd className="h-4 min-w-4 px-1 text-[10px]">Ctrl</Kbd>
                        </KbdGroup>
                        <span>+</span>
                        <Kbd className="h-4 min-w-4 px-1 text-[10px]">Enter</Kbd>
                        <span>to send</span>
                    </div>
                    <p className="text-[10px] text-[color:var(--plearn-ink-4)]">{labelForStatus(props.activeStatus)}</p>
                    {props.errorMessage ? <p className="text-[10px] text-red-400">{props.errorMessage}</p> : null}
                    {props.mutationError ? <p className="text-[10px] text-red-400">{props.mutationError}</p> : null}
                </div>
            </div>
        </div>
    );
}
