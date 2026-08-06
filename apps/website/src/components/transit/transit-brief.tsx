import type { EvidenceBasis, SourcedValue, StationRef, TransitBrief, TransitSource } from "@/lib/transit/types";
import { ArrowSquareOut, CheckCircle, Clock, Compass, MapPin, Signpost, Train, Warning } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";

const BASIS_LABELS: Record<EvidenceBasis, string> = {
    reservation: "Reservation",
    operator_live: "Operator live report",
    operator_timetable: "Official schedule",
    official_station_map: "Official station map",
    user_route_plan: "Your route plan",
    inferred: "Inferred · verify",
    unavailable: "Not published",
};

const BASIS_STYLES: Record<EvidenceBasis, string> = {
    reservation: "border-sky-400/35 bg-sky-400/8 text-sky-200",
    operator_live: "border-emerald-400/35 bg-emerald-400/8 text-emerald-200",
    operator_timetable: "border-blue-400/35 bg-blue-400/8 text-blue-200",
    official_station_map: "border-teal-400/35 bg-teal-400/8 text-teal-200",
    user_route_plan: "border-violet-400/35 bg-violet-400/8 text-violet-200",
    inferred: "border-amber-400/40 bg-amber-400/8 text-amber-200",
    unavailable: "border-white/10 bg-white/3 text-neutral-400",
};

function EvidenceBadge({ basis, confidence }: { readonly basis: EvidenceBasis; readonly confidence?: string }) {
    return (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] leading-4 font-medium", BASIS_STYLES[basis])}>
            {BASIS_LABELS[basis]}
            {confidence === "low" && basis !== "unavailable" ? " · low confidence" : ""}
        </span>
    );
}

