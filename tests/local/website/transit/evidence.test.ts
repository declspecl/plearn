import { LANGUAGES, TOOLS } from "../../../../apps/website/src/lib/languages";
import { OFFICIAL_RAIL_DOMAINS, isOfficialRailHostname } from "../../../../apps/website/src/lib/server/transit/constants";
import { buildUnverifiedTransitBrief, normalizeTransitBrief } from "../../../../apps/website/src/lib/server/transit/evidence";
import { redactSensitiveText, sanitizeTransitExtraction } from "../../../../apps/website/src/lib/server/transit/sanitize";
import { transitBriefSchema, wayfindingStepSchema } from "../../../../apps/website/src/lib/transit/schemas";
import type { EvidenceBasis, SourcedValue, StationRef, TransitBrief, TransitSource } from "../../../../apps/website/src/lib/transit/types";
import { describe, expect, it } from "vitest";
import { z } from "zod";

function sourced<T>(value: T | null, basis: EvidenceBasis, sourceIds: readonly string[] = []): SourcedValue<T> {
    return { value, basis, confidence: "high", sourceIds, sourceAsOf: null, note: null };
}

function station(nameEn: string, nameJa: string): StationRef {
    return { nameEn, nameJa, stationCode: null };
}

function fixtureBrief(source: TransitSource): TransitBrief {
    return {
        schemaVersion: 1,
        generatedAt: "2020-01-01T00:00:00.000Z",
        timezone: "Asia/Tokyo",
        summary: "Tokyo to Shin-Osaka",
        legs: [
            {
                operator: sourced("JR Central", "operator_timetable", [source.id]),
                line: sourced("Tokaido Shinkansen", "operator_timetable", [source.id]),
                serviceDate: sourced("2026-08-06", "reservation", ["missing-screenshot"]),
                trainName: sourced("Nozomi", "reservation", ["missing-screenshot"]),
                trainNumber: sourced("27", "reservation", ["missing-screenshot"]),
                origin: sourced(station("Tokyo", "東京"), "operator_timetable", [source.id]),
                destination: sourced(station("Shin-Osaka", "新大阪"), "operator_timetable", [source.id]),
                scheduledDeparture: sourced("09:27", "operator_timetable", [source.id]),
                estimatedDeparture: sourced<string>(null, "operator_live"),
                actualDeparture: sourced<string>(null, "operator_live"),
                scheduledArrival: sourced("11:57", "operator_timetable", [source.id]),
                estimatedArrival: sourced<string>(null, "operator_live"),
                actualArrival: sourced<string>(null, "operator_live"),
                departurePlatform: sourced("18", "operator_live", [source.id]),
                arrivalPlatform: sourced<string>(null, "unavailable"),
                carNumber: sourced("12", "reservation", ["missing-screenshot"]),
                seat: sourced("8A", "reservation", ["missing-screenshot"]),
                reservationType: sourced("Reserved", "reservation", ["missing-screenshot"]),
            },
        ],
        transfers: [],
        wayfinding: null,
        alerts: [],
        verificationSteps: [],
        officialActions: [
            { label: "Official", url: source.url!, kind: "timetable" },
            { label: "Untrusted", url: "https://example.com/rail", kind: "timetable" },
        ],
        unresolvedQuestions: [],
        sources: [source],
    };
}

