import { isOfficialRailHostname } from "./constants";
import { transitBriefSchema } from "@/lib/transit/schemas";
import type { SanitizedTransitExtraction, SourcedValue, TransitBrief, TransitSource, WayfindingStep } from "@/lib/transit/types";
import "server-only";

const LIVE_FRESHNESS_MS = 15 * 60 * 1000;

function unavailableValue<T>(): SourcedValue<T> {
    return {
        value: null,
        basis: "unavailable",
        confidence: "low",
        sourceIds: [],
        sourceAsOf: null,
        note: null,
    };
}

export function sourcesForTransitExtraction(extraction: SanitizedTransitExtraction): TransitSource[] {
    const now = new Date().toISOString();

    return extraction.imageKinds.map((kind, index) => ({
        id: `user-screenshot-${index + 1}`,
        title:
            kind === "smart_ex"
                ? "Your SmartEX screenshot"
                : kind === "google_maps"
                  ? "Your Google Maps screenshot"
                  : kind === "jr_timetable"
                    ? "Your JR timetable screenshot"
                    : "Your uploaded screenshot",
        url: null,
        publisher: kind === "smart_ex" ? "SmartEX" : kind === "google_maps" ? "Google Maps" : "User-provided",
        retrievedAt: now,
        sourceAsOf: null,
        basis:
            kind === "smart_ex"
                ? "reservation"
                : kind === "google_maps"
                  ? "user_route_plan"
                  : kind === "jr_timetable"
                    ? "operator_timetable"
                    : "user_route_plan",
    }));
}

export function buildUnverifiedTransitBrief(extraction: SanitizedTransitExtraction): TransitBrief {
    const sources = sourcesForTransitExtraction(extraction);
    const sourceForBasis = (basis: SourcedValue<unknown>["basis"]) =>
        sources.find((source) => source.basis === basis)?.id ?? sources[0]?.id ?? null;
    const sourced = <T>(value: T | null, basis: SourcedValue<T>["basis"], confidence: SourcedValue<T>["confidence"]): SourcedValue<T> => {
        const sourceId = value === null ? null : sourceForBasis(basis);

        return {
            value,
            basis: value === null ? "unavailable" : sourceId ? basis : "inferred",
            confidence: value === null || !sourceId ? "low" : confidence,
            sourceIds: sourceId ? [sourceId] : [],
            sourceAsOf: null,
            note:
                value === null ? null : "Extracted from your screenshot; official operator information was not available for verification.",
        };
    };

    return normalizeTransitBrief(
        {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            timezone: "Asia/Tokyo",
            summary: extraction.summary || "Unverified rail journey",
            legs: extraction.legs.map((leg) => ({
                operator: sourced(leg.operator, leg.basis, leg.confidence),
                line: sourced(leg.line, leg.basis, leg.confidence),
                serviceDate: sourced(leg.serviceDate, leg.basis, leg.confidence),
                trainName: sourced(leg.trainName, leg.basis, leg.confidence),
                trainNumber: sourced(leg.trainNumber, leg.basis, leg.confidence),
                origin: sourced(leg.origin, leg.basis, leg.confidence),
                destination: sourced(leg.destination, leg.basis, leg.confidence),
                scheduledDeparture: sourced(leg.scheduledDeparture, leg.basis, leg.confidence),
                estimatedDeparture: unavailableValue<string>(),
                actualDeparture: unavailableValue<string>(),
                scheduledArrival: sourced(leg.scheduledArrival, leg.basis, leg.confidence),
                estimatedArrival: unavailableValue<string>(),
                actualArrival: unavailableValue<string>(),
                departurePlatform: sourced(leg.departurePlatform, leg.basis, leg.confidence),
                arrivalPlatform: sourced(leg.arrivalPlatform, leg.basis, leg.confidence),
                carNumber: sourced(leg.carNumber, leg.basis, leg.confidence),
                seat: sourced(leg.seat, leg.basis, leg.confidence),
                reservationType: sourced(leg.reservationType, leg.basis, leg.confidence),
            })),
            transfers: [],
            wayfinding: null,
            alerts: [],
            verificationSteps: [
                "Official operator information could not be checked. Verify the train, time, and platform on the station departure board.",
            ],
            officialActions: [
                ...(extraction.imageKinds.includes("smart_ex")
                    ? [{ label: "Open SmartEX", url: "https://smart-ex.jp/en/", kind: "booking" as const }]
                    : []),
                ...(extraction.imageKinds.includes("jr_timetable")
                    ? [{ label: "Open JR Odekake timetable", url: "https://timetable.jr-odekake.net/", kind: "timetable" as const }]
                    : []),
            ],
            unresolvedQuestions: ["Current operator status, platform changes, and indoor directions were not verified."],
            sources,
        },
        sources,
    );
}

