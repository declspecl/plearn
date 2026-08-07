import { isValidDate } from "@/lib/calendar";

export const TOKYO_TIME_ZONE = "Asia/Tokyo";

const TOKYO_DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

const TOKYO_CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
    timeZone: TOKYO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/u;

/** Relative presets offered by the departure window control, in minutes from now. */
export const DEPARTURE_OFFSETS = [0, 15, 30, 60] as const;
export const MAX_DEPARTURE_OFFSET_MINUTES = 720;

export type DepartureWindow =
    | { readonly kind: "as_booked" }
    | { readonly kind: "relative"; readonly minutes: number }
    | { readonly kind: "range"; readonly after: string; readonly before: string | null };

export interface ResolvedDepartureWindow {
    /** Service date in Asia/Tokyo. */
    readonly date: string;
    /** Earliest acceptable departure, HH:MM in Asia/Tokyo. */
    readonly after: string;
    /** Latest acceptable departure, HH:MM in Asia/Tokyo, when the traveler bounded the window. */
    readonly before: string | null;
    /** Minutes from "now" when the traveler chose a relative window, otherwise null. */
    readonly relativeMinutes: number | null;
}

/** Calendar date in Asia/Tokyo, as YYYY-MM-DD. */
export function tokyoDate(now: Date = new Date()) {
    return TOKYO_DATE_FORMAT.format(now);
}

/** Wall clock in Asia/Tokyo, as HH:MM. */
export function tokyoClock(now: Date = new Date()) {
    return TOKYO_CLOCK_FORMAT.format(now);
}

export function isValidClock(value: string | null | undefined): value is string {
    return typeof value === "string" && CLOCK_PATTERN.test(value);
}

export function clockToMinutes(clock: string) {
    const [hours, minutes] = clock.split(":").map(Number);

    return hours! * 60 + minutes!;
}

export function minutesToClock(minutes: number) {
    const normalized = ((minutes % 1440) + 1440) % 1440;

    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

/** Form fields posted to the transit turn endpoint for a chosen window. */
export function departureWindowFields(window: DepartureWindow): Readonly<Record<string, string>> {
    if (window.kind === "relative") {
        return { departOffsetMinutes: String(window.minutes) };
    }

    if (window.kind === "range") {
        return window.before ? { departAfter: window.after, departBefore: window.before } : { departAfter: window.after };
    }

    return {};
}

/**
 * Turns the posted fields into explicit Asia/Tokyo clock times. Relative windows are resolved
 * against the server clock so a slow upload cannot shift the traveler's intent.
 */
export function resolveDepartureWindow(
    input: {
        readonly travelDate: string | null;
        readonly offsetMinutes: number | null;
        readonly after: string | null;
        readonly before: string | null;
    },
    now: Date = new Date(),
): ResolvedDepartureWindow | null {
    if (input.offsetMinutes !== null) {
        const target = new Date(now.getTime() + input.offsetMinutes * 60_000);

        return { date: tokyoDate(target), after: tokyoClock(target), before: null, relativeMinutes: input.offsetMinutes };
    }

    if (!isValidClock(input.after)) {
        return null;
    }

    const before = isValidClock(input.before) && clockToMinutes(input.before) > clockToMinutes(input.after) ? input.before : null;

    return {
        date: isValidDate(input.travelDate) ? input.travelDate : tokyoDate(now),
        after: input.after,
        before,
        relativeMinutes: null,
    };
}

/** Instruction sentence handed to the model so it searches for the services the traveler can actually board. */
export function describeDepartureWindow(window: ResolvedDepartureWindow) {
    const bound = window.before
        ? `departing between ${window.after} and ${window.before} JST on ${window.date}`
        : `departing at or after ${window.after} JST on ${window.date}`;

    if (window.relativeMinutes === null) {
        return `The traveler wants to travel ${bound}. Prefer services inside that window and say so if none exist.`;
    }

    const intent =
        window.relativeMinutes === 0
            ? "The traveler is leaving right now"
            : `The traveler is leaving in about ${window.relativeMinutes} minutes`;

    return `${intent}, so they need the next realistic services ${bound}, not the originally booked service. Give the next options in departure order and state the platform for each when it is published.`;
}

/** Short label for the departure control and the collapsed trip summary. */
export function describeDepartureWindowShort(window: DepartureWindow) {
    if (window.kind === "as_booked") {
        return "As booked";
    }

    if (window.kind === "relative") {
        return window.minutes === 0 ? "Leaving now" : `In ${window.minutes} min`;
    }

    return window.before ? `${window.after}–${window.before}` : `From ${window.after}`;
}