describe("Japanese Transit evidence policy", () => {
    it("exposes Transit only in the Japanese suite", () => {
        expect(TOOLS.transit.segment).toBe("transit");
        expect(LANGUAGES.find((language) => language.code === "ja")?.tools).toContain("transit");
        expect(LANGUAGES.find((language) => language.code === "vi")?.tools).not.toContain("transit");
    });

    it("accepts exact official domains and their subdomains only", () => {
        expect(OFFICIAL_RAIL_DOMAINS).toContain("smart-ex.jp");
        expect(isOfficialRailHostname("traininfo.jr-central.co.jp")).toBe(true);
        expect(isOfficialRailHostname("jr-central.co.jp.attacker.example")).toBe(false);
        expect(isOfficialRailHostname("example.com")).toBe(false);
    });

    it("downgrades uncited and stale live claims and always adds the platform-board check", () => {
        const source: TransitSource = {
            id: "jr-source",
            title: "JR timetable",
            url: "https://jr-central.co.jp/",
            publisher: "JR Central",
            retrievedAt: new Date().toISOString(),
            sourceAsOf: null,
            basis: "operator_timetable",
        };
        const normalized = normalizeTransitBrief(fixtureBrief(source));
        const leg = normalized.legs[0]!;

        expect(leg.scheduledDeparture.basis).toBe("operator_timetable");
        expect(leg.departurePlatform.basis).toBe("inferred");
        expect(leg.departurePlatform.confidence).toBe("low");
        expect(leg.carNumber.basis).toBe("inferred");
        expect(leg.arrivalPlatform.basis).toBe("unavailable");
        expect(normalized.verificationSteps[0]).toMatch(/departure board/iu);
        expect(normalized.officialActions).toHaveLength(1);
    });

    it("rejects model-declared sources that were not captured by native web search", () => {
        const fabricated: TransitSource = {
            id: "model-only",
            title: "Uncaptured official-looking page",
            url: "https://jr-central.co.jp/fabricated",
            publisher: "JR Central",
            retrievedAt: new Date().toISOString(),
            sourceAsOf: new Date().toISOString(),
            basis: "operator_live",
        };
        const captured: TransitSource = {
            ...fabricated,
            id: "native-source",
            url: "https://jr-central.co.jp/actually-opened",
            basis: "operator_timetable",
            sourceAsOf: null,
        };
        const normalized = normalizeTransitBrief(fixtureBrief(fabricated), [captured]);

        expect(normalized.sources.map((source) => source.id)).toEqual(["native-source"]);
        expect(normalized.legs[0]!.scheduledDeparture.basis).toBe("inferred");
        expect(normalized.legs[0]!.departurePlatform.basis).toBe("inferred");
    });

    it("maps model citations onto a matching native-search source and retains a fresh operator timestamp", () => {
        const modelSource: TransitSource = {
            id: "model-source",
            title: "JR Central operation update",
            url: "https://traininfo.jr-central.co.jp/shinkansen/pc/en/index.html",
            publisher: "JR Central",
            retrievedAt: new Date().toISOString(),
            sourceAsOf: new Date().toISOString(),
            basis: "operator_live",
        };
        const captured: TransitSource = {
            ...modelSource,
            id: "native-source",
            title: "Captured source",
            sourceAsOf: null,
            basis: "operator_timetable",
        };
        const fixture = fixtureBrief(modelSource);
        const today = new Intl.DateTimeFormat("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "Asia/Tokyo",
        }).format(new Date());
        const normalized = normalizeTransitBrief(
            {
                ...fixture,
                legs: [{ ...fixture.legs[0]!, serviceDate: sourced(today, "reservation", ["missing-screenshot"]) }],
            },
            [captured],
        );

        expect(normalized.sources).toHaveLength(1);
        expect(normalized.sources[0]?.id).toBe("native-source");
        expect(normalized.legs[0]!.departurePlatform.basis).toBe("operator_live");
        expect(normalized.legs[0]!.departurePlatform.sourceIds).toEqual(["native-source"]);
    });

    it("redacts likely personal and payment identifiers without removing train or seat numbers", () => {
        const text = redactSensitiveText("Nozomi 27 seat 8A, email me@example.com, card 4111 1111 1111 1111");

        expect(text).toContain("Nozomi 27 seat 8A");
        expect(text).not.toContain("me@example.com");
        expect(text).not.toContain("4111");
    });

    it("sanitizes free text inside a structured extraction", () => {
        const extraction = sanitizeTransitExtraction({
            schemaVersion: 1,
            summary: "Reservation number ABCDE12345 for me@example.com",
            imageKinds: ["smart_ex"],
            entryPoint: "Yaesu North",
            mobilityNeeds: null,
            legs: [],
            clarifications: [],
            sensitiveDataDetected: true,
        });

        expect(extraction.summary).not.toContain("ABCDE12345");
        expect(extraction.summary).not.toContain("me@example.com");
        expect(extraction.sensitiveDataDetected).toBe(true);
    });

    it("builds a screenshot-only fallback without pretending that schedule facts are live", () => {
        const fallback = buildUnverifiedTransitBrief({
            schemaVersion: 1,
            summary: "Nozomi 27 to Shin-Osaka",
            imageKinds: ["smart_ex"],
            entryPoint: "Yaesu North Exit",
            mobilityNeeds: null,
            legs: [
                {
                    operator: "JR Central",
                    line: "Tokaido Shinkansen",
                    serviceDate: "2026-08-06",
                    trainName: "Nozomi",
                    trainNumber: "27",
                    origin: station("Tokyo", "東京"),
                    destination: station("Shin-Osaka", "新大阪"),
                    scheduledDeparture: "09:27",
                    scheduledArrival: "11:57",
                    departurePlatform: null,
                    arrivalPlatform: null,
                    carNumber: "12",
                    seat: "8A",
                    reservationType: "Reserved",
                    basis: "reservation",
                    confidence: "high",
                },
            ],
            clarifications: [],
            sensitiveDataDetected: false,
        });

        expect(fallback.legs[0]?.scheduledDeparture.basis).toBe("reservation");
        expect(fallback.legs[0]?.estimatedDeparture.basis).toBe("unavailable");
        expect(fallback.legs[0]?.departurePlatform.value).toBeNull();
        expect(fallback.verificationSteps.join(" ")).toMatch(/official operator information could not be checked/iu);
    });
    it("canonicalises model times to an Asia/Tokyo clock before the brief is stored", () => {
        const source: TransitSource = {
            id: "official-1",
            title: "JR timetable",
            url: "https://www.jr-odekake.net/timetable",
            publisher: "www.jr-odekake.net",
            retrievedAt: "2026-08-06T00:00:00.000Z",
            sourceAsOf: "2026-08-06T00:00:00.000Z",
            basis: "operator_timetable",
        };
        const fixture = fixtureBrief(source);
        const isoTimes: TransitBrief = {
            ...fixture,
            legs: [
                {
                    ...fixture.legs[0]!,
                    // The schema accepts any string, and the model really does return these.
                    scheduledDeparture: sourced("2026-08-06T09:27:00+09:00", "operator_timetable", [source.id]),
                    scheduledArrival: sourced("2026-08-06T02:57:00Z", "operator_timetable", [source.id]),
                },
            ],
        };

        const normalized = normalizeTransitBrief(isoTimes, [source]);

        expect(normalized.legs[0]?.scheduledDeparture.value).toBe("09:27");
        expect(normalized.legs[0]?.scheduledArrival.value).toBe("11:57");
    });

    it("leaves an already-clean clock and a null time untouched", () => {
        const source: TransitSource = {
            id: "official-1",
            title: "JR timetable",
            url: "https://www.jr-odekake.net/timetable",
            publisher: "www.jr-odekake.net",
            retrievedAt: "2026-08-06T00:00:00.000Z",
            sourceAsOf: "2026-08-06T00:00:00.000Z",
            basis: "operator_timetable",
        };
        const normalized = normalizeTransitBrief(fixtureBrief(source), [source]);

        expect(normalized.legs[0]?.scheduledDeparture.value).toBe("09:27");
        expect(normalized.legs[0]?.estimatedDeparture.value).toBeNull();
    });
});

