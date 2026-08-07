"use client";

import { formatClock, formatDuration, minuteDelta, minutesUntilDeparture, TOKYO_CLOCK_FORMAT } from "@/lib/transit/clock";
import type { EvidenceBasis, SourcedValue, StationRef, TransitBrief, TransitLeg, TransitSource } from "@/lib/transit/types";
import { ArrowSquareOut, CaretDown, CheckCircle, Compass, MapPin, Signpost, Train, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "~/lib/utils";

const BASIS_LABELS: Record<EvidenceBasis, string> = {
    reservation: "Booked",
    operator_live: "Live",
    operator_timetable: "Timetable",
    official_station_map: "Station map",
    user_route_plan: "Your plan",
    inferred: "Unverified",
    unavailable: "No data",
};

const OFFICIAL_BASES: ReadonlySet<EvidenceBasis> = new Set(["operator_live", "operator_timetable", "official_station_map"]);

/** True only for evidence that came from the operator, not from the traveler's own screenshot. */
function isOfficialBasis(basis: EvidenceBasis) {
    return OFFICIAL_BASES.has(basis);
}

/** Three hues only: emerald means current, sky means official, amber means treat with care. */
const BASIS_STYLES: Record<EvidenceBasis, string> = {
    reservation: "border-white/14 bg-white/5 text-neutral-200",
    operator_live: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
    operator_timetable: "border-sky-400/30 bg-sky-400/8 text-sky-200",
    official_station_map: "border-sky-400/30 bg-sky-400/8 text-sky-200",
    user_route_plan: "border-white/14 bg-white/5 text-neutral-200",
    inferred: "border-amber-400/35 bg-amber-400/8 text-amber-200",
    unavailable: "border-white/8 bg-transparent text-neutral-500",
};

function departureProximity(brief: TransitBrief) {
    const leg = brief.legs[0];

    return minutesUntilDeparture(leg?.serviceDate.value ?? null, leg?.estimatedDeparture.value ?? leg?.scheduledDeparture.value ?? null);
}

function stationName(station: SourcedValue<StationRef>, fallback: string) {
    // "Station" is redundant in a rail brief and costs a third of the line on a phone.
    return station.value?.nameEn.replace(/\s+Station$/u, "") ?? fallback;
}

function stationKanji(station: SourcedValue<StationRef>) {
    const value = station.value;

    return value && value.nameJa && value.nameJa !== value.nameEn ? value.nameJa : null;
}

function BasisChip({
    basis,
    confidence,
    className,
}: {
    readonly basis: EvidenceBasis;
    readonly confidence?: string;
    readonly className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] leading-4 font-medium whitespace-nowrap",
                BASIS_STYLES[basis],
                className,
            )}
        >
            <span aria-hidden className="size-1 rounded-full bg-current opacity-70" />
            {BASIS_LABELS[basis]}
            {confidence === "low" && basis !== "unavailable" ? " · low" : ""}
        </span>
    );
}

/** Compact bracketed citations that point into the sources list at the end of the brief. */
function SourceRefs({
    sourceIds,
    sources,
    indexes,
}: {
    readonly sourceIds: readonly string[];
    readonly sources: ReadonlyMap<string, TransitSource>;
    readonly indexes: ReadonlyMap<string, number>;
}) {
    const cited = sourceIds.flatMap((sourceId) => {
        const source = sources.get(sourceId);

        return source ? [{ source, index: indexes.get(sourceId) ?? 0 }] : [];
    });

    if (cited.length === 0) {
        return null;
    }

    return (
        <span className="inline-flex items-center gap-0.5 align-super">
            {cited.map(({ source, index }) =>
                source.url ? (
                    <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`${source.title} — ${source.publisher}`}
                        className="font-mono text-[10px] text-amber-200/90 tabular-nums hover:text-amber-100"
                    >
                        [{index}]
                    </a>
                ) : (
                    <span key={source.id} title={source.title} className="font-mono text-[10px] text-neutral-500 tabular-nums">
                        [{index}]
                    </span>
                ),
            )}
        </span>
    );
}

