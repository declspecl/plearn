import { TOKYO_TIME_ZONE } from "./departure";

export const TOKYO_CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TOKYO_TIME_ZONE,
});

const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/u;
const CLOCK_IN_TEXT = /(\d{1,2}):(\d{2})/u;

/**
 * Renders a time as a bare Asia/Tokyo clock, whatever shape the model returned: a full ISO
 * timestamp with an offset is converted, anything else keeps its literal HH:MM digits because
 * the model is instructed to write Tokyo local time.
 */
export function formatClock(value: string | null) {
    if (!value) {
        return null;
    }

    if (ISO_WITH_ZONE.test(value)) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return TOKYO_CLOCK_FORMAT.format(parsed);
        }
    }

    const match = CLOCK_IN_TEXT.exec(value);

    return match ? `${match[1]!.padStart(2, "0")}:${match[2]}` : value;
}

export function clockMinutes(value: string | null) {
    const clock = formatClock(value);
    const match = clock ? CLOCK_IN_TEXT.exec(clock) : null;

    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Signed minute difference that tolerates a midnight rollover, e.g. 23:55 → 00:10 is +15. */
export function minuteDelta(from: string | null, to: string | null) {
    const fromMinutes = clockMinutes(from);
    const toMinutes = clockMinutes(to);
    if (fromMinutes === null || toMinutes === null) {
        return null;
    }

    let difference = toMinutes - fromMinutes;
    if (difference < -12 * 60) difference += 24 * 60;
    if (difference > 12 * 60) difference -= 24 * 60;

    return difference;
}

export function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);

    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}

/** Minutes until a service date + Tokyo clock time, negative once it has passed. */
export function minutesUntilDeparture(serviceDate: string | null, time: string | null, now: Date = new Date()) {
    const clock = formatClock(time);
    if (!serviceDate || !clock || !/^\d{4}-\d{2}-\d{2}$/u.test(serviceDate) || !/^\d{2}:\d{2}$/u.test(clock)) {
        return null;
    }

    const departure = new Date(`${serviceDate}T${clock}:00+09:00`);

    return Number.isNaN(departure.getTime()) ? null : Math.round((departure.getTime() - now.getTime()) / 60_000);
}
