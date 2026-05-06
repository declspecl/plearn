"use client";

import { List, Plus, PaperPlaneRight, Trash, PencilSimple } from "@phosphor-icons/react";
import { startTransition, useEffect, useReducer, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

type Sender = "user" | "assistant";

interface ChatMessagePart {
    readonly type: string;
    readonly text?: string;
    readonly toolCallId?: string;
    readonly toolName?: string;
    readonly input?: unknown;
    readonly output?: unknown;
}

interface ChatMessage {
    readonly id: string;
    readonly sender: Sender;
    readonly content: string;
    readonly parts?: readonly ChatMessagePart[];
}

interface ChatThread {
    readonly id: string;
    readonly title: string;
    readonly summary: string | null;
    readonly lastMessageAt: string;
}

type ChatState = {
    readonly status: "loading" | "ready" | "submitting" | "streaming" | "error";
    readonly draft: string;
    readonly threads: readonly ChatThread[];
    readonly activeThreadId: string | null;
    readonly messagesByThreadId: Readonly<Record<string, readonly ChatMessage[]>>;
    readonly errorMessage?: string;
};

type ChatEvent =
    | { readonly type: "LOAD_STARTED" }
    | {
          readonly type: "THREADS_LOADED";
          readonly threads: readonly ChatThread[];
          readonly activeThreadId: string | null;
          readonly initialMessages?: readonly ChatMessage[];
      }
    | { readonly type: "THREAD_SELECTED"; readonly threadId: string; readonly messages: readonly ChatMessage[] }
    | { readonly type: "THREAD_CREATED"; readonly thread: ChatThread }
    | { readonly type: "DRAFT_CHANGED"; readonly value: string }
    | { readonly type: "SUBMIT_STARTED"; readonly threadId: string; readonly userMessage: string; readonly assistantMessageId: string }
    | { readonly type: "STREAM_CHUNK"; readonly threadId: string; readonly assistantMessageId: string; readonly chunk: string }
    | { readonly type: "STREAM_TOOL_CALL"; readonly threadId: string; readonly assistantMessageId: string; readonly part: ChatMessagePart }
    | {
          readonly type: "STREAM_TOOL_RESULT";
          readonly threadId: string;
          readonly assistantMessageId: string;
          readonly part: ChatMessagePart;
      }
    | { readonly type: "STREAM_FINISHED" }
    | { readonly type: "STREAM_FAILED"; readonly message: string }
    | { readonly type: "THREAD_PROMOTED"; readonly oldId: string; readonly newThread: ChatThread }
    | { readonly type: "THREAD_DELETED"; readonly threadId: string }
    | { readonly type: "THREAD_RENAMED"; readonly threadId: string; readonly newTitle: string };

const initialState: ChatState = {
    status: "loading",
    draft: "",
    threads: [],
    activeThreadId: null,
    messagesByThreadId: {},
};

function appendChunk(messages: readonly ChatMessage[], assistantMessageId: string, chunk: string): readonly ChatMessage[] {
    return messages.map((message) => (message.id === assistantMessageId ? { ...message, content: message.content + chunk } : message));
}

function appendPart(messages: readonly ChatMessage[], assistantMessageId: string, part: ChatMessagePart): readonly ChatMessage[] {
    return messages.map((message) => {
        if (message.id !== assistantMessageId) {
            return message;
        }

        const parts = message.parts ?? [];
        const alreadyExists = parts.some(
            (existing) => existing.type === part.type && existing.toolCallId === part.toolCallId && existing.toolName === part.toolName,
        );

        return alreadyExists ? message : { ...message, parts: [...parts, part] };
    });
}

function getToolActivityLabel(toolName?: string) {
    switch (toolName) {
        case "searchLearnables":
        case "search_learnables":
            return "Searching previously learned phrases...";
        case "lookupLearnable":
        case "lookup_learnable":
            return "Looking up that phrase in your learning catalog...";
        case "getLearnableDetails":
        case "get_learnable_details":
            return "Pulling examples and related notes...";
        case "listRecentWorkspaces":
        case "list_recent_workspaces":
            return "Checking your recent study sessions...";
        case "getWorkspace":
        case "get_workspace":
            return "Opening a saved study session...";
        case "annotateText":
        case "annotate_text":
            return "Scanning the text for phrases you already know...";
        case "searchOccurrences":
        case "search_occurrences":
            return "Finding saved example sentences...";
        case "getProgressSnapshot":
        case "get_progress_snapshot":
            return "Reviewing your recent learning progress...";
        case "searchThreadMemory":
        case "search_thread_memory":
            return "Checking earlier context from this thread...";
        default:
            return "Working with your learning data...";
    }
}

function getToolActivities(parts?: readonly ChatMessagePart[]) {
    if (!parts?.length) {
        return [];
    }

    const resultIds = new Set(
        parts.filter((part) => part.type === "tool-result" && typeof part.toolCallId === "string").map((part) => part.toolCallId as string),
    );

    return parts
        .filter((part) => part.type === "tool-call" && typeof part.toolCallId === "string")
        .map((part) => ({
            id: part.toolCallId as string,
            label: getToolActivityLabel(part.toolName),
            status: resultIds.has(part.toolCallId as string) ? "done" : "running",
        }));
}

function toChatMessage(message: {
    readonly id: string;
    readonly role: "user" | "assistant";
    readonly content: string;
    readonly parts?: readonly ChatMessagePart[];
}) {
    return {
        id: message.id,
        sender: message.role === "user" ? "user" : "assistant",
        content: message.content,
        parts: message.parts,
    } satisfies ChatMessage;
}

function reducer(state: ChatState, event: ChatEvent): ChatState {
    switch (event.type) {
        case "LOAD_STARTED": {
            return { ...state, status: "loading" };
        }
        case "THREADS_LOADED": {
            const nextMessagesByThreadId =
                event.activeThreadId && event.initialMessages
                    ? { ...state.messagesByThreadId, [event.activeThreadId]: event.initialMessages }
                    : state.messagesByThreadId;

            return {
                ...state,
                status: "ready",
                threads: event.threads,
                activeThreadId: event.activeThreadId,
                messagesByThreadId: nextMessagesByThreadId,
                errorMessage: undefined,
            };
        }
        case "THREAD_SELECTED": {
            return {
                ...state,
                status: "ready",
                activeThreadId: event.threadId,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: event.messages,
                },
                errorMessage: undefined,
            };
        }
        case "THREAD_CREATED": {
            return {
                ...state,
                status: "ready",
                threads: [event.thread, ...state.threads],
                activeThreadId: event.thread.id,
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.thread.id]: [
                        {
                            id: "intro",
                            sender: "assistant",
                            content: "Ask me about your catalog, Vietnamese usage, related expressions, or learning progress.",
                        },
                    ],
                },
            };
        }
        case "DRAFT_CHANGED": {
            return { ...state, draft: event.value };
        }
        case "SUBMIT_STARTED": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "submitting",
                draft: "",
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: [
                        ...existing,
                        { id: `user-${Date.now()}`, sender: "user", content: event.userMessage },
                        { id: event.assistantMessageId, sender: "assistant", content: "" },
                    ],
                },
            };
        }
        case "STREAM_CHUNK": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "streaming",
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: appendChunk(existing, event.assistantMessageId, event.chunk),
                },
            };
        }
        case "STREAM_TOOL_CALL": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "streaming",
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: appendPart(existing, event.assistantMessageId, event.part),
                },
            };
        }
        case "STREAM_TOOL_RESULT": {
            const existing = state.messagesByThreadId[event.threadId] ?? [];

            return {
                ...state,
                status: "streaming",
                messagesByThreadId: {
                    ...state.messagesByThreadId,
                    [event.threadId]: appendPart(existing, event.assistantMessageId, event.part),
                },
            };
        }
        case "STREAM_FINISHED": {
            return { ...state, status: "ready", errorMessage: undefined };
        }
        case "STREAM_FAILED": {
            return { ...state, status: "error", errorMessage: event.message };
        }
        case "THREAD_PROMOTED": {
            const nextMessages = { ...state.messagesByThreadId, [event.newThread.id]: state.messagesByThreadId[event.oldId] ?? [] };

            return {
                ...state,
                activeThreadId: state.activeThreadId === event.oldId ? event.newThread.id : state.activeThreadId,
                threads: state.threads.map((t) => (t.id === event.oldId ? event.newThread : t)),
                messagesByThreadId: nextMessages,
            };
        }
        case "THREAD_DELETED": {
            const nextThreads = state.threads.filter((t) => t.id !== event.threadId);

            return {
                ...state,
                threads: nextThreads,
                activeThreadId: state.activeThreadId === event.threadId ? (nextThreads[0]?.id ?? null) : state.activeThreadId,
            };
        }
        case "THREAD_RENAMED": {
            return {
                ...state,
                threads: state.threads.map((t) => (t.id === event.threadId ? { ...t, title: event.newTitle } : t)),
            };
        }
        default: {
            return state;
        }
    }
}