function AsOf({ value }: { readonly value: SourcedValue<unknown> }) {
    if (!value.sourceAsOf) {
        return null;
    }

    const timestamp = new Date(value.sourceAsOf);

    return Number.isNaN(timestamp.getTime()) ? null : (
        <span className="font-mono text-[10px] text-neutral-600 tabular-nums">{TOKYO_CLOCK_FORMAT.format(timestamp)} JST</span>
    );
}

interface Citations {
    readonly sources: ReadonlyMap<string, TransitSource>;
    readonly indexes: ReadonlyMap<string, number>;
}

/** Chooses the value a traveler should act on: actual beats operator estimate beats schedule. */
function primaryTime(scheduled: SourcedValue<string>, estimated: SourcedValue<string>, actual: SourcedValue<string>) {
    if (actual.value) {
        return { value: actual, label: "Actual" as const };
    }

    return estimated.value ? { value: estimated, label: "Operator estimate" as const } : { value: scheduled, label: "Scheduled" as const };
}

function TimeBlock({
    label,
    station,
    stationFallback,
    time,
    scheduled,
    align,
    citations,
}: {
    readonly label: string;
    readonly station: SourcedValue<StationRef>;
    readonly stationFallback: string;
    readonly time: ReturnType<typeof primaryTime>;
    readonly scheduled: SourcedValue<string>;
    readonly align: "left" | "right";
    readonly citations: Citations;
}) {
    const delay = time.label === "Scheduled" ? null : minuteDelta(scheduled.value, time.value.value);
    const kanji = stationKanji(station);

    return (
        <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
            <p className="font-mono text-[10px] tracking-[0.14em] text-neutral-500 uppercase">{label}</p>
            <p className="mt-1 font-mono text-[1.7rem] leading-none font-semibold tracking-[-0.03em] text-white tabular-nums">
                {formatClock(time.value.value) ?? "—"}
            </p>
            {delay !== null && delay !== 0 ? (
                <p className={cn("mt-1 font-mono text-[11px] tabular-nums", delay > 0 ? "text-amber-200" : "text-emerald-200")}>
                    {delay > 0 ? "+" : ""}
                    {delay} min · sched {formatClock(scheduled.value) ?? "—"}
                </p>
            ) : null}
            <p className="mt-2 truncate text-[13px] leading-5 text-neutral-200">{stationName(station, stationFallback)}</p>
            {kanji ? <p className="truncate text-[11px] leading-4 text-neutral-500">{kanji}</p> : null}
            <div className={cn("mt-1.5 flex flex-wrap items-center gap-1", align === "right" && "justify-end")}>
                <BasisChip basis={time.value.basis} confidence={time.value.confidence} />
                <SourceRefs sourceIds={time.value.sourceIds} sources={citations.sources} indexes={citations.indexes} />
            </div>
        </div>
    );
}

function FactTile({
    label,
    value,
    prominent = false,
    citations,
}: {
    readonly label: string;
    readonly value: SourcedValue<string>;
    readonly prominent?: boolean;
    readonly citations: Citations;
}) {
    const published = value.value !== null;
    const needsCare = value.basis === "inferred";
    // Loud styling is a claim of its own: reserve it for values an operator source actually backs.
    const confirmed = published && isOfficialBasis(value.basis);

    return (
        <div
            className={cn(
                "min-w-0 rounded-lg border px-2.5 py-2",
                prominent && confirmed && "border-amber-300/30 bg-amber-300/8",
                prominent && published && !confirmed && "border-white/12 bg-white/[0.03]",
                !(prominent && published) && "border-white/8 bg-white/[0.02]",
            )}
        >
            <p className="flex items-center gap-1 font-mono text-[9px] tracking-[0.14em] text-neutral-500 uppercase">
                {label}
                {needsCare ? (
                    <span aria-label="Unverified" title="Unverified — check at the station" className="size-1 rounded-full bg-amber-300" />
                ) : null}
            </p>
            <p
                className={cn(
                    "mt-0.5 truncate font-mono tabular-nums",
                    !published && "text-[13px] text-neutral-600",
                    published && prominent && "text-2xl leading-7 font-semibold",
                    published && prominent && (confirmed ? "text-amber-100" : "text-neutral-200"),
                    published && !prominent && "text-[13px] text-neutral-100",
                )}
                title={value.value ?? undefined}
            >
                {value.value ?? "—"}
            </p>
            {prominent && published ? (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                    <BasisChip basis={value.basis} confidence={value.confidence} />
                    <SourceRefs sourceIds={value.sourceIds} sources={citations.sources} indexes={citations.indexes} />
                </div>
            ) : null}
        </div>
    );
}