function SourceIdLinks({
    sourceIds,
    sources,
}: {
    readonly sourceIds: readonly string[];
    readonly sources: ReadonlyMap<string, TransitSource>;
}) {
    const cited = sourceIds.flatMap((sourceId) => {
        const source = sources.get(sourceId);

        return source ? [source] : [];
    });

    if (cited.length === 0) {
        return null;
    }

    return (
        <span className="inline-flex items-center gap-1">
            {cited.map((source) =>
                source.url ? (
                    <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open source: ${source.title}`}
                        className="rounded px-1 font-mono text-[10px] text-amber-200 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-100"
                    >
                        source
                    </a>
                ) : (
                    <span key={source.id} className="font-mono text-[10px] text-neutral-500">
                        screenshot
                    </span>
                ),
            )}
        </span>
    );
}

function CitationLinks({
    value,
    sources,
}: {
    readonly value: SourcedValue<unknown>;
    readonly sources: ReadonlyMap<string, TransitSource>;
}) {
    return <SourceIdLinks sourceIds={value.sourceIds} sources={sources} />;
}

function SourceTimestamp({ value }: { readonly value: SourcedValue<unknown> }) {
    if (!value.sourceAsOf) {
        return null;
    }

    const timestamp = new Date(value.sourceAsOf);
    if (Number.isNaN(timestamp.getTime())) {
        return null;
    }

    return (
        <span className="font-mono text-[10px] text-neutral-500">
            as of {timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })} JST
        </span>
    );
}

function Fact<T>({
    label,
    value,
    sources,
    format,
    prominent = false,
}: {
    readonly label: string;
    readonly value: SourcedValue<T>;
    readonly sources: ReadonlyMap<string, TransitSource>;
    readonly format: (value: T) => string;
    readonly prominent?: boolean;
}) {
    const display = value.value === null ? "Not published" : format(value.value);

    return (
        <div className="min-w-0 border-l border-white/10 pl-3">
            <p className="text-[10px] tracking-[0.12em] text-neutral-500 uppercase">{label}</p>
            <p className={cn("mt-1 truncate font-mono text-neutral-100", prominent ? "text-xl font-semibold" : "text-sm")}>{display}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <EvidenceBadge basis={value.basis} confidence={value.confidence} />
                <CitationLinks value={value} sources={sources} />
                <SourceTimestamp value={value} />
            </div>
            {value.note ? <p className="mt-1.5 text-[11px] leading-4 text-neutral-500">{value.note}</p> : null}
        </div>
    );
}

function minutesFromClock(value: string | null) {
    const match = value?.match(/^(\d{1,2}):(\d{2})/u);
    if (!match) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

function delayFromSchedule(scheduled: string | null, reported: string | null) {
    const scheduledMinutes = minutesFromClock(scheduled);
    const reportedMinutes = minutesFromClock(reported);
    if (scheduledMinutes === null || reportedMinutes === null) {
        return null;
    }

    let difference = reportedMinutes - scheduledMinutes;
    if (difference < -12 * 60) difference += 24 * 60;
    if (difference > 12 * 60) difference -= 24 * 60;

    return difference;
}

function departureProximity(brief: TransitBrief) {
    const leg = brief.legs[0];
    const date = leg?.serviceDate.value;
    const time = leg?.estimatedDeparture.value ?? leg?.scheduledDeparture.value;
    if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/u.test(date) || !/^\d{1,2}:\d{2}/u.test(time)) {
        return null;
    }

    const departure = new Date(`${date}T${time.slice(0, 5)}:00+09:00`);
    if (Number.isNaN(departure.getTime())) {
        return null;
    }

    return Math.round((departure.getTime() - Date.now()) / 60_000);
}

function stationLabel(station: StationRef) {
    return `${station.nameEn}${station.nameJa && station.nameJa !== station.nameEn ? ` · ${station.nameJa}` : ""}`;
}

function TimeColumn({
    label,
    scheduled,
    estimated,
    actual,
    sources,
}: {
    readonly label: string;
    readonly scheduled: SourcedValue<string>;
    readonly estimated: SourcedValue<string>;
    readonly actual: SourcedValue<string>;
    readonly sources: ReadonlyMap<string, TransitSource>;
}) {
    const primary = actual.value ? actual : estimated.value ? estimated : scheduled;
    const primaryLabel = actual.value ? "Actual" : estimated.value ? "Operator estimate" : "Scheduled";
    const delay = delayFromSchedule(scheduled.value, actual.value ?? estimated.value);
    const rows = [
        { label: "Scheduled", value: scheduled },
        { label: "Operator estimate", value: estimated },
        { label: "Actual", value: actual },
    ] as const;

    return (
        <div className="rounded-xl border border-white/8 bg-black/20 p-4">
            <p className="flex items-center gap-2 text-[10px] tracking-[0.14em] text-neutral-500 uppercase">
                <Clock className="size-3.5" /> {label}
            </p>
            <p className="mt-2 font-mono text-3xl leading-none font-semibold tracking-[-0.04em] text-white">{primary.value ?? "—"}</p>
            <p className="mt-1 text-[11px] text-neutral-400">
                {primaryLabel}
                {delay === null || delay === 0 ? "" : ` · ${delay > 0 ? "+" : ""}${delay} min vs schedule`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <EvidenceBadge basis={primary.basis} confidence={primary.confidence} />
                <CitationLinks value={primary} sources={sources} />
                <SourceTimestamp value={primary} />
            </div>
            <div className="mt-4 divide-y divide-white/6 border-t border-white/6">
                {rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2 text-xs">
                        <div className="min-w-0">
                            <span className="text-neutral-500">{row.label}</span>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <EvidenceBadge basis={row.value.basis} confidence={row.value.confidence} />
                                <CitationLinks value={row.value} sources={sources} />
                                <SourceTimestamp value={row.value} />
                            </div>
                        </div>
                        <span className="font-mono text-sm text-neutral-200">{row.value.value ?? "—"}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TransitBriefView({ brief }: { readonly brief: TransitBrief }) {
    const sources = new Map(brief.sources.map((source) => [source.id, source]));
    const minutesUntilDeparture = departureProximity(brief);
    const imminentDeparture = minutesUntilDeparture !== null && minutesUntilDeparture >= 0 && minutesUntilDeparture <= 30;
    const departed = minutesUntilDeparture !== null && minutesUntilDeparture < 0;

    return (
        <div className="space-y-5" aria-live="polite">
            <section className="overflow-hidden rounded-[1.4rem] border border-emerald-300/18 bg-[linear-gradient(145deg,rgba(5,28,23,.92),rgba(8,12,11,.96)_55%,rgba(31,23,5,.88))] shadow-[0_25px_90px_rgba(0,0,0,.38)]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-4 md:px-6">
                    <div>
                        <p className="font-mono text-[10px] tracking-[0.18em] text-emerald-300/70 uppercase">Verified journey brief</p>
                        <h2 className="mt-2 max-w-3xl text-2xl leading-tight font-[var(--font-display)] tracking-[-0.025em] text-white md:text-3xl">
                            {brief.summary}
                        </h2>
                    </div>
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 font-mono text-[10px] text-emerald-200">
                        Checked{" "}
                        {new Date(brief.generatedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Tokyo",
                        })}{" "}
                        JST
                    </div>
                </div>

                <div className="space-y-7 p-5 md:p-6">
                    {imminentDeparture || departed ? (
                        <div
                            className={cn(
                                "rounded-xl border px-4 py-3 text-sm leading-5",
                                imminentDeparture
                                    ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                                    : "border-white/10 bg-white/[0.035] text-neutral-300",
                            )}
                        >
                            <p className="font-medium">
                                {imminentDeparture
                                    ? `Departure is within ${minutesUntilDeparture} minutes — verify the platform and time on the station departure board now.`
                                    : "This departure time has passed. Treat schedule and platform details as historical unless an actual operator report says otherwise."}
                            </p>
                        </div>
                    ) : null}
                    {brief.legs.map((leg, index) => (
                        <article key={`${leg.trainNumber.value ?? "leg"}-${index}`} className="space-y-5">
                            <div className="flex items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                                    <Train weight="fill" className="size-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-neutral-100">
                                        {[leg.trainName.value, leg.trainNumber.value].filter(Boolean).join(" ") || "Rail service"}
                                    </p>
                                    <p className="truncate text-xs text-neutral-500">
                                        {[leg.operator.value, leg.line.value, leg.serviceDate.value].filter(Boolean).join(" · ")}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div>
                                    <p className="font-mono text-[10px] tracking-[0.12em] text-neutral-500 uppercase">From</p>
                                    <p className="mt-1 text-lg text-white">
                                        {leg.origin.value ? stationLabel(leg.origin.value) : "Origin not found"}
                                    </p>
                                </div>
                                <div className="hidden h-px w-16 bg-gradient-to-r from-emerald-400/20 via-amber-300/70 to-emerald-400/20 md:block" />
                                <div className="md:text-right">
                                    <p className="font-mono text-[10px] tracking-[0.12em] text-neutral-500 uppercase">To</p>
                                    <p className="mt-1 text-lg text-white">
                                        {leg.destination.value ? stationLabel(leg.destination.value) : "Destination not found"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <TimeColumn
                                    label="Departure"
                                    scheduled={leg.scheduledDeparture}
                                    estimated={leg.estimatedDeparture}
                                    actual={leg.actualDeparture}
                                    sources={sources}
                                />
                                <TimeColumn
                                    label="Arrival"
                                    scheduled={leg.scheduledArrival}
                                    estimated={leg.estimatedArrival}
                                    actual={leg.actualArrival}
                                    sources={sources}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                <Fact
                                    label="Departure platform"
                                    value={leg.departurePlatform}
                                    sources={sources}
                                    format={(value) => value}
                                    prominent
                                />
                                <Fact label="Arrival platform" value={leg.arrivalPlatform} sources={sources} format={(value) => value} />
                                <Fact label="Car" value={leg.carNumber} sources={sources} format={(value) => value} />
                                <Fact label="Seat" value={leg.seat} sources={sources} format={(value) => value} />
                                <Fact label="Reservation" value={leg.reservationType} sources={sources} format={(value) => value} />
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {brief.alerts.length > 0 ? (
                <section className="space-y-2" aria-label="Service alerts">
                    {brief.alerts.map((alert, index) => (
                        <div
                            key={`${alert.title}-${index}`}
                            className={cn(
                                "rounded-xl border px-4 py-3",
                                alert.severity === "critical"
                                    ? "border-red-400/30 bg-red-400/8"
                                    : alert.severity === "warning"
                                      ? "border-amber-400/30 bg-amber-400/8"
                                      : "border-sky-400/25 bg-sky-400/7",
                            )}
                        >
                            <p className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                                <Warning className="size-4" weight="fill" /> {alert.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-neutral-400">{alert.message}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {alert.sourceAsOf ? (
                                    <span className="font-mono text-[10px] text-neutral-500">
                                        Reported{" "}
                                        {new Date(alert.sourceAsOf).toLocaleTimeString("en-GB", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            timeZone: "Asia/Tokyo",
                                        })}{" "}
                                        JST
                                    </span>
                                ) : null}
                                <SourceIdLinks sourceIds={alert.sourceIds} sources={sources} />
                            </div>
                        </div>
                    ))}
                </section>
            ) : null}

            {brief.transfers.length > 0 ? (
                <section
                    className="rounded-[1.2rem] border border-sky-300/15 bg-sky-300/[0.035] p-5 md:p-6"
                    aria-label="Transfer directions"
                >
                    <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-sky-200/80 uppercase">
                        <Train className="size-3.5" /> Transfers
                    </p>
                    <div className="mt-5 space-y-6">
                        {brief.transfers.map((transfer, transferIndex) => (
                            <article key={`${transfer.atStation.nameEn}-${transferIndex}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-xl font-[var(--font-display)] text-white">At {stationLabel(transfer.atStation)}</h3>
                                    {transfer.minimumMinutes === null ? null : (
                                        <span className="rounded-full border border-sky-200/15 px-3 py-1 font-mono text-xs text-sky-100">
                                            Allow at least {transfer.minimumMinutes} min
                                        </span>
                                    )}
                                </div>
                                {transfer.warning ? <p className="mt-2 text-sm text-amber-200">{transfer.warning}</p> : null}
                                <ol className="mt-4 space-y-3">
                                    {transfer.instructions.map((step, index) => (
                                        <li key={`${step.instructionEn}-${index}`} className="grid grid-cols-[26px_1fr] gap-3">
                                            <span className="flex size-6 items-center justify-center rounded-full border border-sky-200/20 font-mono text-[10px] text-sky-100">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="text-sm leading-6 text-neutral-100">{step.instructionEn}</p>
                                                {step.signTextJa.length > 0 ? (
                                                    <p className="mt-1 font-mono text-sm text-sky-100">{step.signTextJa.join(" · ")}</p>
                                                ) : null}
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <EvidenceBadge basis={step.evidence.basis} confidence={step.evidence.confidence} />
                                                    <CitationLinks value={step.evidence} sources={sources} />
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}

            {brief.wayfinding ? (
                <section className="rounded-[1.2rem] border border-white/8 bg-white/[0.025] p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-amber-300/80 uppercase">
                                <Compass className="size-3.5" /> Station approach
                            </p>
                            <h3 className="mt-2 text-2xl font-[var(--font-display)] text-white">
                                {brief.wayfinding.fromLabel} → {brief.wayfinding.targetLabel}
                            </h3>
                        </div>
                        {brief.wayfinding.estimatedWalkMinutes ? (
                            <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-neutral-300">
                                ≈ {brief.wayfinding.estimatedWalkMinutes} min
                            </span>
                        ) : null}
                    </div>

                    <ol className="mt-6 space-y-0">
                        {brief.wayfinding.steps.map((step, index) => (
                            <li key={`${step.instructionEn}-${index}`} className="grid grid-cols-[34px_1fr] gap-3">
                                <div className="flex flex-col items-center">
                                    <span className="flex size-8 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/8 font-mono text-xs text-amber-200">
                                        {index + 1}
                                    </span>
                                    {index < brief.wayfinding!.steps.length - 1 ? (
                                        <span className="min-h-10 w-px flex-1 bg-white/10" />
                                    ) : null}
                                </div>
                                <div className="pb-5">
                                    <p className="text-sm leading-6 text-neutral-100">{step.instructionEn}</p>
                                    {step.signTextJa.length > 0 ? (
                                        <p className="mt-2 flex items-start gap-2 font-mono text-sm text-amber-200">
                                            <Signpost className="mt-0.5 size-4 shrink-0" /> {step.signTextJa.join(" · ")}
                                        </p>
                                    ) : null}
                                    {[step.landmark, step.floorChange, step.accessibilityNote].some(Boolean) ? (
                                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                                            {[step.landmark, step.floorChange, step.accessibilityNote].filter(Boolean).join(" · ")}
                                        </p>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <EvidenceBadge basis={step.evidence.basis} confidence={step.evidence.confidence} />
                                        <CitationLinks value={step.evidence} sources={sources} />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {brief.wayfinding.caveats.length > 0 ? (
                        <div className="border-t border-white/8 pt-4 text-xs leading-5 text-neutral-500">
                            {brief.wayfinding.caveats.map((caveat) => (
                                <p key={caveat}>• {caveat}</p>
                            ))}
                        </div>
                    ) : null}
                </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-100">
                        <CheckCircle className="size-4" weight="fill" /> Verify at the station
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-5 text-neutral-300">
                        {brief.verificationSteps.map((step) => (
                            <li key={step} className="flex gap-2">
                                <span aria-hidden className="text-amber-300">
                                    →
                                </span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                        <MapPin className="size-4" /> Official actions
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                        {brief.officialActions.map((action) => (
                            <a
                                key={`${action.kind}-${action.url}`}
                                href={action.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-amber-300/30 hover:text-amber-100"
                            >
                                {action.label}
                                <ArrowSquareOut className="size-4" />
                            </a>
                        ))}
                        {brief.officialActions.length === 0 ? (
                            <p className="text-sm text-neutral-500">No official action link was verified.</p>
                        ) : null}
                    </div>
                </div>
            </section>

            <details className="rounded-xl border border-white/8 bg-black/15 p-4">
                <summary className="cursor-pointer text-sm font-medium text-neutral-200">
                    Sources and evidence · {brief.sources.length}
                </summary>
                <div className="mt-4 space-y-3">
                    {brief.sources.map((source) => (
                        <div
                            key={source.id}
                            className="grid gap-1 border-t border-white/6 pt-3 first:border-0 first:pt-0 md:grid-cols-[1fr_auto]"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm text-neutral-200">{source.title}</p>
                                <p className="text-xs text-neutral-500">{source.publisher}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <EvidenceBadge basis={source.basis} />
                                {source.url ? (
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-amber-200 underline underline-offset-2"
                                    >
                                        Open
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </details>

            {brief.unresolvedQuestions.length > 0 ? (
                <section className="rounded-xl border border-white/8 px-4 py-3 text-sm text-neutral-400">
                    <p className="font-medium text-neutral-200">Still unresolved</p>
                    {brief.unresolvedQuestions.map((question) => (
                        <p key={question} className="mt-1">
                            • {question}
                        </p>
                    ))}
                </section>
            ) : null}
        </div>
    );
}
