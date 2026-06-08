"use client";

import { chatReducer, initialChatState } from "./chat-state";
import type { ChatController } from "./chat-types";
import type { ChatMutationError, ChatStreamEvent, ChatThreadDetail, ChatThreadSummary } from "@/lib/chat/types";
import { startTransition, useEffect, useEffectEvent, useMemo, useReducer, useRef } from "react";

function makeClientTurnId() {
    return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
}

async function parseJsonSafe<T>(response: Response) {
    return (await response.json().catch(() => null)) as T | null;
}

function didRecoverClosedStream(detail: ChatThreadDetail | null, assistantMessageId: string | null) {
    if (!detail || detail.activeRunId) {
        return false;
    }

    if (!assistantMessageId) {
        return detail.messages.some((message) => message.role === "assistant" && message.status !== "streaming");
    }

    return detail.messages.some((message) => message.id === assistantMessageId && message.status !== "streaming");
}

export function useChatController(languageCode = "vi"): ChatController {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const stateRef = useRef(state);
    const textBufferRef = useRef("");
    const flushTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const textBufferMetaRef = useRef<{ runId: string; threadId: string; assistantMessageId: string } | null>(null);

    stateRef.current = state;

    const flushBufferedText = useEffectEvent(() => {
        if (!textBufferMetaRef.current || !textBufferRef.current) {
            return;
        }

        const event: ChatStreamEvent = {
            type: "text-delta",
            runId: textBufferMetaRef.current.runId,
            threadId: textBufferMetaRef.current.threadId,
            assistantMessageId: textBufferMetaRef.current.assistantMessageId,
            text: textBufferRef.current,
        };
        textBufferRef.current = "";
        textBufferMetaRef.current = null;
        startTransition(() => {
            dispatch({ type: "RUN_EVENT_RECEIVED", event });
        });
    });

    const scheduleTextFlush = useEffectEvent(() => {
        if (flushTimerRef.current !== null) {
            return;
        }

        flushTimerRef.current = globalThis.setTimeout(() => {
            flushTimerRef.current = null;
            flushBufferedText();
        }, 40);
    });

    const loadThread = useEffectEvent(async (threadId: string) => {
        if (stateRef.current.activeRun && stateRef.current.activeRun.threadId !== threadId) {
            dispatch({ type: "MUTATION_ERROR", message: "Wait for the current chat turn to finish before switching threads." });

            return null;
        }

        try {
            dispatch({ type: "THREAD_SELECTED", threadId });
            const response = await fetch(`/api/chat/threads/${threadId}?limit=60`, { method: "GET" });
            if (!response.ok) {
                dispatch({ type: "RUN_FAILED", message: "Unable to load thread." });

                return null;
            }

            const detail = (await response.json()) as ChatThreadDetail;
            startTransition(() => {
                dispatch({ type: "THREAD_DETAIL_LOADED", detail });
            });

            return detail;
        } catch (error) {
            if (isAbortError(error)) {
                return null;
            }

            dispatch({ type: "RUN_FAILED", message: "Unable to load thread." });

            return null;
        }
    });

    const loadThreads = useEffectEvent(async (preferredThreadId?: string | null) => {
        try {
            dispatch({ type: "LOAD_STARTED" });
            const response = await fetch("/api/chat/threads", { method: "GET" });
            if (!response.ok) {
                dispatch({ type: "RUN_FAILED", message: "Unable to load threads." });

                return;
            }

            const json = (await response.json()) as { readonly threads: readonly ChatThreadSummary[] };
            const threads = [...json.threads];

            if (threads.length === 0) {
                const created = await createThreadInternal();
                if (created) {
                    await loadThread(created.id);
                }

                return;
            }

            const preferredId = preferredThreadId ?? stateRef.current.activeThreadId ?? threads[0]?.id ?? null;
            const nextActiveThreadId = threads.some((thread) => thread.id === preferredId) ? preferredId : (threads[0]?.id ?? null);

            dispatch({
                type: "THREADS_LOADED",
                threads,
                activeThreadId: nextActiveThreadId,
            });

            if (nextActiveThreadId) {
                await loadThread(nextActiveThreadId);
            }
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }

            dispatch({ type: "RUN_FAILED", message: "Unable to load threads." });
        }
    });

    const createThreadInternal = useEffectEvent(async () => {
        if (stateRef.current.activeRun) {
            dispatch({ type: "MUTATION_ERROR", message: "Wait for the current chat turn to finish before creating another thread." });

            return null;
        }

        const response = await fetch("/api/chat/threads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ languageCode }),
        });

        if (!response.ok) {
            dispatch({ type: "MUTATION_ERROR", message: "Unable to create a new thread." });

            return null;
        }

        const json = (await response.json()) as { readonly thread: ChatThreadSummary };
        dispatch({ type: "THREAD_CREATED", thread: json.thread });

        return json.thread;
    });

    const submit = useEffectEvent(async (options?: { retryMessageId?: string }) => {
        const currentState = stateRef.current;
        const activeThreadId = currentState.activeThreadId;
        if (!activeThreadId || currentState.activeRun) {
            return;
        }

        const retryMessageId = options?.retryMessageId ?? null;
        const draft = retryMessageId ? currentState.lastRecoverableDraft : currentState.draft.trim();
        if (!retryMessageId && !draft) {
            return;
        }

        dispatch({
            type: "SUBMIT_REQUESTED",
            draft,
            retryMessageId,
            threadId: activeThreadId,
        });

        let response: Response;
        try {
            response = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: retryMessageId ? undefined : draft,
                    retryMessageId: retryMessageId ?? undefined,
                    clientTurnId: makeClientTurnId(),
                }),
            });
        } catch (error) {
            if (isAbortError(error)) {
                dispatch({
                    type: "RUN_FAILED",
                    message: "Chat request was cancelled.",
                    restoreDraft: !retryMessageId,
                });
            } else {
                dispatch({
                    type: "RUN_FAILED",
                    message: "Unable to start the assistant response.",
                    restoreDraft: !retryMessageId,
                });
            }

            await loadThread(activeThreadId);
            void loadThreads(activeThreadId);

            return;
        }

        if (!response.ok || !response.body) {
            const error = await parseJsonSafe<ChatMutationError>(response);
            dispatch({
                type: "RUN_FAILED",
                message: error?.message ?? (response.status === 401 ? "You are not authenticated." : "Chat request failed."),
                restoreDraft: !retryMessageId,
            });
            await loadThread(activeThreadId);
            void loadThreads(activeThreadId);

            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawDone = false;
        let sawError = false;
        let streamedAssistantMessageId: string | null = null;

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.trim()) {
                        continue;
                    }

                    const event = JSON.parse(line) as ChatStreamEvent;
                    if ("assistantMessageId" in event) {
                        streamedAssistantMessageId = event.assistantMessageId;
                    } else if (event.type === "assistant-message-created") {
                        streamedAssistantMessageId = event.assistantMessage.id;
                    }

                    if (event.type === "text-delta") {
                        textBufferMetaRef.current = {
                            runId: event.runId,
                            threadId: event.threadId,
                            assistantMessageId: event.assistantMessageId,
                        };
                        textBufferRef.current += event.text;
                        scheduleTextFlush();
                        continue;
                    }

                    flushBufferedText();
                    startTransition(() => {
                        dispatch({ type: "RUN_EVENT_RECEIVED", event });
                    });

                    if (event.type === "done") {
                        sawDone = true;
                    }

                    if (event.type === "error") {
                        sawError = true;
                    }
                }
            }
        } catch {
            dispatch({
                type: "RUN_FAILED",
                message: "Network error while streaming assistant response.",
                restoreDraft: !retryMessageId,
            });
        } finally {
            flushBufferedText();

            const detail = await loadThread(activeThreadId);

            if (!sawDone && !sawError && !didRecoverClosedStream(detail, streamedAssistantMessageId)) {
                dispatch({
                    type: "RUN_FAILED",
                    message: "The assistant response ended unexpectedly.",
                    restoreDraft: !retryMessageId,
                });
            }

            void loadThreads(activeThreadId);
        }
    });

    const renameThread = useEffectEvent(async (threadId: string, title: string) => {
        if (!title.trim()) {
            return { code: "unknown", message: "Title cannot be empty." } satisfies ChatMutationError;
        }

        const response = await fetch(`/api/chat/threads/${threadId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: title.trim() }),
        });
        if (!response.ok) {
            const error = await parseJsonSafe<ChatMutationError>(response);
            dispatch({ type: "MUTATION_ERROR", message: error?.message ?? "Unable to rename thread." });

            return error ?? { code: "unknown", message: "Unable to rename thread." };
        }

        dispatch({ type: "THREAD_RENAMED", threadId, title: title.trim() });

        return null;
    });

    const deleteThread = useEffectEvent(async (threadId: string) => {
        const response = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
        if (!response.ok && response.status !== 204) {
            const error = await parseJsonSafe<ChatMutationError>(response);
            dispatch({ type: "MUTATION_ERROR", message: error?.message ?? "Unable to delete thread." });

            return error ?? { code: "unknown", message: "Unable to delete thread." };
        }

        dispatch({ type: "THREAD_DELETED", threadId });
        const nextActiveThreadId =
            stateRef.current.activeThreadId === threadId ? stateRef.current.threads.find((thread) => thread.id !== threadId)?.id : null;
        if (nextActiveThreadId) {
            await loadThread(nextActiveThreadId);
        } else {
            const created = await createThreadInternal();
            if (created) {
                await loadThread(created.id);
            }
        }
        void loadThreads(nextActiveThreadId ?? undefined);

        return null;
    });

    useEffect(() => {
        void loadThreads();

        return () => {
            if (flushTimerRef.current !== null) {
                globalThis.clearTimeout(flushTimerRef.current);
            }
        };
    }, []);

    const activeThread = useMemo(
        () => state.threads.find((thread) => thread.id === state.activeThreadId) ?? null,
        [state.activeThreadId, state.threads],
    );
    const activeMessages = activeThread ? (state.messagesByThreadId[activeThread.id] ?? []) : [];
    const isBusy = state.status === "loading" || state.status === "submitting" || state.status === "streaming";
    const isThreadLocked = Boolean(state.activeRun);

    return {
        state,
        activeThread,
        activeMessages,
        isBusy,
        isThreadLocked,
        setDraft: (value) => dispatch({ type: "DRAFT_CHANGED", value }),
        loadThread,
        createThread: async () => {
            const created = await createThreadInternal();
            if (created) {
                await loadThread(created.id);
                void loadThreads(created.id);
            }
        },
        submit,
        renameThread,
        deleteThread,
        clearMutationError: () => dispatch({ type: "CLEAR_MUTATION_ERROR" }),
    };
}
