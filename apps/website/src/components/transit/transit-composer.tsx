"use client";

import { TransitWhenField } from "./transit-when-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DepartureWindow } from "@/lib/transit/departure";
import { CaretDown, Check, ImageSquare, PaperPlaneRight, Plus, Sparkle, Train, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

const ENTRY_SUGGESTIONS = ["Yaesu North Exit", "Marunouchi Central", "Shinkansen transfer gate"] as const;

export interface TransitDraft {
    readonly entryPoint: string;
    readonly travelDate: string | null;
    readonly departure: DepartureWindow;
    readonly mobilityNeeds: string;
    readonly message: string;
}

export interface TransitPreview {
    readonly file: File;
    readonly url: string;
}

export interface TransitComposerProps {
    /** "setup" collects the whole journey; "followup" is the compact bar shown beside a finished brief. */
    readonly mode: "setup" | "followup";
    readonly draft: TransitDraft;
    readonly onDraftChange: (patch: Partial<TransitDraft>) => void;
    readonly previews: readonly TransitPreview[];
    readonly onAddFiles: (files: FileList | readonly File[]) => void;
    readonly onRemovePreview: (index: number) => void;
    readonly hasStoredEvidence: boolean;
    readonly today: string;
    readonly nowClock: string;
    /** Single lifecycle state so "loading" and "running" can never disagree. */
    readonly status: "loading" | "ready" | "running";
    readonly onSubmit: () => void;
}

function SectionLabel({ step, children }: { readonly step: string; readonly children: React.ReactNode }) {
    return (
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
            <span className="text-amber-300/60">{step}</span>
            {children}
        </p>
    );
}

function EvidenceField({
    previews,
    onAddFiles,
    onRemovePreview,
    hasStoredEvidence,
    compact,
}: {
    readonly previews: readonly TransitPreview[];
    readonly onAddFiles: (files: FileList | readonly File[]) => void;
    readonly onRemovePreview: (index: number) => void;
    readonly hasStoredEvidence: boolean;
    readonly compact: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                    if (event.target.files) {
                        onAddFiles(event.target.files);
                    }
                    // Reset so re-picking the same file still fires a change event.
                    event.target.value = "";
                }}
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
                    onAddFiles(event.dataTransfer.files);
                }}
                className={cn(
                    "group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 text-left transition-colors",
                    compact ? "py-2.5" : "py-3.5",
                    isDragging ? "border-amber-300/60 bg-amber-300/8" : "border-white/12 bg-white/[0.02] hover:border-amber-300/30",
                )}
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-neutral-400 transition-colors group-hover:text-amber-200">
                    <ImageSquare className="size-4.5" weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm text-neutral-200">
                        {compact ? "Add another screenshot" : "Paste, snap, or choose screenshots"}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-neutral-600">
                        SmartEX · Google Maps · JR timetable — up to 3
                    </span>
                </span>
                <span className="hidden shrink-0 rounded border border-white/8 bg-black/25 px-1.5 py-1 font-mono text-[9px] tracking-[0.08em] text-neutral-600 uppercase sm:block">
                    ⌘V
                </span>
            </button>

            {previews.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {previews.map((preview, index) => (
                        <div
                            key={preview.url}
                            className="group relative size-16 overflow-hidden rounded-lg border border-white/10 bg-black"
                        >
                            {/* Object URLs stay in the browser; only the explicit form submission uploads the file. */}
                            <img src={preview.url} alt={`Screenshot ${index + 1}`} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onRemovePreview(index)}
                                aria-label={`Remove screenshot ${index + 1}`}
                                className="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-full bg-black/85 text-white"
                            >
                                <X className="size-3" weight="bold" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : hasStoredEvidence ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300/80">
                    <Check className="size-3.5" weight="bold" /> Screenshot processed and discarded
                </p>
            ) : null}
        </div>
    );
}

function TripDetailFields({
    draft,
    onDraftChange,
    today,
    nowClock,
    isRunning,
}: Pick<TransitComposerProps, "draft" | "onDraftChange" | "today" | "nowClock"> & { readonly isRunning: boolean }) {
    return (
        <>
            <div className="space-y-2">
                <SectionLabel step="02">Where you enter</SectionLabel>
                <Input
                    id="transit-entry-point"
                    value={draft.entryPoint}
                    onChange={(event) => onDraftChange({ entryPoint: event.target.value })}
                    placeholder="Exit, gate, hotel, or landmark"
                    disabled={isRunning}
                />
                <div className="flex flex-wrap gap-1.5">
                    {ENTRY_SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => onDraftChange({ entryPoint: suggestion })}
                            className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-neutral-500 transition-colors hover:border-emerald-300/25 hover:text-emerald-200"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <SectionLabel step="03">When you leave</SectionLabel>
                <TransitWhenField
                    travelDate={draft.travelDate}
                    onTravelDateChange={(travelDate) => onDraftChange({ travelDate })}
                    departure={draft.departure}
                    onDepartureChange={(departure) => onDraftChange({ departure })}
                    today={today}
                    nowClock={nowClock}
                    disabled={isRunning}
                />
            </div>

            <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-neutral-500 transition-colors hover:text-neutral-300">
                    <CaretDown className="size-3 transition-transform group-open:rotate-180" />
                    Access needs {draft.mobilityNeeds ? <span className="text-emerald-300/80">· set</span> : null}
                </summary>
                <Input
                    value={draft.mobilityNeeds}
                    onChange={(event) => onDraftChange({ mobilityNeeds: event.target.value })}
                    placeholder="Large luggage, lifts only, stroller, limited walking…"
                    className="mt-2"
                    disabled={isRunning}
                />
            </details>
        </>
    );
}

