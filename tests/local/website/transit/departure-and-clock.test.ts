import {
    clampDate,
    dateAnchor,
    daysBetween,
    describeDate,
    isValidDate,
    isWithinRange,
    monthLabel,
    monthMatrix,
    monthOf,
    shiftDate,
    shiftMonth,
} from "../../../../apps/website/src/lib/calendar";
import { formatClock, formatDuration, minuteDelta, minutesUntilDeparture } from "../../../../apps/website/src/lib/transit/clock";
import {
    departureWindowFields,
    describeDepartureWindow,
    describeDepartureWindowShort,
    isValidClock,
    minutesToClock,
    resolveDepartureWindow,
    tokyoClock,
    tokyoDate,
} from "../../../../apps/website/src/lib/transit/departure";
import { describe, expect, it } from "vitest";

describe("calendar date strings", () => {
    it("keeps day arithmetic free of local-timezone drift", () => {
        expect(shiftDate("2026-08-06", 1)).toBe("2026-08-07");
        expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
        expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
        expect(daysBetween("2026-08-06", "2026-08-13")).toBe(7);
        expect(daysBetween("2026-08-13", "2026-08-06")).toBe(-7);
    });

    it("validates and clamps dates against a range", () => {
        expect(isValidDate("2026-08-06")).toBe(true);
        expect(isValidDate("2026-8-6")).toBe(false);
        expect(isValidDate(null)).toBe(false);
        expect(clampDate("2026-08-01", "2026-08-05", null)).toBe("2026-08-05");
        expect(clampDate("2026-09-01", null, "2026-08-31")).toBe("2026-08-31");
        expect(clampDate("2026-08-06", "2026-08-05", "2026-08-31")).toBe("2026-08-06");
        expect(isWithinRange("2026-08-06", "2026-08-06", "2026-08-06")).toBe(true);
        expect(isWithinRange("2026-08-06", "2025-08-06", "2027-08-06")).toBe(true);
        expect(isWithinRange("2026-08-06", null, null)).toBe(true);
        expect(isWithinRange("2026-08-05", "2026-08-06", null)).toBe(false);
        expect(isWithinRange("2026-08-07", null, "2026-08-06")).toBe(false);
    });

    it("builds padded month grids", () => {
        const august = monthMatrix("2026-08");
        expect(august.every((week) => week.length === 7)).toBe(true);
        expect(august.flat().filter(Boolean)).toHaveLength(31);
        // 2026-08-01 is a Saturday, so the first row holds six empty cells.
        expect(august[0]!.slice(0, 6).every((cell) => cell === null)).toBe(true);
        expect(august[0]![6]).toBe("2026-08-01");
        expect(monthMatrix("2026-02").flat().filter(Boolean)).toHaveLength(28);
    });

    it("moves between months across year boundaries", () => {
        expect(monthOf("2026-08-06")).toBe("2026-08");
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
        expect(shiftMonth("2026-01", -1)).toBe("2025-12");
        expect(monthLabel("2026-08")).toBe("August 2026");
    });

    it("describes dates relative to a reference day", () => {
        expect(describeDate("2026-08-06", "2026-08-06")).toBe("Today");
        expect(describeDate("2026-08-07", "2026-08-06")).toBe("Tomorrow");
        expect(describeDate("2026-08-05", "2026-08-06")).toBe("Yesterday");
        expect(describeDate("2026-08-13", "2026-08-06")).toBe("Thu 13 Aug");
        expect(dateAnchor("2026-08-06").getUTCDay()).toBe(4);
    });
});

describe("Tokyo clock helpers", () => {
    it("reads the Tokyo calendar day even when UTC is on the previous day", () => {
        // 2026-08-06T16:30Z is 2026-08-07 01:30 in Tokyo.
        const instant = new Date("2026-08-06T16:30:00Z");
        expect(tokyoDate(instant)).toBe("2026-08-07");
        expect(tokyoClock(instant)).toBe("01:30");
    });

    it("validates and formats HH:MM values", () => {
        expect(isValidClock("09:05")).toBe(true);
        expect(isValidClock("24:00")).toBe(false);
        expect(isValidClock("9:05")).toBe(false);
        expect(minutesToClock(0)).toBe("00:00");
        expect(minutesToClock(1500)).toBe("01:00");
        expect(minutesToClock(-30)).toBe("23:30");
    });
});

