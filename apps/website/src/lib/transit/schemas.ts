import { EVIDENCE_BASES } from "./types";
import { z } from "zod";

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const evidenceBasisSchema = z.enum(EVIDENCE_BASES);

export const stationRefSchema = z.object({
    nameEn: z.string(),
    nameJa: z.string(),
    stationCode: z.string().nullable(),
});

export function sourcedValueSchema<T extends z.ZodType>(valueSchema: T) {
    return z.object({
        value: valueSchema.nullable(),
        basis: evidenceBasisSchema,
        confidence: confidenceSchema,
        sourceIds: z.array(z.string()),
        sourceAsOf: z.string().nullable(),
        note: z.string().nullable(),
    });
}

const sourcedStringSchema = sourcedValueSchema(z.string());

export const transitSourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    url: z.url().nullable(),
    publisher: z.string(),
    retrievedAt: z.string(),
    sourceAsOf: z.string().nullable(),
    basis: z.enum(["reservation", "operator_live", "operator_timetable", "official_station_map", "user_route_plan"]),
});

export const transitLegSchema = z.object({
    operator: sourcedStringSchema,
    line: sourcedStringSchema,
    serviceDate: sourcedStringSchema,
    trainName: sourcedStringSchema,
    trainNumber: sourcedStringSchema,
    origin: sourcedValueSchema(stationRefSchema),
    destination: sourcedValueSchema(stationRefSchema),
    scheduledDeparture: sourcedStringSchema,
    estimatedDeparture: sourcedStringSchema,
    actualDeparture: sourcedStringSchema,
    scheduledArrival: sourcedStringSchema,
    estimatedArrival: sourcedStringSchema,
    actualArrival: sourcedStringSchema,
    departurePlatform: sourcedStringSchema,
    arrivalPlatform: sourcedStringSchema,
    carNumber: sourcedStringSchema,
    seat: sourcedStringSchema,
    reservationType: sourcedStringSchema,
});

export const wayfindingStepSchema = z.object({
    instructionEn: z.string(),
    signTextJa: z.array(z.string()),
    landmark: z.string().nullable(),
    floorChange: z.string().nullable(),
    accessibilityNote: z.string().nullable(),
    evidence: sourcedValueSchema(z.boolean()),
});

export const wayfindingPlanSchema = z.object({
    fromLabel: z.string(),
    targetLabel: z.string(),
    estimatedWalkMinutes: z.number().int().nonnegative().nullable(),
    steps: z.array(wayfindingStepSchema),
    caveats: z.array(z.string()),
});

export const transferPlanSchema = z.object({
    atStation: stationRefSchema,
    minimumMinutes: z.number().int().nonnegative().nullable(),
    instructions: z.array(wayfindingStepSchema),
    warning: z.string().nullable(),
});

export const transitBriefSchema = z.object({
    schemaVersion: z.literal(1),
    generatedAt: z.string(),
    timezone: z.literal("Asia/Tokyo"),
    summary: z.string(),
    legs: z.array(transitLegSchema),
    transfers: z.array(transferPlanSchema),
    wayfinding: wayfindingPlanSchema.nullable(),
    alerts: z.array(
        z.object({
            severity: z.enum(["info", "warning", "critical"]),
            title: z.string(),
            message: z.string(),
            sourceIds: z.array(z.string()),
            sourceAsOf: z.string().nullable(),
        }),
    ),
    verificationSteps: z.array(z.string()),
    officialActions: z.array(
        z.object({
            label: z.string(),
            url: z.url(),
            kind: z.enum(["booking", "operation_status", "station_map", "timetable"]),
        }),
    ),
    unresolvedQuestions: z.array(z.string()),
    sources: z.array(transitSourceSchema),
});

export const clarificationFieldSchema = z.object({
    field: z.enum(["serviceDate", "origin", "destination", "trainNumber", "direction", "entryPoint"]),
    question: z.string(),
    currentValue: z.string().nullable(),
    suggestions: z.array(z.string()),
});

export const transitExtractionSchema = z.object({
    schemaVersion: z.literal(1),
    summary: z.string(),
    imageKinds: z.array(z.enum(["smart_ex", "google_maps", "jr_timetable", "station_map", "other"])),
    entryPoint: z.string().nullable(),
    mobilityNeeds: z.string().nullable(),
    legs: z.array(
        z.object({
            operator: z.string().nullable(),
            line: z.string().nullable(),
            serviceDate: z.string().nullable(),
            trainName: z.string().nullable(),
            trainNumber: z.string().nullable(),
            origin: stationRefSchema.nullable(),
            destination: stationRefSchema.nullable(),
            scheduledDeparture: z.string().nullable(),
            scheduledArrival: z.string().nullable(),
            departurePlatform: z.string().nullable(),
            arrivalPlatform: z.string().nullable(),
            carNumber: z.string().nullable(),
            seat: z.string().nullable(),
            reservationType: z.string().nullable(),
            basis: z.enum(["reservation", "operator_timetable", "user_route_plan", "inferred"]),
            confidence: confidenceSchema,
        }),
    ),
    clarifications: z.array(clarificationFieldSchema),
    sensitiveDataDetected: z.boolean(),
});

export const transitCorrectionsSchema = z.record(z.string(), z.string().trim().max(200));

export const transitResearchSchema = z.object({
    brief: transitBriefSchema,
    resourceRequests: z
        .array(
            z.object({
                url: z.url(),
                purpose: z.string(),
            }),
        )
        .max(2),
});

export const wayfindingRefinementSchema = z.object({
    wayfinding: wayfindingPlanSchema,
});
