"use client";

import { TransitBriefView } from "./transit-brief";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isAcceptedTransitImage, transitImagesFromClipboard } from "@/lib/transit/clipboard";
import type {
    ClarificationField,
    SanitizedTransitExtraction,
    TransitBrief,
    TransitStage,
    TransitStreamEvent,
    TransitThreadDetail,
    TransitThreadSummary,
} from "@/lib/transit/types";
import {
    Camera,
    CaretDown,
    Check,
    ClockCounterClockwise,
    FileImage,
    MapPin,
    Plus,
    ShieldCheck,
    Sparkle,
    Train,
    Trash,
    UploadSimple,
    Warning,
    X,
} from "@phosphor-icons/react";
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

interface PreviewFile {
    readonly file: File;
    readonly url: string;
}

function makeClientTurnId() {
    return `transit-${Date.now()}-${crypto.randomUUID()}`;
}

async function responseError(response: Response) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;

    return body?.message ?? `The Transit service returned HTTP ${response.status}.`;
}

function formatThreadDate(value: string) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

export function TransitGuide() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewsRef = useRef<readonly PreviewFile[]>([]);
    const [threads, setThreads] = useState<readonly TransitThreadSummary[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [previews, setPreviews] = useState<readonly PreviewFile[]>([]);
    const [entryPoint, setEntryPoint] = useState("");
    const [travelDate, setTravelDate] = useState("");
    const [mobilityNeeds, setMobilityNeeds] = useState("");
    const [message, setMessage] = useState("");
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
    const [isDragging, setIsDragging] = useState(false);

    previewsRef.current = previews;

    const disposePreviews = useEffectEvent(() => {
        for (const preview of previewsRef.current) {
            URL.revokeObjectURL(preview.url);
        }
        previewsRef.current = [];
        setPreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    });

    const applyThreadDetail = useEffectEvent((detail: TransitThreadDetail) => {
        setActiveThreadId(detail.thread.id);
        setExtraction(detail.extraction);
        setBrief(detail.brief);
        setEntryPoint(detail.extraction?.entryPoint ?? "");
        setMobilityNeeds(detail.extraction?.mobilityNeeds ?? "");
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
                const event = JSON.parse(line) as TransitStreamEvent;
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
                        setExtraction((current) => current);
                        setClarifications([]);
                        setCorrections({});
                        setMessage("");
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
        if (message.trim()) formData.set("message", message.trim());
        if (entryPoint.trim()) formData.set("entryPoint", entryPoint.trim());
        if (travelDate) formData.set("travelDate", travelDate);
        if (mobilityNeeds.trim()) formData.set("mobilityNeeds", mobilityNeeds.trim());
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
            setEntryPoint("");
            setTravelDate("");
            setMobilityNeeds("");
            setMessage("");
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

    return (
        <div
            className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_82%_4%,rgba(251,191,36,.10),transparent_28%),radial-gradient(circle_at_12%_26%,rgba(16,185,129,.08),transparent_30%)]"
            onPaste={(event) => {
                const images = transitImagesFromClipboard(event.clipboardData);
                if (images.length > 0) {
                    event.preventDefault();
                    addFiles(images);
                }
            }}
        >
            <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:44px_44px] opacity-[0.035]" />
            <div className="plearn-page relative max-w-[1080px]">
                <header className="flex flex-col gap-5 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-emerald-300/80 uppercase">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> 日本 · Rail intelligence
                        </p>
                        <h1 className="mt-3 text-[clamp(2.7rem,7vw,5.3rem)] leading-[0.88] font-[var(--font-display)] tracking-[-0.055em] text-white">
                            Know your train.
                            <span className="block text-amber-200">Find your track.</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
                            Drop in SmartEX, Google Maps, or JR screenshots. Luna reads the reservation, checks official sources, and turns
                            station maps into signs you can follow.
                        </p>
                    </div>

                    <div className="relative flex gap-2">
                        <Button variant="outline" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory}>
                            <ClockCounterClockwise /> Journeys{" "}
                            <CaretDown className={cn("transition-transform", showHistory && "rotate-180")} />
                        </Button>
                        <Button variant="outline" onClick={() => void startNewJourney()} disabled={isRunning}>
                            <Plus /> New
                        </Button>
                        {showHistory ? (
                            <div className="absolute top-11 right-0 z-30 w-[min(88vw,340px)] rounded-xl border border-white/10 bg-neutral-950/98 p-2 shadow-2xl backdrop-blur-xl">
                                {threads.map((thread) => (
                                    <div key={thread.id} className="group flex items-center gap-1 rounded-lg hover:bg-white/5">
                                        <button
                                            type="button"
                                            onClick={() => void selectThread(thread.id)}
                                            className="min-w-0 flex-1 px-3 py-2.5 text-left"
                                        >
                                            <p className="truncate text-sm text-neutral-200">{thread.title}</p>
                                            <p className="mt-0.5 font-mono text-[10px] text-neutral-600">
                                                {formatThreadDate(thread.lastMessageAt)}
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteThread(thread.id)}
                                            aria-label={`Delete ${thread.title}`}
                                            className="rounded p-2 text-neutral-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300 focus:opacity-100"
                                        >
                                            <Trash className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </header>

                <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                    <aside className="space-y-4 lg:sticky lg:top-6">
                        <section className="overflow-hidden rounded-[1.25rem] border border-white/9 bg-neutral-950/70 shadow-[0_20px_70px_rgba(0,0,0,.25)] backdrop-blur-sm">
                            <div className="border-b border-white/8 px-5 py-4">
                                <p className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                                    <Camera className="size-4 text-amber-200" /> 1 · Add your evidence
                                </p>
                                <p className="mt-1 text-xs leading-5 text-neutral-500">Up to 3 images · PNG, JPEG, WebP · 20 MB total</p>
                            </div>

                            <div className="p-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    multiple
                                    className="sr-only"
                                    onChange={(event) => event.target.files && addFiles(event.target.files)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setIsDragging(false);
                                        addFiles(event.dataTransfer.files);
                                    }}
                                    className={cn(
                                        "group flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-colors",
                                        isDragging
                                            ? "border-amber-300/70 bg-amber-300/8"
                                            : "border-white/15 bg-white/[0.025] hover:border-amber-300/35 hover:bg-amber-300/[0.035]",
                                    )}
                                >
                                    <span className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-neutral-300 transition-colors group-hover:text-amber-200">
                                        <UploadSimple className="size-5" />
                                    </span>
                                    <span className="mt-3 text-sm text-neutral-200">Snap, choose, or paste screenshots</span>
                                    <span className="mt-1 text-xs text-neutral-600">SmartEX · Google Maps · JR timetable</span>
                                    <span className="mt-2 rounded border border-white/8 bg-black/20 px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-neutral-500 uppercase">
                                        ⌘V / Ctrl+V anywhere
                                    </span>
                                </button>

                                {previews.length > 0 ? (
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {previews.map((preview, index) => (
                                            <div
                                                key={preview.url}
                                                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 bg-black"
                                            >
                                                {/* User-selected object URLs never leave the browser except in the explicit form submission. */}
                                                <img
                                                    src={preview.url}
                                                    alt={`Screenshot ${index + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePreview(index)}
                                                    aria-label={`Remove screenshot ${index + 1}`}
                                                    className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/80 text-white"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : extraction ? (
                                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200">
                                        <Check className="size-4" weight="bold" /> Screenshot processed and discarded
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        <section className="rounded-[1.25rem] border border-white/9 bg-neutral-950/70 p-5 backdrop-blur-sm">
                            <p className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                                <MapPin className="size-4 text-emerald-200" /> 2 · Where are you entering?
                            </p>
                            <label className="mt-4 block text-[11px] text-neutral-500" htmlFor="transit-entry-point">
                                Street, exit, gate, hotel, or landmark
                            </label>
                            <Input
                                id="transit-entry-point"
                                value={entryPoint}
                                onChange={(event) => setEntryPoint(event.target.value)}
                                placeholder="e.g. Yaesu North Exit"
                                className="mt-1.5"
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {["Yaesu North Exit", "Marunouchi Street", "Shinkansen transfer gate"].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setEntryPoint(suggestion)}
                                        className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-neutral-500 transition-colors hover:border-emerald-300/25 hover:text-emerald-200"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <label className="text-[11px] text-neutral-500">
                                    Travel date
                                    <Input
                                        type="date"
                                        value={travelDate}
                                        onChange={(event) => setTravelDate(event.target.value)}
                                        className="mt-1.5"
                                    />
                                </label>
                                <label className="text-[11px] text-neutral-500">
                                    Access needs
                                    <Input
                                        value={mobilityNeeds}
                                        onChange={(event) => setMobilityNeeds(event.target.value)}
                                        placeholder="Luggage, lifts…"
                                        className="mt-1.5"
                                    />
                                </label>
                            </div>

                            <label className="mt-4 block text-[11px] text-neutral-500" htmlFor="transit-question">
                                {brief ? "Ask a follow-up" : "Anything else?"}
                            </label>
                            <Textarea
                                id="transit-question"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder={
                                    brief
                                        ? "Which signs should I follow after the transfer gate?"
                                        : "I have large luggage and need the elevator route."
                                }
                                className="mt-1.5 min-h-20 resize-none"
                            />

                            <Button
                                size="xl"
                                className="mt-4 w-full border-amber-300/40 bg-amber-300/90 text-neutral-950 hover:bg-amber-200"
                                onClick={() => void submit(false)}
                                disabled={isRunning || isLoading}
                            >
                                {isRunning ? (
                                    <Sparkle className="animate-pulse" />
                                ) : brief && previews.length === 0 ? (
                                    <Train />
                                ) : (
                                    <FileImage />
                                )}
                                {isRunning
                                    ? "Checking Japan rail…"
                                    : brief && previews.length === 0
                                      ? "Ask about this journey"
                                      : "Read & verify journey"}
                            </Button>
                        </section>

                        <div className="flex items-start gap-2 px-1 text-[11px] leading-5 text-neutral-600">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300/60" />
                            <span>
                                Images are sent transiently to OpenAI, stripped of metadata, and never stored by Plearn. Redacted trip facts
                                and sources remain in journey history.
                            </span>
                        </div>
                    </aside>

                    <main className="min-w-0 space-y-4">
                        {isLoading ? (
                            <div className="flex min-h-80 items-center justify-center rounded-[1.3rem] border border-white/8 bg-white/[0.02]">
                                <p className="animate-pulse font-mono text-xs tracking-[0.12em] text-neutral-500 uppercase">
                                    Loading rail desk…
                                </p>
                            </div>
                        ) : null}

                        {error ? (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-400/7 px-4 py-3 text-sm text-red-100"
                            >
                                <Warning className="mt-0.5 size-4 shrink-0" weight="fill" />
                                <span className="flex-1 leading-5">{error}</span>
                                <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                                    <X className="size-4" />
                                </button>
                            </div>
                        ) : null}

                        {stage ? (
                            <section className="rounded-[1.2rem] border border-amber-300/15 bg-amber-300/[0.035] p-5" aria-live="polite">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="flex items-center gap-2 text-sm font-medium text-amber-100">
                                        <Sparkle className="size-4 animate-pulse" weight="fill" /> {stageMessage}
                                    </p>
                                    {sourceCount > 0 ? (
                                        <span className="font-mono text-[10px] text-neutral-500">{sourceCount} sources</span>
                                    ) : null}
                                </div>
                                <div className="mt-4 grid grid-cols-5 gap-1.5">
                                    {STAGE_ORDER.map((item, index) => {
                                        const activeIndex = STAGE_ORDER.indexOf(stage);
                                        const reached = index <= activeIndex;

                                        return (
                                            <div key={item}>
                                                <div className={cn("h-1 rounded-full", reached ? "bg-amber-300" : "bg-white/8")} />
                                                <p
                                                    className={cn(
                                                        "mt-2 hidden text-[9px] leading-3 md:block",
                                                        reached ? "text-amber-100" : "text-neutral-600",
                                                    )}
                                                >
                                                    {STAGE_LABELS[item]}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {clarifications.length > 0 && !isRunning ? (
                            <section className="rounded-[1.2rem] border border-sky-300/20 bg-sky-300/[0.04] p-5">
                                <p className="text-sm font-medium text-sky-100">Confirm what Luna could not safely infer</p>
                                <p className="mt-1 text-xs leading-5 text-neutral-500">
                                    Critical dates, stations, and train numbers are never guessed.
                                </p>
                                <div className="mt-4 space-y-4">
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
                                    className="mt-4"
                                    onClick={() => void submit(true)}
                                    disabled={clarifications.some((field) => !(corrections[field.field] ?? field.currentValue)?.trim())}
                                >
                                    <Check /> Confirm & check official sources
                                </Button>
                            </section>
                        ) : null}

                        {warnings.length > 0 ? (
                            <div className="space-y-2">
                                {warnings.map((warning) => (
                                    <p
                                        key={warning}
                                        className="flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.025] px-3 py-2 text-xs leading-5 text-neutral-400"
                                    >
                                        <Warning className="mt-0.5 size-3.5 shrink-0 text-amber-200" /> {warning}
                                    </p>
                                ))}
                            </div>
                        ) : null}

                        {brief ? (
                            <TransitBriefView brief={brief} />
                        ) : !isLoading && !stage && clarifications.length === 0 ? (
                            <section className="flex min-h-[430px] flex-col items-center justify-center rounded-[1.3rem] border border-dashed border-white/10 bg-black/10 px-7 text-center">
                                <span className="flex size-16 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-300/5 text-emerald-200">
                                    <Train className="size-8" weight="duotone" />
                                </span>
                                <h2 className="mt-5 text-3xl font-[var(--font-display)] text-white">
                                    Your platform brief will appear here
                                </h2>
                                <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
                                    Start with the screenshot you already trust. We will separate what was reserved, what is scheduled, and
                                    what the operator is reporting now.
                                </p>
                            </section>
                        ) : null}
                    </main>
                </div>
            </div>
        </div>
    );
}