describe("departure windows", () => {
    const now = new Date("2026-08-06T10:42:00Z"); // 19:42 JST

    it("resolves a relative window against the server clock", () => {
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: 0, after: null, before: null }, now)).toEqual({
            date: "2026-08-06",
            after: "19:42",
            before: null,
            relativeMinutes: 0,
        });
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: 60, after: null, before: null }, now)).toMatchObject({
            after: "20:42",
            relativeMinutes: 60,
        });
    });

    it("rolls a relative window into the next Tokyo day", () => {
        const lateNight = new Date("2026-08-06T14:50:00Z"); // 23:50 JST
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: 30, after: null, before: null }, lateNight)).toMatchObject({
            date: "2026-08-07",
            after: "00:20",
        });
    });

    it("keeps an explicit range and falls back to today for a missing date", () => {
        expect(resolveDepartureWindow({ travelDate: "2026-08-09", offsetMinutes: null, after: "14:00", before: "16:00" }, now)).toEqual({
            date: "2026-08-09",
            after: "14:00",
            before: "16:00",
            relativeMinutes: null,
        });
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: null, after: "14:00", before: null }, now)).toMatchObject({
            date: "2026-08-06",
        });
    });

    it("drops an end time that is not after the start, and requires a start", () => {
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: null, after: "16:00", before: "14:00" }, now)?.before).toBeNull();
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: null, after: null, before: "14:00" }, now)).toBeNull();
        expect(resolveDepartureWindow({ travelDate: null, offsetMinutes: null, after: "nope", before: null }, now)).toBeNull();
    });

    it("serializes only the fields the endpoint accepts", () => {
        expect(departureWindowFields({ kind: "as_booked" })).toEqual({});
        expect(departureWindowFields({ kind: "relative", minutes: 30 })).toEqual({ departOffsetMinutes: "30" });
        expect(departureWindowFields({ kind: "range", after: "14:00", before: null })).toEqual({ departAfter: "14:00" });
        expect(departureWindowFields({ kind: "range", after: "14:00", before: "16:00" })).toEqual({
            departAfter: "14:00",
            departBefore: "16:00",
        });
    });

    it("tells the model to look past the booked service when the traveler is leaving now", () => {
        const relative = describeDepartureWindow({ date: "2026-08-06", after: "19:42", before: null, relativeMinutes: 0 });
        expect(relative).toContain("leaving right now");
        expect(relative).toContain("at or after 19:42 JST on 2026-08-06");
        expect(relative).toContain("not the originally booked service");

        const ranged = describeDepartureWindow({ date: "2026-08-06", after: "14:00", before: "16:00", relativeMinutes: null });
        expect(ranged).toContain("between 14:00 and 16:00 JST");
        expect(ranged).not.toContain("originally booked");
    });

    it("labels windows for the composer", () => {
        expect(describeDepartureWindowShort({ kind: "as_booked" })).toBe("As booked");
        expect(describeDepartureWindowShort({ kind: "relative", minutes: 0 })).toBe("Leaving now");
        expect(describeDepartureWindowShort({ kind: "relative", minutes: 30 })).toBe("In 30 min");
        expect(describeDepartureWindowShort({ kind: "range", after: "14:00", before: "16:00" })).toBe("14:00–16:00");
        expect(describeDepartureWindowShort({ kind: "range", after: "14:00", before: null })).toBe("From 14:00");
    });
});

describe("brief clock rendering", () => {
    it("reduces any model time shape to a Tokyo HH:MM", () => {
        expect(formatClock("14:27")).toBe("14:27");
        expect(formatClock("9:05")).toBe("09:05");
        expect(formatClock("2026-08-06T14:27:00+09:00")).toBe("14:27");
        expect(formatClock("2026-08-06T05:27:00Z")).toBe("14:27");
        // No zone offset: trust the literal digits rather than the runtime timezone.
        expect(formatClock("2026-08-06T14:27:00")).toBe("14:27");
        expect(formatClock(null)).toBeNull();
        expect(formatClock("Not published")).toBe("Not published");
    });

    it("computes signed deltas across midnight", () => {
        expect(minuteDelta("14:27", "14:44")).toBe(17);
        expect(minuteDelta("23:55", "00:10")).toBe(15);
        expect(minuteDelta("00:10", "23:55")).toBe(-15);
        expect(minuteDelta("2026-08-06T14:27:00+09:00", "2026-08-06T14:44:00+09:00")).toBe(17);
        expect(minuteDelta(null, "14:44")).toBeNull();
    });

    it("formats durations and time-to-departure", () => {
        expect(formatDuration(17)).toBe("17 min");
        expect(formatDuration(125)).toBe("2h 5m");
        const now = new Date("2026-08-06T05:00:00Z"); // 14:00 JST
        expect(minutesUntilDeparture("2026-08-06", "14:27", now)).toBe(27);
        expect(minutesUntilDeparture("2026-08-06", "13:00", now)).toBe(-60);
        expect(minutesUntilDeparture(null, "14:27", now)).toBeNull();
        expect(minutesUntilDeparture("2026-08-06", null, now)).toBeNull();
    });
});
