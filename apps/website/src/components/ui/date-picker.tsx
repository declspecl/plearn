"use client";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import {
    clampDate,
    daysBetween,
    dateAnchor,
    describeDate,
    isValidDate,
    isWithinRange,
    monthLabel,
    monthMatrix,
    monthOf,
    shiftDate,
    shiftMonth,
    WEEKDAYS,
} from "@/lib/calendar";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

const FULL_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
});

export interface DatePickerProps {
    /** Selected calendar date as YYYY-MM-DD, or null when nothing is chosen. */
    readonly value: string | null;
    readonly onValueChange: (value: string | null) => void;
    /** Reference "today", in the calendar's own timezone, as YYYY-MM-DD. */
    readonly today: string;
    readonly minDate?: string | null;
    readonly maxDate?: string | null;
    readonly placeholder?: string;
    /** Label for the button that clears the selection; omit to make the field required. */
    readonly clearLabel?: string;
    readonly id?: string;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly disabled?: boolean;
}

export function DatePicker({
    value,
    onValueChange,
    today,
    minDate = null,
    maxDate = null,
    placeholder = "Pick a date",
    clearLabel,
    id,
    ariaLabel = "Choose a date",
    className,
    disabled = false,
}: DatePickerProps) {
    const selected = isValidDate(value) ? value : null;
    const anchorDate = clampDate(selected ?? today, minDate, maxDate);
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(() => monthOf(anchorDate));
    const [focused, setFocused] = useState(anchorDate);
    const cellRefs = useRef(new Map<string, HTMLButtonElement>());

    useEffect(() => {
        if (open) {
            cellRefs.current.get(focused)?.focus();
        }
    }, [open, focused]);

    function openWithAnchor(nextOpen: boolean) {
        if (nextOpen) {
            const start = clampDate(selected ?? today, minDate, maxDate);
            setMonth(monthOf(start));
            setFocused(start);
        }
        setOpen(nextOpen);
    }

    function commit(date: string) {
        onValueChange(date);
        setOpen(false);
    }

    function moveFocus(days: number) {
        const next = clampDate(shiftDate(focused, days), minDate, maxDate);
        setFocused(next);
        setMonth(monthOf(next));
    }

    function jumpMonth(months: number) {
        const nextMonth = shiftMonth(month, months);
        const sameDay = `${nextMonth}-${focused.slice(8, 10)}`;
        const next = clampDate(isValidDate(sameDay) ? sameDay : `${nextMonth}-01`, minDate, maxDate);
        setMonth(monthOf(next));
        setFocused(next);
    }

    function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        const weekday = dateAnchor(focused).getUTCDay();
        const moves: Record<string, number | undefined> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
            Home: -weekday,
            End: 6 - weekday,
        };
        const days = moves[event.key];
        if (days !== undefined) {
            event.preventDefault();
            moveFocus(days);

            return;
        }
        if (event.key === "PageUp" || event.key === "PageDown") {
            event.preventDefault();
            jumpMonth(event.key === "PageUp" ? -1 : 1);
        }
    }

    const canGoBack = !minDate || monthOf(minDate) < month;
    const canGoForward = !maxDate || monthOf(maxDate) > month;
    const shortcuts = [
        { label: "Today", date: today },
        { label: "Tomorrow", date: shiftDate(today, 1) },
    ].filter((shortcut) => isWithinRange(shortcut.date, minDate, maxDate));

    return (
        <Popover open={open} onOpenChange={openWithAnchor}>
            <PopoverTrigger
                id={id}
                disabled={disabled}
                aria-label={selected ? `${ariaLabel}: ${FULL_DATE_FORMAT.format(dateAnchor(selected))}` : ariaLabel}
                className={cn(
                    "border-input bg-input/24 text-foreground hover:bg-input/40 focus-visible:ring-ring/40 flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9",
                    className,
                )}
            >
                <CalendarBlank className="size-4 shrink-0 text-neutral-500" weight="duotone" />
                <span className={cn("truncate", !selected && "text-muted-foreground")}>
                    {selected ? describeDate(selected, today) : placeholder}
                </span>
                {selected ? (
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-neutral-500 tabular-nums">{selected.slice(5)}</span>
                ) : null}
            </PopoverTrigger>

            <PopoverPopup align="start" className="w-[19rem]">
                <div data-slot="calendar" className="w-full">
                    <div className="flex items-center justify-between gap-2 px-1 pb-2">
                        <button
                            type="button"
                            onClick={() => jumpMonth(-1)}
                            disabled={!canGoBack}
                            aria-label="Previous month"
                            className="flex size-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/6 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <CaretLeft className="size-4" />
                        </button>
                        <p aria-live="polite" className="text-sm font-medium text-neutral-100">
                            {monthLabel(month)}
                        </p>
                        <button
                            type="button"
                            onClick={() => jumpMonth(1)}
                            disabled={!canGoForward}
                            aria-label="Next month"
                            className="flex size-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/6 hover:text-neutral-100 disabled:pointer-events-none disabled:opacity-30"
                        >
                            <CaretRight className="size-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 px-1 pb-1">
                        {WEEKDAYS.map((weekday) => (
                            <abbr
                                key={weekday.key}
                                title={weekday.key}
                                className="text-center font-mono text-[10px] tracking-[0.1em] text-neutral-600 uppercase no-underline"
                            >
                                {weekday.initial}
                            </abbr>
                        ))}
                    </div>

                    {/* Roving focus: the grid owns arrow-key navigation, one cell is tabbable at a time. */}
                    <div role="grid" aria-label={monthLabel(month)} onKeyDown={handleGridKeyDown} className="px-1">
                        {monthMatrix(month).map((week) => (
                            <div key={week.find(Boolean) ?? month} role="row" className="grid grid-cols-7">
                                {week.map((date, index) => {
                                    if (!date) {
                                        return <span key={`empty-${index}`} role="gridcell" aria-hidden />;
                                    }

                                    const isSelected = date === selected;
                                    const isToday = date === today;
                                    const isDisabled = !isWithinRange(date, minDate, maxDate);
                                    const isWeekend = index === 0 || index === 6;

                                    return (
                                        <button
                                            key={date}
                                            ref={(node) => {
                                                if (node) {
                                                    cellRefs.current.set(date, node);
                                                } else {
                                                    cellRefs.current.delete(date);
                                                }
                                            }}
                                            type="button"
                                            role="gridcell"
                                            aria-selected={isSelected}
                                            aria-current={isToday ? "date" : undefined}
                                            aria-label={FULL_DATE_FORMAT.format(dateAnchor(date))}
                                            disabled={isDisabled}
                                            tabIndex={date === focused ? 0 : -1}
                                            onClick={() => commit(date)}
                                            onFocus={() => setFocused(date)}
                                            className={cn(
                                                "relative flex h-10 items-center justify-center rounded-md font-mono text-[13px] tabular-nums transition-colors outline-none sm:h-9",
                                                "focus-visible:ring-ring/50 focus-visible:ring-2",
                                                isDisabled && "pointer-events-none text-neutral-700",
                                                !isDisabled && !isSelected && "text-neutral-300 hover:bg-white/6",
                                                !isDisabled && isWeekend && !isSelected && "text-neutral-500",
                                                isSelected && "bg-amber-300 font-semibold text-neutral-950",
                                            )}
                                        >
                                            {Number(date.slice(8, 10))}
                                            {isToday && !isSelected ? (
                                                <span className="absolute bottom-1.5 size-1 rounded-full bg-amber-300" />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/8 px-1 pt-2">
                        {shortcuts.map((shortcut) => (
                            <button
                                key={shortcut.label}
                                type="button"
                                onClick={() => commit(shortcut.date)}
                                className={cn(
                                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                                    shortcut.date === selected
                                        ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                                        : "border-white/10 text-neutral-400 hover:border-amber-300/30 hover:text-amber-100",
                                )}
                            >
                                {shortcut.label}
                            </button>
                        ))}
                        {clearLabel ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onValueChange(null);
                                    setOpen(false);
                                }}
                                className="ml-auto rounded-full px-2.5 py-1 text-[11px] text-neutral-500 transition-colors hover:text-neutral-200"
                            >
                                {clearLabel}
                            </button>
                        ) : null}
                    </div>
                    {selected && daysBetween(today, selected) < 0 ? (
                        <p className="px-1 pt-2 text-[11px] text-amber-200/80">This date is in the past.</p>
                    ) : null}
                </div>
            </PopoverPopup>
        </Popover>
    );
}