function EvidenceRow({
    label,
    value,
    citations,
    isClock = false,
}: {
    readonly label: string;
    readonly value: SourcedValue<string>;
    readonly citations: Citations;
    readonly isClock?: boolean;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-1.5">
            <div className="min-w-0">
                <p className="text-[11px] text-neutral-400">{label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                    <BasisChip basis={value.basis} confidence={value.confidence} />
                    <SourceRefs sourceIds={value.sourceIds} sources={citations.sources} indexes={citations.indexes} />
                    <AsOf value={value} />
                </div>
                {value.note ? <p className="mt-1 text-[11px] leading-4 text-neutral-600">{value.note}</p> : null}
            </div>
            <span className="font-mono text-[13px] text-neutral-200 tabular-nums">
                {(isClock ? formatClock(value.value) : value.value) ?? "—"}
            </span>
        </div>
    );
}

function LegCard({
    leg,
    index,
    legCount,
    citations,
}: {
    readonly leg: TransitLeg;
    readonly index: number;
    readonly legCount: number;
    readonly citations: Citations;
}) {
    const departure = primaryTime(leg.scheduledDeparture, leg.estimatedDeparture, leg.actualDeparture);
    const arrival = primaryTime(leg.scheduledArrival, leg.estimatedArrival, leg.actualArrival);
    const duration = minuteDelta(departure.value.value, arrival.value.value);
    const service = [leg.trainName.value, leg.trainNumber.value].filter(Boolean).join(" ") || "Rail service";
    const context = [leg.operator.value, leg.line.value, leg.serviceDate.value].filter(Boolean).join(" · ");

    return (
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/60">
            <header className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                    <Train weight="fill" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-100">{service}</p>
                    {context ? <p className="truncate text-[11px] text-neutral-500">{context}</p> : null}
                </div>
                {legCount > 1 ? (
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-neutral-400 tabular-nums">
                        Leg {index + 1}/{legCount}
                    </span>
                ) : null}
            </header>

            <div className="p-4">
                <div className="flex items-start gap-3">
                    <TimeBlock
                        label="Depart"
                        station={leg.origin}
                        stationFallback="Origin not found"
                        time={departure}
                        scheduled={leg.scheduledDeparture}
                        align="left"
                        citations={citations}
                    />
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-5">
                        {duration !== null && duration > 0 ? (
                            <span className="font-mono text-[10px] text-neutral-500 tabular-nums">{formatDuration(duration)}</span>
                        ) : null}
                        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-emerald-400/25 via-amber-300/60 to-emerald-400/25" />
                    </div>
                    <TimeBlock
                        label="Arrive"
                        station={leg.destination}
                        stationFallback="Destination not found"
                        time={arrival}
                        scheduled={leg.scheduledArrival}
                        align="right"
                        citations={citations}
                    />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-1">
                        <FactTile label="Platform" value={leg.departurePlatform} prominent citations={citations} />
                    </div>
                    <FactTile label="Car" value={leg.carNumber} citations={citations} />
                    <FactTile label="Seat" value={leg.seat} citations={citations} />
                    <FactTile label="Ticket" value={leg.reservationType} citations={citations} />
                </div>

                <details className="group mt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-[11px] text-neutral-500 transition-colors hover:text-neutral-300">
                        <CaretDown className="size-3 transition-transform group-open:rotate-180" />
                        Timings & evidence
                    </summary>
                    <div className="mt-1 divide-y divide-white/6 border-t border-white/6">
                        <EvidenceRow label="Scheduled departure" value={leg.scheduledDeparture} citations={citations} isClock />
                        <EvidenceRow label="Estimated departure" value={leg.estimatedDeparture} citations={citations} isClock />
                        <EvidenceRow label="Actual departure" value={leg.actualDeparture} citations={citations} isClock />
                        <EvidenceRow label="Scheduled arrival" value={leg.scheduledArrival} citations={citations} isClock />
                        <EvidenceRow label="Estimated arrival" value={leg.estimatedArrival} citations={citations} isClock />
                        <EvidenceRow label="Actual arrival" value={leg.actualArrival} citations={citations} isClock />
                        <EvidenceRow label="Arrival platform" value={leg.arrivalPlatform} citations={citations} />
                        <EvidenceRow label="Departure platform" value={leg.departurePlatform} citations={citations} />
                    </div>
                </details>
            </div>
        </article>
    );
}

function StepList({
    steps,
    tone,
    citations,
}: {
    readonly steps: readonly TransitBrief["transfers"][number]["instructions"][number][];
    readonly tone: "sky" | "amber";
    readonly citations: Citations;
}) {
    return (
        <ol className="space-y-3">
            {steps.map((step, index) => (
                <li key={`${step.instructionEn}-${index}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2.5">
                    <span
                        className={cn(
                            "mt-px flex size-6 items-center justify-center rounded-full border font-mono text-[10px] tabular-nums",
                            tone === "sky" ? "border-sky-200/20 text-sky-100" : "border-amber-300/30 bg-amber-300/8 text-amber-200",
                        )}
                    >
                        {index + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] leading-6 text-neutral-100">{step.instructionEn}</p>
                        {step.signTextJa.length > 0 ? (
                            <p
                                className={cn(
                                    "mt-1 flex items-start gap-1.5 text-[13px] leading-5",
                                    tone === "sky" ? "text-sky-100" : "text-amber-200",
                                )}
                            >
                                <Signpost className="mt-0.5 size-3.5 shrink-0" />
                                <span className="font-medium">{step.signTextJa.join(" · ")}</span>
                            </p>
                        ) : null}
                        {[step.landmark, step.floorChange, step.accessibilityNote].some(Boolean) ? (
                            <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                                {[step.landmark, step.floorChange, step.accessibilityNote].filter(Boolean).join(" · ")}
                            </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                            <BasisChip basis={step.evidence.basis} confidence={step.evidence.confidence} />
                            <SourceRefs sourceIds={step.evidence.sourceIds} sources={citations.sources} indexes={citations.indexes} />
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export function TransitBriefView({ brief }: { readonly brief: TransitBrief }) {
    const [showFullSummary, setShowFullSummary] = useState(false);
    const citations: Citations = {
        sources: new Map(brief.sources.map((source) => [source.id, source])),
        indexes: new Map(brief.sources.map((source, index) => [source.id, index + 1])),
    };
    const minutesUntilDeparture = departureProximity(brief);
    const imminent = minutesUntilDeparture !== null && minutesUntilDeparture >= 0 && minutesUntilDeparture <= 30;
    const urgentAlerts = brief.alerts.filter((alert) => alert.severity !== "info");
    // A critical alert already says the train has gone; do not repeat it in a derived banner.
    const departed = minutesUntilDeparture !== null && minutesUntilDeparture < 0 && urgentAlerts.length === 0;
    const infoAlerts = brief.alerts.filter((alert) => alert.severity === "info");
    const isLongSummary = brief.summary.length > 260;
    // "Verified" has to mean an operator source exists; the traveler's own screenshot cannot verify itself.
    const hasOfficialSource = brief.sources.some((source) => isOfficialBasis(source.basis));

    function renderAlerts(alerts: typeof brief.alerts) {
        return alerts.map((alert, index) => (
            <div
                key={`${alert.title}-${index}`}
                className={cn(
                    "rounded-xl border px-3.5 py-3",
                    alert.severity === "critical"
                        ? "border-red-400/30 bg-red-400/8"
                        : alert.severity === "warning"
                          ? "border-amber-400/30 bg-amber-400/8"
                          : "border-white/8 bg-white/[0.02]",
                )}
            >
                <p className="flex items-start gap-2 text-[13px] font-medium text-neutral-100">
                    <Warning
                        className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            alert.severity === "critical"
                                ? "text-red-300"
                                : alert.severity === "warning"
                                  ? "text-amber-300"
                                  : "text-sky-300",
                        )}
                        weight="fill"
                    />
                    <span className="min-w-0 flex-1">{alert.title}</span>
                </p>
                <p className="mt-1 pl-5.5 text-[13px] leading-6 text-neutral-400">
                    {alert.message} <SourceRefs sourceIds={alert.sourceIds} sources={citations.sources} indexes={citations.indexes} />
                </p>
            </div>
        ));
    }

    return (
        <div className="space-y-3" aria-live="polite">
            <div className="flex items-center justify-between gap-3 px-0.5">
                {hasOfficialSource ? (
                    <p className="font-mono text-[10px] tracking-[0.16em] text-emerald-300/70 uppercase">Verified brief</p>
                ) : (
                    <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-amber-300/90 uppercase">
                        <Warning className="size-3" weight="fill" /> Unverified brief
                    </p>
                )}
                <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
                    Checked {TOKYO_CLOCK_FORMAT.format(new Date(brief.generatedAt))} JST
                </span>
            </div>

            {hasOfficialSource ? null : (
                <p className="rounded-xl border border-amber-300/25 bg-amber-300/8 px-3.5 py-3 text-[13px] leading-6 text-amber-100">
                    No official operator source backs this brief — every value below is repeated from your own screenshot. Confirm the
                    train, time, and platform on the station departure board before you board.
                </p>
            )}

            {imminent || departed ? (
                <p
                    className={cn(
                        "rounded-xl border px-3.5 py-3 text-[13px] leading-6",
                        imminent
                            ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                            : "border-white/10 bg-white/[0.03] text-neutral-300",
                    )}
                >
                    {imminent
                        ? `Departure is in ${minutesUntilDeparture} min — confirm the platform on the station board now.`
                        : "This departure has passed. Treat schedule and platform details as historical unless an operator report says otherwise."}
                </p>
            ) : null}

            {urgentAlerts.length > 0 ? (
                <section className="space-y-2" aria-label="Service alerts">
                    {renderAlerts(urgentAlerts)}
                </section>
            ) : null}

            {brief.legs.map((leg, index) => (
                <LegCard
                    key={`${leg.trainNumber.value ?? "leg"}-${index}`}
                    leg={leg}
                    index={index}
                    legCount={brief.legs.length}
                    citations={citations}
                />
            ))}

            <section className="rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.03] p-4">
                <p className="font-mono text-[10px] tracking-[0.14em] text-emerald-300/70 uppercase">What Luna found</p>
                <p className={cn("mt-2 text-[13px] leading-6 text-neutral-300", isLongSummary && !showFullSummary && "line-clamp-4")}>
                    {brief.summary}
                </p>
                {isLongSummary ? (
                    <button
                        type="button"
                        onClick={() => setShowFullSummary((value) => !value)}
                        className="mt-1.5 text-[11px] text-amber-200/90 transition-colors hover:text-amber-100"
                    >
                        {showFullSummary ? "Show less" : "Read the full brief"}
                    </button>
                ) : null}
            </section>

            {brief.transfers.length > 0 ? (
                <section className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.04] p-4" aria-label="Transfer directions">
                    <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-sky-200/80 uppercase">
                        <Train className="size-3.5" /> Transfers
                    </p>
                    <div className="mt-4 space-y-5">
                        {brief.transfers.map((transfer, transferIndex) => (
                            <article key={`${transfer.atStation.nameEn}-${transferIndex}`}>
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h3 className="text-base font-medium text-white">
                                        At {transfer.atStation.nameEn}
                                        {transfer.atStation.nameJa && transfer.atStation.nameJa !== transfer.atStation.nameEn ? (
                                            <span className="ml-1.5 text-[13px] text-neutral-500">{transfer.atStation.nameJa}</span>
                                        ) : null}
                                    </h3>
                                    {transfer.minimumMinutes === null ? null : (
                                        <span className="rounded-full border border-sky-200/15 px-2 py-0.5 font-mono text-[11px] text-sky-100 tabular-nums">
                                            ≥ {transfer.minimumMinutes} min
                                        </span>
                                    )}
                                </div>
                                {transfer.warning ? <p className="mt-1.5 text-[13px] text-amber-200">{transfer.warning}</p> : null}
                                <div className="mt-3">
                                    <StepList steps={transfer.instructions} tone="sky" citations={citations} />
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}

            {brief.wayfinding ? (
                <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-amber-300/80 uppercase">
                            <Compass className="size-3.5" /> Station approach
                        </p>
                        {brief.wayfinding.estimatedWalkMinutes ? (
                            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] text-neutral-300 tabular-nums">
                                ≈ {brief.wayfinding.estimatedWalkMinutes} min walk
                            </span>
                        ) : null}
                    </div>
                    <h3 className="mt-2 text-base leading-6 font-medium text-white">
                        {brief.wayfinding.fromLabel} <span className="text-neutral-600">→</span> {brief.wayfinding.targetLabel}
                    </h3>
                    <div className="mt-4">
                        <StepList steps={brief.wayfinding.steps} tone="amber" citations={citations} />
                    </div>
                    {brief.wayfinding.caveats.length > 0 ? (
                        <ul className="mt-4 space-y-1 border-t border-white/8 pt-3 text-[11px] leading-5 text-neutral-500">
                            {brief.wayfinding.caveats.map((caveat) => (
                                <li key={caveat}>· {caveat}</li>
                            ))}
                        </ul>
                    ) : null}
                </section>
            ) : null}

            <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
                <p className="flex items-center gap-2 text-[13px] font-medium text-amber-100">
                    <CheckCircle className="size-4" weight="fill" /> Verify at the station
                </p>
                <ul className="mt-2.5 space-y-1.5 text-[13px] leading-6 text-neutral-300">
                    {brief.verificationSteps.map((step) => (
                        <li key={step} className="flex gap-2">
                            <span aria-hidden className="text-amber-300">
                                →
                            </span>
                            <span className="min-w-0 flex-1">{step}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {brief.officialActions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {brief.officialActions.map((action) => (
                        <a
                            key={`${action.kind}-${action.url}`}
                            href={action.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[13px] text-neutral-200 transition-colors hover:border-amber-300/30 hover:text-amber-100"
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <MapPin className="size-3.5 shrink-0 text-neutral-500" />
                                <span className="truncate">{action.label}</span>
                            </span>
                            <ArrowSquareOut className="size-3.5 shrink-0" />
                        </a>
                    ))}
                </div>
            ) : null}

            {infoAlerts.length > 0 ? (
                <section className="space-y-2" aria-label="Service notes">
                    {renderAlerts(infoAlerts)}
                </section>
            ) : null}

            {brief.unresolvedQuestions.length > 0 ? (
                <section className="rounded-xl border border-white/8 px-3.5 py-3">
                    <p className="text-[11px] font-medium tracking-[0.1em] text-neutral-400 uppercase">Still unresolved</p>
                    <ul className="mt-1.5 space-y-1 text-[13px] leading-6 text-neutral-500">
                        {brief.unresolvedQuestions.map((question) => (
                            <li key={question}>· {question}</li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <details className="group rounded-xl border border-white/8 bg-black/15 px-3.5 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] text-neutral-300">
                    <CaretDown className="size-3 transition-transform group-open:rotate-180" />
                    Sources · {brief.sources.length}
                </summary>
                <ol className="mt-3 space-y-2.5">
                    {brief.sources.map((source, index) => (
                        <li key={source.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
                            <span className="font-mono text-[11px] text-neutral-600 tabular-nums">[{index + 1}]</span>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] text-neutral-200">{source.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <BasisChip basis={source.basis} />
                                    <span className="truncate font-mono text-[10px] text-neutral-600">{source.publisher}</span>
                                    {source.url ? (
                                        <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] text-amber-200/90 underline underline-offset-2 hover:text-amber-100"
                                        >
                                            Open
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            </details>
        </div>
    );
}
