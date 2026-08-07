"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { shiftDate } from "@/lib/calendar";
import { clockToMinutes, minutesToClock, type DepartureWindow } from "@/lib/transit/departure";
import { ArrowRight, Clock, X } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";

const OFFSET_CHOICES = [
    { minutes: 0, label: "Now" },
    { minutes: 15, label: "+15m" },
    { minutes: 30, label: "+30m" },
    { minutes: 60, label: "+1h" },
] as const;

export interface TransitWhenFieldProps {
    readonly travelDate: string | null;
    readonly onTravelDateChange: (value: string | null) => void;
    readonly departure: DepartureWindow;
    readonly onDepartureChange: (value: DepartureWindow) => void;
    /** Today in Asia/Tokyo, YYYY-MM-DD. */
    readonly today: string;
    /** Current Asia/Tokyo wall clock, HH:MM. */
    readonly nowClock: string;
    readonly disabled?: boolean;
}

function Chip({
    active,
    onClick,
    children,
    disabled,
}: {
    readonly active: boolean;
    readonly onClick: () => void;
    readonly children: React.ReactNode;
    readonly disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "focus-visible:ring-ring/50 h-8 cursor-pointer rounded-full border px-3 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                active
                    ? "border-amber-300/45 bg-amber-300/12 font-medium text-amber-100"
                    : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200",
            )}
        >
            {children}
        </button>
    );
}

function TimeInput({
    value,
    onChange,
    label,
    disabled,
}: {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly label: string;
    readonly disabled?: boolean;
}) {
    return (
        <input
            type="time"
            value={value}
            aria-label={label}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className="border-input bg-input/24 focus-visible:ring-ring/40 h-9 rounded-lg border px-2.5 font-mono text-sm text-neutral-100 tabular-nums outline-none focus-visible:ring-2 [&::-webkit-calendar-picker-indicator]:opacity-50"
        />
    );
}

export function TransitWhenField({
    travelDate,
    onTravelDateChange,
    departure,
    onDepartureChange,
    today,
    nowClock,
    disabled = false,
}: TransitWhenFieldProps) {
    const relativeMinutes = departure.kind === "relative" ? departure.minutes : null;
    const departureClock = relativeMinutes === null ? null : clockToMinutes(nowClock) + relativeMinutes;
    const rollsOver = departureClock !== null && departureClock >= 1440;

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Departure window">
                <Chip active={departure.kind === "as_booked"} disabled={disabled} onClick={() => onDepartureChange({ kind: "as_booked" })}>
                    As booked
                </Chip>
                {OFFSET_CHOICES.map((choice) => (
                    <Chip
                        key={choice.minutes}
                        active={relativeMinutes === choice.minutes}
                        disabled={disabled}
                        onClick={() => onDepartureChange({ kind: "relative", minutes: choice.minutes })}
                    >
                        {choice.label}
                    </Chip>
                ))}
                <Chip
                    active={departure.kind === "range"}
                    disabled={disabled}
                    onClick={() => onDepartureChange({ kind: "range", after: minutesToClock(clockToMinutes(nowClock) + 30), before: null })}
                >
                    <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" /> Time
                    </span>
                </Chip>
            </div>

            {departure.kind === "relative" ? (
                <p className="text-[11px] leading-4 text-neutral-500">
                    Next services from{" "}
                    <span className="font-mono text-neutral-300 tabular-nums">{minutesToClock(departureClock ?? 0)} JST</span>
                    {rollsOver ? " tomorrow" : " today"} — the booked train is treated as a fallback.
                </p>
            ) : null}

            {departure.kind === "range" ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <TimeInput
                            value={departure.after}
                            disabled={disabled}
                            label="Earliest departure"
                            onChange={(value) => onDepartureChange({ ...departure, after: value })}
                        />
                        {departure.before === null ? (
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                    onDepartureChange({ ...departure, before: minutesToClock(clockToMinutes(departure.after) + 120) })
                                }
                                className="h-9 rounded-lg border border-dashed border-white/12 px-3 text-xs text-neutral-500 transition-colors hover:border-amber-300/30 hover:text-amber-100"
                            >
                                + Latest
                            </button>
                        ) : (
                            <>
                                <ArrowRight className="size-3.5 shrink-0 text-neutral-600" />
                                <TimeInput
                                    value={departure.before}
                                    disabled={disabled}
                                    label="Latest departure"
                                    onChange={(value) => onDepartureChange({ ...departure, before: value })}
                                />
                                <button
                                    type="button"
                                    disabled={disabled}
                                    aria-label="Remove latest departure"
                                    onClick={() => onDepartureChange({ ...departure, before: null })}
                                    className="flex size-7 items-center justify-center rounded-md text-neutral-600 transition-colors hover:text-neutral-200"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                    <DatePicker
                        value={travelDate}
                        onValueChange={onTravelDateChange}
                        today={today}
                        minDate={shiftDate(today, -1)}
                        maxDate={shiftDate(today, 365)}
                        placeholder="Today"
                        clearLabel="Use today"
                        ariaLabel="Travel date"
                        disabled={disabled}
                    />
                </div>
            ) : null}

            {departure.kind === "as_booked" ? (
                <DatePicker
                    value={travelDate}
                    onValueChange={onTravelDateChange}
                    today={today}
                    minDate={shiftDate(today, -365)}
                    maxDate={shiftDate(today, 365)}
                    placeholder="Date from screenshot"
                    clearLabel="Clear"
                    ariaLabel="Travel date"
                    disabled={disabled}
                />
            ) : null}
        </div>
    );
}