function makeId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VietnameseChatbot() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
    const [threadToRename, setThreadToRename] = useState<{ id: string; title: string } | null>(null);
    const [renameInput, setRenameInput] = useState("");
    const activeThreadId = state.activeThreadId;
    const activeMessages = activeThreadId ? (state.messagesByThreadId[activeThreadId] ?? []) : [];

    async function loadThread(threadId: string) {
        const response = await fetch(`/api/chat/threads/${threadId}`, { method: "GET" });
        if (!response.ok) {
            dispatch({ type: "STREAM_FAILED", message: "Unable to load thread." });

            return;
        }
        const json = (await response.json()) as {
            readonly messages: readonly {
                readonly id: string;
                readonly role: "user" | "assistant";
                readonly content: string;
                readonly parts?: readonly ChatMessagePart[];
            }[];
        };
        dispatch({
            type: "THREAD_SELECTED",
            threadId,
            messages: json.messages.map(toChatMessage),
        });
    }

    async function loadThreads() {
        dispatch({ type: "LOAD_STARTED" });
        const response = await fetch("/api/chat/threads", { method: "GET" });
        if (!response.ok) {
            dispatch({ type: "STREAM_FAILED", message: "Unable to load threads." });

            return;
        }
        const json = (await response.json()) as { readonly threads: readonly ChatThread[] };
        const first = json.threads[0];
        if (!first) {
            dispatch({ type: "THREADS_LOADED", threads: [], activeThreadId: null });
            await createThread();

            return;
        }

        const details = await fetch(`/api/chat/threads/${first.id}`, { method: "GET" });
        const detailsJson = details.ok
            ? ((await details.json()) as {
                  readonly messages: readonly {
                      readonly id: string;
                      readonly role: "user" | "assistant";
                      readonly content: string;
                      readonly parts?: readonly ChatMessagePart[];
                  }[];
              })
            : null;

        dispatch({
            type: "THREADS_LOADED",
            threads: json.threads,
            activeThreadId: first.id,
            initialMessages: detailsJson?.messages.map(toChatMessage) ?? [],
        });
    }

    async function createThread() {
        if (state.threads.some((t) => t.id === "new")) {
            dispatch({ type: "THREAD_SELECTED", threadId: "new", messages: state.messagesByThreadId["new"] ?? [] });

            return;
        }
        const newThread: ChatThread = {
            id: "new",
            title: "New chat",
            summary: null,
            lastMessageAt: new Date().toISOString(),
        };
        dispatch({ type: "THREAD_CREATED", thread: newThread });
    }

    async function executeDeleteThread(threadId: string) {
        try {
            const response = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
            if (response.ok) {
                dispatch({ type: "THREAD_DELETED", threadId });
                if (state.activeThreadId === threadId && state.threads.length <= 1) {
                    await createThread();
                }
            }
        } catch {
            /* ignore error */
        }
    }

    async function executeRenameThread(threadId: string, newTitle: string) {
        if (!newTitle || newTitle.trim() === "") return;

        try {
            const response = await fetch(`/api/chat/threads/${threadId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (response.ok) {
                dispatch({ type: "THREAD_RENAMED", threadId, newTitle: newTitle.trim() });
            }
        } catch {
            /* ignore error */
        }
    }

    async function submit() {
        if (!activeThreadId || state.status === "submitting" || state.status === "streaming") return;
        const userMessage = state.draft.trim();
        if (!userMessage) return;

        let targetThreadId = activeThreadId;

        if (targetThreadId === "new") {
            dispatch({ type: "LOAD_STARTED" });
            try {
                const response = await fetch("/api/chat/threads", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ languageCode: "vi" }),
                });
                if (!response.ok) throw new Error("Failed to create thread");
                const json = (await response.json()) as { readonly thread: ChatThread };
                targetThreadId = json.thread.id;
                dispatch({ type: "THREAD_PROMOTED", oldId: "new", newThread: json.thread });
            } catch {
                dispatch({ type: "STREAM_FAILED", message: "Failed to create thread." });

                return;
            }
        }

        const assistantMessageId = makeId("assistant");
        dispatch({ type: "SUBMIT_STARTED", threadId: targetThreadId, userMessage, assistantMessageId });

        try {
            const response = await fetch(`/api/chat/threads/${targetThreadId}/messages`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok || !response.body) {
                dispatch({
                    type: "STREAM_FAILED",
                    message: response.status === 401 ? "You are not authenticated." : "Chat request failed.",
                });

                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const event = JSON.parse(line) as
                        | { readonly type: "text-delta"; readonly text: string }
                        | {
                              readonly type: "tool-call";
                              readonly toolCallId: string;
                              readonly toolName: string;
                              readonly input?: unknown;
                          }
                        | {
                              readonly type: "tool-result";
                              readonly toolCallId: string;
                              readonly toolName: string;
                              readonly output?: unknown;
                          }
                        | { readonly type: "done" }
                        | { readonly type: "error"; readonly message?: string };

                    if (event.type === "text-delta") {
                        dispatch({ type: "STREAM_CHUNK", threadId: targetThreadId, assistantMessageId, chunk: event.text });
                    } else if (event.type === "tool-call") {
                        dispatch({
                            type: "STREAM_TOOL_CALL",
                            threadId: targetThreadId,
                            assistantMessageId,
                            part: {
                                type: "tool-call",
                                toolCallId: event.toolCallId,
                                toolName: event.toolName,
                                input: event.input,
                            },
                        });
                    } else if (event.type === "tool-result") {
                        dispatch({
                            type: "STREAM_TOOL_RESULT",
                            threadId: targetThreadId,
                            assistantMessageId,
                            part: {
                                type: "tool-result",
                                toolCallId: event.toolCallId,
                                toolName: event.toolName,
                                output: event.output,
                            },
                        });
                    } else if (event.type === "error") {
                        dispatch({ type: "STREAM_FAILED", message: event.message ?? "Chat request failed." });
                    }

                    startTransition(() => {
                        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
                    });
                }
            }

            dispatch({ type: "STREAM_FINISHED" });
            await loadThread(targetThreadId);
            void loadThreads();
        } catch {
            dispatch({ type: "STREAM_FAILED", message: "Network error while streaming assistant response." });
        }
    }

    useEffect(() => {
        void loadThreads();
    }, []);

    const isBusy = state.status === "submitting" || state.status === "streaming" || state.status === "loading";

    return (
        <section className="relative flex h-full w-full flex-col md:flex-row">
            {/* Main Chat Area */}
            <div className="relative flex flex-1 flex-col overflow-hidden bg-[color:var(--plearn-bg-1)]">
                {/* Mobile Header with Threads Sheet */}
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--border)] px-4 md:hidden">
                    <h1 className="text-sm font-medium">Vietnamese Chat</h1>
                    <div className="flex items-center gap-2">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => void createThread()}>
                            <Plus weight="bold" className="h-4 w-4" />
                        </Button>
                        <Sheet>
                            <SheetTrigger render={<Button type="button" size="icon" variant="ghost" className="h-8 w-8" />}>
                                <List weight="bold" className="h-4 w-4" />
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0">
                                <SheetHeader className="border-b border-[color:var(--border)] p-4 text-left">
                                    <SheetTitle className="text-sm">Threads</SheetTitle>
                                </SheetHeader>
                                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                                    {state.threads.map((thread) => (
                                        <SheetTrigger
                                            key={thread.id}
                                            render={
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "group flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors",
                                                        state.activeThreadId === thread.id
                                                            ? "text-foreground bg-[color:var(--plearn-line-soft)]"
                                                            : "text-[color:var(--plearn-ink-3)] hover:bg-[color:var(--plearn-line-soft)]/50",
                                                    )}
                                                    onClick={() => void loadThread(thread.id)}
                                                />
                                            }
                                        >
                                            <div className="flex w-full items-start justify-between gap-2">
                                                <p className="line-clamp-1 flex-1 text-sm font-medium">{thread.title || "New chat"}</p>
                                                {thread.id !== "new" && (
                                                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                                        <Button
                                                            type="button"
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            className="hover:text-foreground text-[color:var(--plearn-ink-4)]"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setThreadToRename({ id: thread.id, title: thread.title });
                                                                setRenameInput(thread.title);
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
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setThreadToDelete(thread.id);
                                                            }}
                                                            aria-label="Delete thread"
                                                        >
                                                            <Trash weight="bold" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-1 line-clamp-1 text-xs opacity-70">
                                                {thread.summary?.trim() || "No summary yet"}
                                            </p>
                                        </SheetTrigger>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Messages List */}
                <div ref={listRef} className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                    {activeMessages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <p className="text-sm text-[color:var(--plearn-ink-4)]">Select or create a thread to start.</p>
                        </div>
                    ) : (
                        activeMessages.map((message) => (
                            <article
                                key={message.id}
                                className={cn(
                                    "group relative mx-auto flex w-full max-w-3xl flex-col gap-2",
                                    message.sender === "user" ? "items-end" : "items-start",
                                )}
                            >
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[11px] font-medium text-[color:var(--plearn-ink-4)]">
                                        {message.sender === "assistant" ? "Assistant" : "You"}
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-5 py-3.5",
                                        message.sender === "assistant"
                                            ? "text-foreground border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)]"
                                            : "bg-foreground text-background",
                                    )}
                                >
                                    {message.sender === "assistant" ? (
                                        <div className="space-y-3">
                                            {getToolActivities(message.parts).map((activity) => (
                                                <div
                                                    key={activity.id}
                                                    className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-line-soft)]/60 px-3 py-2 text-xs text-[color:var(--plearn-ink-3)]"
                                                >
                                                    <span
                                                        className={cn(
                                                            "h-2 w-2 rounded-full",
                                                            activity.status === "done" ? "bg-emerald-500" : "animate-pulse bg-amber-500",
                                                        )}
                                                    />
                                                    <span>{activity.label}</span>
                                                </div>
                                            ))}
                                            <div className="chat-markdown prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "…"}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content || "…"}</p>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                    <div className="h-2 shrink-0" />
                </div>

                {/* Bottom Input Area */}
                <div className="relative shrink-0 bg-[color:var(--plearn-bg-1)] p-4 pt-2 md:p-6 md:pt-4">
                    <div className="pointer-events-none absolute right-0 bottom-full left-0 h-16 bg-gradient-to-t from-[color:var(--plearn-bg-1)] to-transparent" />
                    <div className="mx-auto max-w-3xl">
                        <div className="focus-within:ring-ring relative flex items-end rounded-2xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] shadow-lg transition-all focus-within:border-transparent focus-within:ring-2">
                            <Textarea
                                value={state.draft}
                                onChange={(event) => dispatch({ type: "DRAFT_CHANGED", value: event.target.value })}
                                onKeyDown={(event) => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !isBusy) {
                                        event.preventDefault();
                                        void submit();
                                    }
                                }}
                                placeholder="Ask about your catalog, progress, or Vietnamese usage..."
                                className="max-h-64 min-h-[56px] w-full resize-none border-0 bg-transparent px-4 py-4 text-sm focus-visible:ring-0"
                                disabled={isBusy || !activeThreadId}
                            />
                            <div className="flex h-[56px] shrink-0 items-center pr-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl"
                                    onClick={() => void submit()}
                                    disabled={!state.draft.trim() || isBusy || !activeThreadId}
                                >
                                    {isBusy ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : (
                                        <PaperPlaneRight weight="fill" className="h-5 w-5" />
                                    )}
                                    <span className="sr-only">Send message</span>
                                </Button>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between px-2">
                            <p className="text-[10px] text-[color:var(--plearn-ink-4)]">Cmd/Ctrl + Enter to send</p>
                            {state.status === "error" ? (
                                <p className="text-[10px] text-red-400" role="status">
                                    {state.errorMessage}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
                <Dialog open={!!threadToDelete} onOpenChange={(open) => !open && setThreadToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete thread</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this thread? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (threadToDelete) {
                                        void executeDeleteThread(threadToDelete);
                                        setThreadToDelete(null);
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!threadToRename} onOpenChange={(open) => !open && setThreadToRename(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename thread</DialogTitle>
                            <DialogDescription>Enter a new name for your chat thread.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && threadToRename) {
                                        e.preventDefault();
                                        void executeRenameThread(threadToRename.id, renameInput);
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
                                        void executeRenameThread(threadToRename.id, renameInput);
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

            {/* Desktop Sidebar (Right-aligned) */}
            <aside className="hidden w-64 shrink-0 flex-col border-l border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] md:flex">
                <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
                    <h2 className="text-sm font-medium">Threads</h2>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => void createThread()}>
                        <Plus weight="bold" className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto p-2">
                    {state.threads.map((thread) => (
                        <div
                            key={thread.id}
                            role="button"
                            tabIndex={0}
                            className={cn(
                                "group flex w-full cursor-pointer flex-col rounded-md px-3 py-2 text-left transition-colors",
                                state.activeThreadId === thread.id
                                    ? "text-foreground bg-[color:var(--plearn-line-soft)]"
                                    : "text-[color:var(--plearn-ink-3)] hover:bg-[color:var(--plearn-line-soft)]/50",
                            )}
                            onClick={() => void loadThread(thread.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    void loadThread(thread.id);
                                }
                            }}
                        >
                            <div className="flex w-full items-start justify-between gap-2">
                                <p className="line-clamp-1 flex-1 text-sm font-medium">{thread.title || "New chat"}</p>
                                {thread.id !== "new" && (
                                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                        <Button
                                            type="button"
                                            size="icon-xs"
                                            variant="ghost"
                                            className="hover:text-foreground text-[color:var(--plearn-ink-4)]"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setThreadToRename({ id: thread.id, title: thread.title });
                                                setRenameInput(thread.title);
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setThreadToDelete(thread.id);
                                            }}
                                            aria-label="Delete thread"
                                        >
                                            <Trash weight="bold" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs opacity-70">{thread.summary?.trim() || "No summary yet"}</p>
                        </div>
                    ))}
                </div>
            </aside>
        </section>
    );
}
