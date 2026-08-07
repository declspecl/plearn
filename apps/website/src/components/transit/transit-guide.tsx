"use client";

import { TransitBriefView } from "./transit-brief";
import { TransitComposer, type TransitDraft, type TransitPreview } from "./transit-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { isAcceptedTransitImage, transitImagesFromClipboard } from "@/lib/transit/clipboard";
import { departureWindowFields, tokyoClock, tokyoDate } from "@/lib/transit/departure";
import type {
    ClarificationField,
    SanitizedTransitExtraction,
    TransitBrief,
    TransitStage,
    TransitStreamEvent,
    TransitThreadDetail,
    TransitThreadSummary,
} from "@/lib/transit/types";
import { CaretDown, Check, ClockCounterClockwise, Plus, ShieldCheck, Sparkle, Train, Trash, Warning, X } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { cn } from "~/lib/utils";

const STAGE_ORDER: readonly TransitStage[] = [
    "reading_screenshot",
    "checking_reservation",
    "searching_official",
    "reading_maps",
    "building_directions",
];

const STAGE_LABELS: Record<TransitStage, string> = {
    reading_screenshot: "Read screenshot",
    checking_reservation: "Check reservation",
    searching_official: "Search operator",
    reading_maps: "Read station maps",
    building_directions: "Build directions",
};

const EMPTY_DRAFT: TransitDraft = {
    entryPoint: "",
    travelDate: null,
    departure: { kind: "as_booked" },
    mobilityNeeds: "",
    message: "",
};

function makeClientTurnId() {
    return `transit-${Date.now()}-${crypto.randomUUID()}`;
}

async function responseError(response: Response) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;

    return body?.message ?? `The Transit service returned HTTP ${response.status}.`;
}

/** "Kyoto → Saga-Arashiyama" for the collapsed header, so the line carries the trip instead of a label. */
function briefRouteLabel(brief: TransitBrief | null) {
    const legs = brief?.legs ?? [];
    const origin = legs[0]?.origin.value?.nameEn.replace(/\s+Station$/u, "");
    const destination = legs.at(-1)?.destination.value?.nameEn.replace(/\s+Station$/u, "");

    return origin && destination ? `${origin} → ${destination}` : null;
}

function formatThreadDate(value: string) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