export function TransitComposer({
    mode,
    draft,
    onDraftChange,
    previews,
    onAddFiles,
    onRemovePreview,
    hasStoredEvidence,
    today,
    nowClock,
    status,
    onSubmit,
}: TransitComposerProps) {
    const isRunning = status === "running";
    const [detailsOpen, setDetailsOpen] = useState(false);
    const messageRef = useRef<HTMLTextAreaElement>(null);
    const canSubmit = status === "ready";
    const submitLabel = isRunning ? "Checking Japan rail…" : mode === "followup" && previews.length === 0 ? "Ask" : "Read & verify";

    // The follow-up box starts one line tall and grows with the question instead of reserving space.
    useEffect(() => {
        const node = messageRef.current;
        if (node) {
            node.style.height = "auto";
            node.style.height = `${node.scrollHeight}px`;
        }
    }, [draft.message]);

    if (mode === "followup") {
        return (
            <section className="rounded-2xl border border-white/8 bg-neutral-950/70 p-1.5 backdrop-blur-sm focus-within:border-white/16">
                <div className="flex items-end gap-1">
                    <button
                        type="button"
                        onClick={() => setDetailsOpen((value) => !value)}
                        aria-expanded={detailsOpen}
                        aria-label="Trip details"
                        title="Trip details"
                        className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            detailsOpen ? "bg-white/8 text-neutral-100" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200",
                        )}
                    >
                        <Plus className={cn("size-4 transition-transform", detailsOpen && "rotate-45")} />
                    </button>
                    <Textarea
                        unstyled
                        id="transit-question"
                        ref={messageRef}
                        rows={1}
                        value={draft.message}
                        onChange={(event) => onDraftChange({ message: event.target.value })}
                        onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
                                event.preventDefault();
                                onSubmit();
                            }
                        }}
                        placeholder="Ask a follow-up…"
                        // Textarea puts className on its wrapper, so the inner control is sized directly.
                        className="min-w-0 flex-1 [&_textarea]:max-h-40 [&_textarea]:min-h-10 [&_textarea]:resize-none [&_textarea]:bg-transparent [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:leading-5 [&_textarea]:max-sm:min-h-10"
                        disabled={isRunning}
                    />
                    <Button
                        size="icon-lg"
                        aria-label={submitLabel}
                        className="shrink-0 rounded-xl border-amber-300/40 bg-amber-300/90 text-neutral-950 hover:bg-amber-200"
                        onClick={onSubmit}
                        disabled={!canSubmit}
                    >
                        {isRunning ? <Sparkle className="animate-pulse" /> : <PaperPlaneRight weight="fill" />}
                    </Button>
                </div>

                {detailsOpen ? (
                    <div className="mt-2 space-y-4 border-t border-white/8 px-1.5 pt-3 pb-1">
                        <div className="space-y-2">
                            <SectionLabel step="01">Your evidence</SectionLabel>
                            <EvidenceField
                                previews={previews}
                                onAddFiles={onAddFiles}
                                onRemovePreview={onRemovePreview}
                                hasStoredEvidence={hasStoredEvidence}
                                compact
                            />
                        </div>
                        <TripDetailFields
                            draft={draft}
                            onDraftChange={onDraftChange}
                            today={today}
                            nowClock={nowClock}
                            isRunning={isRunning}
                        />
                    </div>
                ) : null}
            </section>
        );
    }

    return (
        <section className="space-y-5 rounded-2xl border border-white/8 bg-neutral-950/70 p-4 backdrop-blur-sm sm:p-5">
            <div className="space-y-2">
                <SectionLabel step="01">Your evidence</SectionLabel>
                <EvidenceField
                    previews={previews}
                    onAddFiles={onAddFiles}
                    onRemovePreview={onRemovePreview}
                    hasStoredEvidence={hasStoredEvidence}
                    compact={false}
                />
            </div>

            <TripDetailFields draft={draft} onDraftChange={onDraftChange} today={today} nowClock={nowClock} isRunning={isRunning} />

            <Textarea
                id="transit-question"
                value={draft.message}
                onChange={(event) => onDraftChange({ message: event.target.value })}
                placeholder="Anything else? e.g. I have two large suitcases and need lifts."
                className="min-h-16 resize-none"
                disabled={isRunning}
            />

            <Button
                size="xl"
                className="w-full border-amber-300/40 bg-amber-300/90 text-neutral-950 hover:bg-amber-200"
                onClick={onSubmit}
                disabled={!canSubmit}
            >
                {isRunning ? <Sparkle className="animate-pulse" /> : <Train weight="fill" />}
                {submitLabel}
            </Button>
        </section>
    );
}