function isFreshLiveSource(source: TransitSource, now: Date) {
    if (source.basis !== "operator_live" || !source.sourceAsOf) {
        return false;
    }

    const sourceTime = Date.parse(source.sourceAsOf);

    return Number.isFinite(sourceTime) && Math.abs(now.getTime() - sourceTime) <= LIVE_FRESHNESS_MS;
}

function canonicalSourceUrl(value: string | null) {
    if (!value) {
        return null;
    }

    const url = new URL(value);
    url.hash = "";

    return url.toString();
}

function buildTrustedSources(parsedSources: readonly TransitSource[], authoritativeSources: readonly TransitSource[], now: Date) {
    const sourceById = new Map<string, TransitSource>();
    const aliasById = new Map<string, string>();
    const strict = authoritativeSources.length > 0;
    const candidates = strict ? authoritativeSources : parsedSources;
    const parsedById = new Map(parsedSources.map((source) => [source.id, source]));
    const parsedByUrl = new Map(
        parsedSources.flatMap((source) => {
            const url = canonicalSourceUrl(source.url);

            return url ? [[url, source] as const] : [];
        }),
    );

    for (const candidate of candidates) {
        if (candidate.url) {
            const url = new URL(candidate.url);
            if (url.protocol !== "https:" || !isOfficialRailHostname(url.hostname)) {
                continue;
            }
        }

        const candidateUrl = canonicalSourceUrl(candidate.url);
        const annotation = strict ? (candidateUrl ? parsedByUrl.get(candidateUrl) : parsedById.get(candidate.id)) : candidate;
        const isUserEvidence = candidate.url === null;
        const annotatedBasis = annotation?.basis;
        const basis =
            !isUserEvidence &&
            (annotatedBasis === "operator_live" || annotatedBasis === "operator_timetable" || annotatedBasis === "official_station_map")
                ? annotatedBasis
                : candidate.basis;
        const source = {
            ...candidate,
            title: annotation?.title ?? candidate.title,
            publisher: annotation?.publisher ?? candidate.publisher,
            sourceAsOf: isUserEvidence ? null : (annotation?.sourceAsOf ?? candidate.sourceAsOf),
            basis,
            retrievedAt: now.toISOString(),
        };

        sourceById.set(source.id, source);
        aliasById.set(source.id, source.id);
        if (annotation) {
            aliasById.set(annotation.id, source.id);
        }
    }

    return { sourceById, aliasById };
}

function normalizeSourcedValue<T>(
    value: SourcedValue<T>,
    sources: ReadonlyMap<string, TransitSource>,
    sourceAliases: ReadonlyMap<string, string>,
    now: Date,
): SourcedValue<T> {
    if (value.value === null) {
        return { ...value, basis: "unavailable", confidence: "low", sourceIds: [], sourceAsOf: null };
    }

    const sourceIds = [
        ...new Set(value.sourceIds.map((sourceId) => sourceAliases.get(sourceId) ?? sourceId).filter((sourceId) => sources.has(sourceId))),
    ];
    if (value.basis === "operator_live") {
        const liveSources = sourceIds
            .map((sourceId) => sources.get(sourceId))
            .filter((source): source is TransitSource => source !== undefined);
        if (!liveSources.some((source) => isFreshLiveSource(source, now))) {
            return {
                ...value,
                basis: "inferred",
                confidence: "low",
                sourceIds,
                note: [value.note, "No operator update within the last 15 minutes; verify at the station."].filter(Boolean).join(" "),
            };
        }
    }

    if (value.basis !== "inferred" && sourceIds.length === 0) {
        return {
            ...value,
            basis: "inferred",
            confidence: "low",
            sourceIds: [],
            sourceAsOf: null,
            note: [value.note, "No retained source supports this value; verify before relying on it."].filter(Boolean).join(" "),
        };
    }

    return { ...value, sourceIds };
}

function japanDate(value: string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo" }).format(date);
}