export function TransitGuide() {
    const previewsRef = useRef<readonly TransitPreview[]>([]);
    const [threads, setThreads] = useState<readonly TransitThreadSummary[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [previews, setPreviews] = useState<readonly TransitPreview[]>([]);
    const [draft, setDraft] = useState<TransitDraft>(EMPTY_DRAFT);
    const [brief, setBrief] = useState<TransitBrief | null>(null);
    const [extraction, setExtraction] = useState<SanitizedTransitExtraction | null>(null);
    const [clarifications, setClarifications] = useState<readonly ClarificationField[]>([]);
    const [corrections, setCorrections] = useState<Record<string, string>>({});
    const [stage, setStage] = useState<TransitStage | null>(null);
    const [stageMessage, setStageMessage] = useState("");
    const [sourceCount, setSourceCount] = useState(0);
    const [warnings, setWarnings] = useState<readonly string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    // Tokyo "now" drives the departure presets; refreshed so a page left open does not go stale.
    const [tokyoNow, setTokyoNow] = useState(() => ({ date: tokyoDate(), clock: tokyoClock() }));

    previewsRef.current = previews;

    useEffect(() => {
        const timer = setInterval(() => setTokyoNow({ date: tokyoDate(), clock: tokyoClock() }), 30_000);

        return () => clearInterval(timer);
    }, []);

    function patchDraft(patch: Partial<TransitDraft>) {
        setDraft((current) => ({ ...current, ...patch }));
    }

    const disposePreviews = useEffectEvent(() => {
        for (const preview of previewsRef.current) {
            URL.revokeObjectURL(preview.url);
        }
        previewsRef.current = [];
        setPreviews([]);
    });

    const applyThreadDetail = useEffectEvent((detail: TransitThreadDetail) => {
        setActiveThreadId(detail.thread.id);
        setExtraction(detail.extraction);
        setBrief(detail.brief);
        setDraft({
            ...EMPTY_DRAFT,
            entryPoint: detail.extraction?.entryPoint ?? "",
            mobilityNeeds: detail.extraction?.mobilityNeeds ?? "",
        });
        setClarifications(detail.extraction?.clarifications ?? []);
        setCorrections({});
        setWarnings([]);
        setError(null);
        setStage(null);
    });

    const loadThread = useEffectEvent(async (threadId: string) => {
        const response = await fetch(`/api/transit/threads/${threadId}`);
        if (!response.ok) {
            throw new Error(await responseError(response));
        }
        const detail = (await response.json()) as TransitThreadDetail;
        applyThreadDetail(detail);
    });

    const createThread = useEffectEvent(async () => {
        const response = await fetch("/api/transit/threads", { method: "POST" });
        if (!response.ok) {
            throw new Error(await responseError(response));
        }
        const body = (await response.json()) as { thread: TransitThreadSummary };
        setThreads((current) => [body.thread, ...current.filter((thread) => thread.id !== body.thread.id)]);
        setActiveThreadId(body.thread.id);

        return body.thread.id;
    });

    const loadInitialState = useEffectEvent(async () => {
        try {
            const response = await fetch("/api/transit/threads");
            if (!response.ok) {
                throw new Error(await responseError(response));
            }
            const body = (await response.json()) as { threads: readonly TransitThreadSummary[] };
            setThreads(body.threads);
            const threadId = body.threads[0]?.id ?? (await createThread());
            await loadThread(threadId);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Transit could not be loaded.");
        } finally {
            setIsLoading(false);
        }
    });

    useEffect(() => {
        void loadInitialState();

        return () => {
            for (const preview of previewsRef.current) {
                URL.revokeObjectURL(preview.url);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize once; useEffectEvent reads the latest implementation
    }, []);

    function addFiles(inputFiles: FileList | readonly File[]) {
        const incoming = [...inputFiles].filter((file) => isAcceptedTransitImage(file));
        const combined = [...previews, ...incoming.map((file) => ({ file, url: URL.createObjectURL(file) }))];
        if (combined.length > 3) {
            for (const preview of combined.slice(3)) {
                URL.revokeObjectURL(preview.url);
            }
            setError("Upload at most three screenshots.");
        } else {
            setError(null);
        }
        setPreviews(combined.slice(0, 3));
    }

    function removePreview(index: number) {
        setPreviews((current) => {
            const selected = current[index];
            if (selected) {
                URL.revokeObjectURL(selected.url);
            }

            return current.filter((_, itemIndex) => itemIndex !== index);
        });
    }

    async function refreshThreads(preferredId: string) {
        const response = await fetch("/api/transit/threads");
        if (response.ok) {
            const body = (await response.json()) as { threads: readonly TransitThreadSummary[] };
            setThreads(body.threads);
            setActiveThreadId(preferredId);
        }
    }

    async function consumeStream(response: Response, threadId: string) {
        if (!response.body) {
            throw new Error("The rail check returned no response stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
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
                // A single malformed frame must not abandon a run whose brief the server already stored.
                let event: TransitStreamEvent;
                try {
                    event = JSON.parse(line) as TransitStreamEvent;
                } catch {
                    continue;
                }
                switch (event.type) {
                    case "stage": {
                        setStage(event.stage);
                        setStageMessage(event.message);
                        break;
                    }
                    case "extraction-ready": {
                        setExtraction(event.extraction);
                        setClarifications(event.extraction.clarifications);
                        disposePreviews();
                        break;
                    }
                    case "needs-confirmation": {
                        setClarifications(event.fields);
                        setStage(null);
                        break;
                    }
                    case "source": {
                        setSourceCount((count) => count + 1);
                        break;
                    }
                    case "warning": {
                        setWarnings((current) => [...current, event.message]);
                        break;
                    }
                    case "brief-ready": {
                        setBrief(event.brief);
                        setClarifications([]);
                        setCorrections({});
                        patchDraft({ message: "" });
                        break;
                    }
                    case "error": {
                        setError(event.message);
                        break;
                    }
                    case "finish": {
                        setStage(null);
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }
        await refreshThreads(threadId);
    }

    async function submit(correctionMode = false) {
        if (isRunning) {
            return;
        }

        if (!activeThreadId) {
            setError("No transit thread is available.");

            return;
        }
        if (!correctionMode && previews.length === 0 && !extraction) {
            setError("Attach a Google Maps, SmartEX, or JR screenshot to begin.");

            return;
        }

        setIsRunning(true);
        setError(null);
        setWarnings([]);
        setSourceCount(0);
        if (previews.length > 0) {
            setExtraction(null);
            setClarifications([]);
        }
        setStage("reading_screenshot");
        setStageMessage(previews.length > 0 ? "Preparing your screenshots" : "Preparing the saved itinerary");
        const formData = new FormData();
        formData.set("clientTurnId", makeClientTurnId());
        if (draft.message.trim()) formData.set("message", draft.message.trim());
        if (draft.entryPoint.trim()) formData.set("entryPoint", draft.entryPoint.trim());
        if (draft.travelDate) formData.set("travelDate", draft.travelDate);
        if (draft.mobilityNeeds.trim()) formData.set("mobilityNeeds", draft.mobilityNeeds.trim());
        for (const [key, value] of Object.entries(departureWindowFields(draft.departure))) {
            formData.set(key, value);
        }
        if (correctionMode) formData.set("correctionsJson", JSON.stringify(corrections));
        for (const preview of previews) {
            formData.append("images", preview.file, preview.file.name);
        }

        try {
            const response = await fetch(`/api/transit/threads/${activeThreadId}/turns`, { method: "POST", body: formData });
            if (!response.ok) {
                throw new Error(await responseError(response));
            }
            await consumeStream(response, activeThreadId);
        } catch (submitError) {
            setStage(null);
            setError(submitError instanceof Error ? submitError.message : "The rail check failed.");
        } finally {
            setIsRunning(false);
        }
    }

    async function startNewJourney() {
        if (isRunning) return;
        setIsLoading(true);
        try {
            const threadId = await createThread();
            disposePreviews();
            setBrief(null);
            setExtraction(null);
            setClarifications([]);
            setCorrections({});
            setDraft(EMPTY_DRAFT);
            setWarnings([]);
            setError(null);
            setShowHistory(false);
            await loadThread(threadId);
        } catch (newError) {
            setError(newError instanceof Error ? newError.message : "A new journey could not be created.");
        } finally {
            setIsLoading(false);
        }
    }

    async function selectThread(threadId: string) {
        if (isRunning || threadId === activeThreadId) return;
        setIsLoading(true);
        setShowHistory(false);
        disposePreviews();
        try {
            await loadThread(threadId);
        } catch (selectError) {
            setError(selectError instanceof Error ? selectError.message : "The saved journey could not be loaded.");
        } finally {
            setIsLoading(false);
        }
    }

    async function deleteThread(threadId: string) {
        if (isRunning) return;
        const response = await fetch(`/api/transit/threads/${threadId}`, { method: "DELETE" });
        if (!response.ok) {
            setError(await responseError(response));

            return;
        }
        const remaining = threads.filter((thread) => thread.id !== threadId);
        setThreads(remaining);
        if (threadId === activeThreadId) {
            const nextId = remaining[0]?.id ?? (await createThread());
            await loadThread(nextId);
        }
    }

    const activeStageIndex = stage ? STAGE_ORDER.indexOf(stage) : -1;
    const showSetup = !brief;
    const journeyTitle = briefRouteLabel(brief) ?? "Your journey";

    return (
        <div
            className="relative min-h-full bg-[radial-gradient(circle_at_88%_0%,rgba(251,191,36,.09),transparent_32%),radial-gradient(circle_at_0%_22%,rgba(16,185,129,.07),transparent_34%)] [--font-mono:var(--font-geist-mono)]"
            onPaste={(event) => {
                const images = transitImagesFromClipboard(event.clipboardData);
                if (images.length > 0) {
                    event.preventDefault();
                    addFiles(images);
                }
            }}
        >
            <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:44px_44px] opacity-[0.03]" />

            <div className="relative mx-auto w-full max-w-[44rem] px-4 pt-5 pb-16 sm:px-6 md:pt-9">
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-emerald-300/80 uppercase">
                            <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-300" /> 日本 · Rail
                            <span className="hidden sm:inline">intelligence</span>
                        </p>
                        {showSetup ? (
                            <h1 className="mt-2.5 text-[clamp(1.65rem,8.5vw,2.9rem)] leading-[0.92] font-[var(--font-display)] tracking-[-0.04em] text-white">
                                Know your train.
                                <span className="block text-amber-200">Find your track.</span>
                            </h1>
                        ) : (
                            <h1 className="mt-1.5 truncate text-xl leading-tight font-[var(--font-display)] tracking-[-0.03em] text-white">
                                {journeyTitle}
                            </h1>
                        )}
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                        <Popover open={showHistory} onOpenChange={setShowHistory}>
                            <PopoverTrigger
                                render={<Button variant="outline" size="sm" aria-label="Saved journeys" />}
                                disabled={threads.length === 0}
                            >
                                <ClockCounterClockwise />
                                <span className="hidden sm:inline">Journeys</span>
                                <CaretDown className={cn("transition-transform", showHistory && "rotate-180")} />
                            </PopoverTrigger>
                            <PopoverPopup align="end" className="w-[min(88vw,20rem)] p-1">
                                {threads.map((thread) => (
                                    <div key={thread.id} className="group flex items-center gap-1 rounded-lg hover:bg-white/5">
                                        <button
                                            type="button"
                                            onClick={() => void selectThread(thread.id)}
                                            className={cn(
                                                "min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left",
                                                thread.id === activeThreadId && "bg-white/4",
                                            )}
                                        >
                                            <p className="truncate text-[13px] text-neutral-200">{thread.title}</p>
                                            <p className="mt-0.5 font-mono text-[10px] text-neutral-600">
                                                {formatThreadDate(thread.lastMessageAt)}
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteThread(thread.id)}
                                            aria-label={`Delete ${thread.title}`}
                                            className="rounded p-2 text-neutral-600 transition-opacity hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                        >
                                            <Trash className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </PopoverPopup>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={() => void startNewJourney()} disabled={isRunning}>
                            <Plus />
                            <span className="hidden sm:inline">New</span>
                        </Button>
                    </div>
                </header>

                {showSetup ? (
                    <p className="mt-3 max-w-lg text-[13px] leading-6 text-neutral-400">
                        Drop in a SmartEX, Google Maps, or JR screenshot. Luna reads the reservation, checks official sources, and turns
                        station maps into signs you can follow.
                    </p>
                ) : null}

                <div className="mt-5 space-y-4">
                    {error ? (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-400/8 px-3.5 py-3 text-[13px] text-red-100"
                        >
                            <Warning className="mt-0.5 size-4 shrink-0" weight="fill" />
                            <span className="flex-1 leading-5">{error}</span>
                            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02]">
                            <p className="animate-pulse font-mono text-[11px] tracking-[0.14em] text-neutral-500 uppercase">
                                Loading rail desk…
                            </p>
                        </div>
                    ) : (
                        <TransitComposer
                            mode={brief ? "followup" : "setup"}
                            draft={draft}
                            onDraftChange={patchDraft}
                            previews={previews}
                            onAddFiles={addFiles}
                            onRemovePreview={removePreview}
                            hasStoredEvidence={Boolean(extraction)}
                            today={tokyoNow.date}
                            nowClock={tokyoNow.clock}
                            status={isRunning ? "running" : "ready"}
                            onSubmit={() => void submit(false)}
                        />
                    )}

                    {stage ? (
                        <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3.5" aria-live="polite">
                            <div className="flex items-center gap-2.5">
                                <Sparkle className="size-4 shrink-0 animate-pulse text-amber-200" weight="fill" />
                                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-amber-100">{stageMessage}</p>
                                {sourceCount > 0 ? (
                                    <span className="shrink-0 font-mono text-[10px] text-neutral-500">{sourceCount} sources</span>
                                ) : null}
                            </div>
                            <div className="mt-3 flex gap-1">
                                {STAGE_ORDER.map((item, index) => (
                                    <div
                                        key={item}
                                        className={cn(
                                            "h-1 flex-1 rounded-full transition-colors",
                                            index <= activeStageIndex ? "bg-amber-300" : "bg-white/8",
                                        )}
                                    />
                                ))}
                            </div>
                            <p className="mt-2 font-mono text-[10px] tracking-[0.12em] text-neutral-500 uppercase">
                                Step {activeStageIndex + 1} of {STAGE_ORDER.length} · {stage ? STAGE_LABELS[stage] : ""}
                            </p>
                        </section>
                    ) : null}

                    {clarifications.length > 0 && !isRunning ? (
                        <section className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.05] p-4 sm:p-5">
                            <p className="text-sm font-medium text-sky-100">Confirm what Luna could not safely infer</p>
                            <p className="mt-1 text-xs leading-5 text-neutral-500">
                                Critical dates, stations, and train numbers are never guessed.
                            </p>
                            <div className="mt-4 space-y-3">
                                {clarifications.map((field) => (
                                    <label key={field.field} className="block text-xs text-neutral-400">
                                        {field.question}
                                        <Input
                                            value={corrections[field.field] ?? field.currentValue ?? ""}
                                            onChange={(event) =>
                                                setCorrections((current) => ({ ...current, [field.field]: event.target.value }))
                                            }
                                            className="mt-1.5"
                                            list={`suggestions-${field.field}`}
                                        />
                                        <datalist id={`suggestions-${field.field}`}>
                                            {field.suggestions.map((suggestion) => (
                                                <option key={suggestion} value={suggestion} />
                                            ))}
                                        </datalist>
                                    </label>
                                ))}
                            </div>
                            <Button
                                size="lg"
                                className="mt-4 w-full sm:w-auto"
                                onClick={() => void submit(true)}
                                disabled={clarifications.some((field) => !(corrections[field.field] ?? field.currentValue)?.trim())}
                            >
                                <Check /> Confirm & check sources
                            </Button>
                        </section>
                    ) : null}

                    {brief ? (
                        <TransitBriefView brief={brief} />
                    ) : !isLoading && !stage && clarifications.length === 0 ? (
                        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-10 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-300/5 text-emerald-200">
                                <Train className="size-6" weight="duotone" />
                            </span>
                            <h2 className="mt-4 text-xl font-[var(--font-display)] text-white">Your platform brief appears here</h2>
                            <p className="mt-2 max-w-sm text-[13px] leading-6 text-neutral-500">
                                We separate what was reserved, what is scheduled, and what the operator is reporting now.
                            </p>
                        </section>
                    ) : null}

                    {warnings.length > 0 ? (
                        <section className="rounded-xl border border-amber-300/12 bg-amber-300/[0.03] px-3.5 py-3" aria-label="Caveats">
                            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-amber-200/70 uppercase">
                                <Warning className="size-3.5" /> Caveats
                            </p>
                            <ul className="mt-2 space-y-1.5">
                                {warnings.map((warning) => (
                                    <li key={warning} className="flex gap-2 text-xs leading-5 text-neutral-400">
                                        <span aria-hidden className="text-amber-300/60">
                                            ·
                                        </span>
                                        {warning}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-neutral-600">
                        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300/50" />
                        <span>
                            Images are sent transiently to OpenAI, stripped of metadata, and never stored by Plearn. Redacted trip facts and
                            sources remain in journey history.
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
