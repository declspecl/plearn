"use client";

import { ChatComposer } from "./chat-composer";
import { ChatMessageList } from "./chat-message-list";
import { ChatThreadList } from "./chat-thread-list";
import { useChatController } from "./use-chat-controller";
import type { ChatMessage, ChatThreadSummary } from "@/lib/chat/types";
import { ChatsCircle, List, Plus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";

function shouldStickToBottom(element: HTMLDivElement) {
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    return distanceFromBottom < 120;
}

async function copyPartial(message: ChatMessage) {
    if (!message.content) {
        return;
    }

    await navigator.clipboard.writeText(message.content);
}

export function ChatShell({
    languageCode = "vi",
    languageName = "Vietnamese",
}: {
    readonly languageCode?: string;
    readonly languageName?: string;
}) {
    const controller = useChatController(languageCode);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
    const [threadToRename, setThreadToRename] = useState<ChatThreadSummary | null>(null);
    const [renameInput, setRenameInput] = useState("");

    useEffect(() => {
        const element = listRef.current;
        if (!element) {
            return;
        }

        if (shouldStickToBottom(element) || controller.state.activeRun) {
            element.scrollTo({ top: element.scrollHeight });
        }
    }, [controller.activeMessages, controller.state.activeRun]);

    return (
        <section className="relative flex h-full w-full flex-col md:flex-row">
            <div className="relative flex flex-1 flex-col overflow-hidden bg-[color:var(--plearn-bg-1)]">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--border)] px-4 md:hidden">
                    <div className="flex items-center gap-2">
                        <ChatsCircle className="h-4 w-4" />
                        <h1 className="text-sm font-medium">{languageName} Chat</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={controller.isThreadLocked}
                            onClick={() => void controller.createThread()}
                        >
                            <Plus weight="bold" className="h-4 w-4" />
                        </Button>
                        <Sheet>
                            <SheetTrigger render={<Button type="button" size="icon" variant="ghost" className="h-8 w-8" />}>
                                <List weight="bold" className="h-4 w-4" />
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <SheetHeader className="border-b border-[color:var(--border)] p-4 text-left">
                                    <SheetTitle className="text-sm">Threads</SheetTitle>
                                </SheetHeader>
                                <div className="flex-1 overflow-y-auto p-2">
                                    <ChatThreadList
                                        threads={controller.state.threads}
                                        activeThreadId={controller.state.activeThreadId}
                                        isLocked={controller.isThreadLocked}
                                        onSelect={(threadId) => void controller.loadThread(threadId)}
                                        onRename={(thread) => {
                                            setThreadToRename(thread);
                                            setRenameInput(thread.title);
                                        }}
                                        onDelete={(threadId) => setThreadToDelete(threadId)}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                <div ref={listRef} className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                    <ChatMessageList
                        messages={controller.activeMessages}
                        activeRun={controller.state.activeRun}
                        emptyText={`Start a thread and ask about your ${languageName} learning data.`}
                        onRetry={(messageId) => void controller.submit({ retryMessageId: messageId })}
                        onCopyPartial={(message) => void copyPartial(message)}
                    />
                    <div className="h-2 shrink-0" />
                </div>

                <ChatComposer
                    draft={controller.state.draft}
                    disabled={controller.isBusy || !controller.state.activeThreadId}
                    activeStatus={controller.state.activeRun?.status ?? null}
                    errorMessage={controller.state.errorMessage}
                    mutationError={controller.state.mutationError}
                    placeholder={`Ask about your catalog, progress, or ${languageName} usage...`}
                    onDraftChange={controller.setDraft}
                    onSubmit={() => void controller.submit()}
                />

                <Dialog open={Boolean(threadToDelete)} onOpenChange={(open) => !open && setThreadToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete thread</DialogTitle>
                            <DialogDescription>
                                This thread will be archived. This action cannot be undone from the chat UI.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (threadToDelete) {
                                        void controller.deleteThread(threadToDelete);
                                        setThreadToDelete(null);
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(threadToRename)} onOpenChange={(open) => !open && setThreadToRename(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename thread</DialogTitle>
                            <DialogDescription>Enter a new name for your chat thread.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={renameInput}
                                onChange={(event) => setRenameInput(event.target.value)}
                                autoFocus
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && threadToRename) {
                                        event.preventDefault();
                                        void controller.renameThread(threadToRename.id, renameInput);
                                        setThreadToRename(null);
                                    }
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                            <Button
                                onClick={() => {
                                    if (threadToRename) {
                                        void controller.renameThread(threadToRename.id, renameInput);
                                        setThreadToRename(null);
                                    }
                                }}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <aside className="hidden w-72 shrink-0 flex-col border-l border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] md:flex">
                <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
                    <h2 className="text-sm font-medium">Threads</h2>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={controller.isThreadLocked}
                        onClick={() => void controller.createThread()}
                    >
                        <Plus weight="bold" className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <ChatThreadList
                        threads={controller.state.threads}
                        activeThreadId={controller.state.activeThreadId}
                        isLocked={controller.isThreadLocked}
                        onSelect={(threadId) => void controller.loadThread(threadId)}
                        onRename={(thread) => {
                            setThreadToRename(thread);
                            setRenameInput(thread.title);
                        }}
                        onDelete={(threadId) => setThreadToDelete(threadId)}
                    />
                </div>
            </aside>
        </section>
    );
}
