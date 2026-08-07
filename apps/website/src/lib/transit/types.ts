export const EVIDENCE_BASES = [
    "reservation",
    "operator_live",
    "operator_timetable",
    "official_station_map",
    "user_route_plan",
    "inferred",
    "unavailable",
] as const;

export type EvidenceBasis = (typeof EVIDENCE_BASES)[number];
export type Confidence = "high" | "medium" | "low";

export interface SourcedValue<T> {
    readonly value: T | null;
    readonly basis: EvidenceBasis;
    readonly confidence: Confidence;
    readonly sourceIds: readonly string[];
    readonly sourceAsOf: string | null;
    readonly note: string | null;
}

export interface StationRef {
    readonly nameEn: string;
    readonly nameJa: string;
    readonly stationCode: string | null;
}

export interface TransitSource {
    readonly id: string;
    readonly title: string;
    readonly url: string | null;
    readonly publisher: string;
    readonly retrievedAt: string;
    readonly sourceAsOf: string | null;
    readonly basis: Exclude<EvidenceBasis, "inferred" | "unavailable">;
}

export interface TransitLeg {
    readonly operator: SourcedValue<string>;
    readonly line: SourcedValue<string>;
    readonly serviceDate: SourcedValue<string>;
    readonly trainName: SourcedValue<string>;
    readonly trainNumber: SourcedValue<string>;
    readonly origin: SourcedValue<StationRef>;
    readonly destination: SourcedValue<StationRef>;
    readonly scheduledDeparture: SourcedValue<string>;
    readonly estimatedDeparture: SourcedValue<string>;
    readonly actualDeparture: SourcedValue<string>;
    readonly scheduledArrival: SourcedValue<string>;
    readonly estimatedArrival: SourcedValue<string>;
    readonly actualArrival: SourcedValue<string>;
    readonly departurePlatform: SourcedValue<string>;
    readonly arrivalPlatform: SourcedValue<string>;
    readonly carNumber: SourcedValue<string>;
    readonly seat: SourcedValue<string>;
    readonly reservationType: SourcedValue<string>;
}

export interface WayfindingStep {
    readonly instructionEn: string;
    readonly signTextJa: readonly string[];
    readonly landmark: string | null;
    readonly floorChange: string | null;
    readonly accessibilityNote: string | null;
    readonly evidence: SourcedValue<boolean>;
}

export interface WayfindingPlan {
    readonly fromLabel: string;
    readonly targetLabel: string;
    readonly estimatedWalkMinutes: number | null;
    readonly steps: readonly WayfindingStep[];
    readonly caveats: readonly string[];
}

export interface TransferPlan {
    readonly atStation: StationRef;
    readonly minimumMinutes: number | null;
    readonly instructions: readonly WayfindingStep[];
    readonly warning: string | null;
}

export interface TransitAlert {
    readonly severity: "info" | "warning" | "critical";
    readonly title: string;
    readonly message: string;
    readonly sourceIds: readonly string[];
    readonly sourceAsOf: string | null;
}

export interface OfficialAction {
    readonly label: string;
    readonly url: string;
    readonly kind: "booking" | "operation_status" | "station_map" | "timetable";
}

export interface TransitBrief {
    readonly schemaVersion: 1;
    readonly generatedAt: string;
    readonly timezone: "Asia/Tokyo";
    readonly summary: string;
    readonly legs: readonly TransitLeg[];
    readonly transfers: readonly TransferPlan[];
    readonly wayfinding: WayfindingPlan | null;
    readonly alerts: readonly TransitAlert[];
    readonly verificationSteps: readonly string[];
    readonly officialActions: readonly OfficialAction[];
    readonly unresolvedQuestions: readonly string[];
    readonly sources: readonly TransitSource[];
}

export interface ClarificationField {
    readonly field: "serviceDate" | "origin" | "destination" | "trainNumber" | "direction" | "entryPoint";
    readonly question: string;
    readonly currentValue: string | null;
    readonly suggestions: readonly string[];
}

export interface ExtractedTransitLeg {
    readonly operator: string | null;
    readonly line: string | null;
    readonly serviceDate: string | null;
    readonly trainName: string | null;
    readonly trainNumber: string | null;
    readonly origin: StationRef | null;
    readonly destination: StationRef | null;
    readonly scheduledDeparture: string | null;
    readonly scheduledArrival: string | null;
    readonly departurePlatform: string | null;
    readonly arrivalPlatform: string | null;
    readonly carNumber: string | null;
    readonly seat: string | null;
    readonly reservationType: string | null;
    readonly basis: "reservation" | "operator_timetable" | "user_route_plan" | "inferred";
    readonly confidence: Confidence;
}

export interface SanitizedTransitExtraction {
    readonly schemaVersion: 1;
    readonly summary: string;
    readonly imageKinds: readonly ("smart_ex" | "google_maps" | "jr_timetable" | "station_map" | "other")[];
    readonly entryPoint: string | null;
    readonly mobilityNeeds: string | null;
    readonly legs: readonly ExtractedTransitLeg[];
    readonly clarifications: readonly ClarificationField[];
    readonly sensitiveDataDetected: boolean;
}

export interface TransitThreadSummary {
    readonly id: string;
    readonly title: string;
    readonly summary: string | null;
    readonly lastMessageAt: string;
    readonly createdAt: string;
    readonly hasActiveRun: boolean;
}

export interface TransitThreadDetail {
    readonly thread: TransitThreadSummary;
    readonly extraction: SanitizedTransitExtraction | null;
    readonly brief: TransitBrief | null;
    readonly messages: readonly { id: string; role: "user" | "assistant"; text: string; createdAt: string }[];
}

export type TransitStage = "reading_screenshot" | "checking_reservation" | "searching_official" | "reading_maps" | "building_directions";
export type TransitWarningCode =
    "not_currently_verified" | "platform_unpublished" | "source_conflict" | "map_unavailable" | "limited_coverage";
export type TransitFailureCode =
    | "invalid_upload"
    | "needs_image"
    | "needs_confirmation"
    | "run_in_progress"
    | "model_error"
    | "network_error"
    | "timeout"
    | "unauthorized"
    | "not_found";

export type TransitStreamEvent =
    | { readonly type: "run-start"; readonly runId: string; readonly threadId: string }
    | { readonly type: "stage"; readonly stage: TransitStage; readonly message: string }
    | { readonly type: "extraction-ready"; readonly extraction: SanitizedTransitExtraction }
    | { readonly type: "needs-confirmation"; readonly fields: readonly ClarificationField[] }
    | { readonly type: "source"; readonly source: TransitSource }
    | { readonly type: "brief-ready"; readonly brief: TransitBrief }
    | { readonly type: "warning"; readonly code: TransitWarningCode; readonly message: string }
    | { readonly type: "error"; readonly code: TransitFailureCode; readonly message: string }
    | { readonly type: "finish"; readonly runId: string };
