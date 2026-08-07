export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/** Calendar dates are handled as plain YYYY-MM-DD strings so no local timezone can shift a day. */
export function isValidDate(value: string | null | undefined): value is string {
    return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Midday UTC anchor for a calendar date; safe for day arithmetic and weekday lookups. */
export function dateAnchor(date: string) {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(Date.UTC(year!, month! - 1, day!, 12));
}

export function toDateString(anchor: Date) {
    return anchor.toISOString().slice(0, 10);
}

export function shiftDate(date: string, days: number) {
    const anchor = dateAnchor(date);
    anchor.setUTCDate(anchor.getUTCDate() + days);

    return toDateString(anchor);
}

export function daysBetween(from: string, to: string) {
    return Math.round((dateAnchor(to).getTime() - dateAnchor(from).getTime()) / 86_400_000);
}

export function clampDate(date: string, min: string | null, max: string | null) {
    if (min && daysBetween(min, date) < 0) {
        return min;
    }

    return max && daysBetween(date, max) < 0 ? max : date;
}

export function isWithinRange(date: string, min: string | null, max: string | null) {
    return (!min || daysBetween(min, date) >= 0) && (!max || daysBetween(date, max) >= 0);
}

/** Month key (YYYY-MM) that a calendar date belongs to. */
export function monthOf(date: string) {
    return date.slice(0, 7);
}

export function shiftMonth(month: string, months: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    const anchor = new Date(Date.UTC(year!, monthNumber! - 1 + months, 1, 12));

    return toDateString(anchor).slice(0, 7);
}

export function monthLabel(month: string) {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateAnchor(`${month}-01`));
}

/** Weekday initials starting on Sunday, matching Japanese rail calendars. */
export const WEEKDAYS = [
    { key: "sunday", initial: "S" },
    { key: "monday", initial: "M" },
    { key: "tuesday", initial: "T" },
    { key: "wednesday", initial: "W" },
    { key: "thursday", initial: "T" },
    { key: "friday", initial: "F" },
    { key: "saturday", initial: "S" },
] as const;

/** Weeks of a month as date strings, padded with nulls so each row holds seven cells. */
export function monthMatrix(month: string): readonly (readonly (string | null)[])[] {
    const first = dateAnchor(`${month}-01`);
    const dayCount = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
    const leading = Array.from<string | null>({ length: first.getUTCDay() }).fill(null);
    const days = Array.from({ length: dayCount }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
    const filled = [...leading, ...days];
    const trailing = Array.from<string | null>({ length: (7 - (filled.length % 7)) % 7 }).fill(null);
    const cells = [...filled, ...trailing];

    return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Human date label relative to a reference day: "Today", "Tomorrow", or "Thu 7 Aug". */
export function describeDate(date: string, today: string) {
    const offset = daysBetween(today, date);
    if (offset === 0) {
        return "Today";
    }
    if (offset === 1) {
        return "Tomorrow";
    }
    if (offset === -1) {
        return "Yesterday";
    }

    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(dateAnchor(date));
}