function enforceLiveServiceDate<T>(
    value: SourcedValue<T>,
    serviceDate: string | null,
    sources: ReadonlyMap<string, TransitSource>,
): SourcedValue<T> {
    if (value.basis !== "operator_live" || !serviceDate) {
        return value;
    }

    const coversServiceDate = value.sourceIds.some((sourceId) => {
        const sourceAsOf = sources.get(sourceId)?.sourceAsOf;

        return sourceAsOf ? japanDate(sourceAsOf) === serviceDate : false;
    });
    if (coversServiceDate) {
        return value;
    }

    return {
        ...value,
        basis: "inferred",
        confidence: "low",
        note: [value.note, "The operator timestamp does not match this service date; do not treat this as current."]
            .filter(Boolean)
            .join(" "),
    };
}

export function normalizeTransitBrief(input: unknown, additionalSources: readonly TransitSource[] = []): TransitBrief {
    const parsed = transitBriefSchema.parse(input) as TransitBrief;
    const now = new Date();
    const { sourceById, aliasById } = buildTrustedSources(parsed.sources, additionalSources, now);

    const normalize = <T>(value: SourcedValue<T>) => normalizeSourcedValue(value, sourceById, aliasById, now);
    const legs = parsed.legs.map((leg) => {
        const normalized = {
            ...leg,
            operator: normalize(leg.operator),
            line: normalize(leg.line),
            serviceDate: normalize(leg.serviceDate),
            trainName: normalize(leg.trainName),
            trainNumber: normalize(leg.trainNumber),
            origin: normalize(leg.origin),
            destination: normalize(leg.destination),
            scheduledDeparture: normalize(leg.scheduledDeparture),
            estimatedDeparture: normalize(leg.estimatedDeparture),
            actualDeparture: normalize(leg.actualDeparture),
            scheduledArrival: normalize(leg.scheduledArrival),
            estimatedArrival: normalize(leg.estimatedArrival),
            actualArrival: normalize(leg.actualArrival),
            departurePlatform: normalize(leg.departurePlatform),
            arrivalPlatform: normalize(leg.arrivalPlatform),
            carNumber: normalize(leg.carNumber),
            seat: normalize(leg.seat),
            reservationType: normalize(leg.reservationType),
        };
        const serviceDate = normalized.serviceDate.value;

        return {
            ...normalized,
            estimatedDeparture: enforceLiveServiceDate(normalized.estimatedDeparture, serviceDate, sourceById),
            actualDeparture: enforceLiveServiceDate(normalized.actualDeparture, serviceDate, sourceById),
            estimatedArrival: enforceLiveServiceDate(normalized.estimatedArrival, serviceDate, sourceById),
            actualArrival: enforceLiveServiceDate(normalized.actualArrival, serviceDate, sourceById),
            departurePlatform: enforceLiveServiceDate(normalized.departurePlatform, serviceDate, sourceById),
            arrivalPlatform: enforceLiveServiceDate(normalized.arrivalPlatform, serviceDate, sourceById),
        };
    });
    const normalizeSteps = (steps: readonly WayfindingStep[]) => steps.map((step) => ({ ...step, evidence: normalize(step.evidence) }));
    const verificationSteps = [
        ...new Set([
            "Check the station departure board before entering the platform; tracks and times can change.",
            ...parsed.verificationSteps,
        ]),
    ];
    const officialActions = parsed.officialActions.filter((action) => {
        const url = new URL(action.url);

        return url.protocol === "https:" && isOfficialRailHostname(url.hostname);
    });
    const alerts = parsed.alerts.flatMap((alert) => {
        const sourceIds = [
            ...new Set(
                alert.sourceIds.map((sourceId) => aliasById.get(sourceId) ?? sourceId).filter((sourceId) => sourceById.has(sourceId)),
            ),
        ];

        return sourceIds.length > 0 ? [{ ...alert, sourceIds }] : [];
    });

    return {
        ...parsed,
        generatedAt: now.toISOString(),
        timezone: "Asia/Tokyo",
        sources: [...sourceById.values()],
        legs,
        transfers: parsed.transfers.map((transfer) => ({ ...transfer, instructions: normalizeSteps(transfer.instructions) })),
        wayfinding: parsed.wayfinding ? { ...parsed.wayfinding, steps: normalizeSteps(parsed.wayfinding.steps) } : null,
        alerts,
        verificationSteps,
        officialActions,
    };
}