describe("brief output contract", () => {
    const briefJsonSchema = z.toJSONSchema(transitBriefSchema, { io: "output" }) as {
        properties: Record<string, { description?: string; items?: { properties?: Record<string, { description?: string }> } }>;
    };

    it("tells the model, in the schema itself, to write prose in English", () => {
        // The system prompt also says this, but the traveller-facing fields carry it per-field so a
        // Japanese source page cannot quietly flip the answer's language.
        for (const field of ["summary", "verificationSteps", "unresolvedQuestions"]) {
            expect(briefJsonSchema.properties[field]?.description).toMatch(/written in english/iu);
        }
        const alert = briefJsonSchema.properties.alerts?.items?.properties;
        expect(alert?.title?.description).toMatch(/written in english/iu);
        expect(alert?.message?.description).toMatch(/written in english/iu);
    });

    it("keeps Japanese signage as the documented exception", () => {
        const step = z.toJSONSchema(wayfindingStepSchema, { io: "output" }) as {
            properties: Record<string, { description?: string }>;
        };

        expect(step.properties.signTextJa?.description).toMatch(/verbatim japanese/iu);
        expect(step.properties.signTextJa?.description).not.toMatch(/written in english/iu);
        expect(step.properties.instructionEn?.description).toMatch(/written in english/iu);
    });
});
