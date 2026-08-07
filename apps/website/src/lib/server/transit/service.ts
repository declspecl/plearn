import { getAppConfig } from "../app-config";
import { buildUnverifiedTransitBrief } from "./evidence";
import { extractTransitFromImages, researchTransit } from "./model";
import { TransitRepository, type TransitMessagePart } from "./repository";
import { sanitizeUserText } from "./sanitize";
import { createTransitNdjsonStream } from "./streaming";
import type { NormalizedTransitImage } from "./uploads";
import type { ResolvedDepartureWindow } from "@/lib/transit/departure";
import type { SanitizedTransitExtraction, TransitBrief, TransitFailureCode, TransitWarningCode } from "@/lib/transit/types";
import type { DatabaseInstance } from "@plearn/db/client";
import "server-only";

export class TransitServiceError extends Error {
    public constructor(
        message: string,
        public readonly code: TransitFailureCode,
        public readonly status: number,
    ) {
        super(message);
        this.name = "TransitServiceError";
    }
}

export interface TransitTurnInput {
    readonly userId: string;
    readonly threadId: string;
    readonly clientTurnId: string;
    readonly message: string | null;
    readonly entryPoint: string | null;
    readonly travelDate: string | null;
    /** Explicit Asia/Tokyo departure window when the traveler is not taking the booked service. */
    readonly departureWindow: ResolvedDepartureWindow | null;
    readonly mobilityNeeds: string | null;
    readonly city: string | null;
    readonly corrections: Readonly<Record<string, string>>;
    readonly images: readonly NormalizedTransitImage[];
    readonly requestSignal?: AbortSignal;
}

function combineSignals(signals: readonly (AbortSignal | undefined)[]) {
    const available = signals.filter((signal): signal is AbortSignal => signal !== undefined);

    return available.length === 0 ? undefined : available.length === 1 ? available[0] : AbortSignal.any(available);
}

function isAbortError(error: unknown) {
    return (
        (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) ||
        (error instanceof Error && /abort|timeout/iu.test(`${error.name} ${error.message}`))
    );
}

function applyCorrections(
    extraction: SanitizedTransitExtraction,
    corrections: Readonly<Record<string, string>>,
    suppliedEntryPoint: string | null,
    suppliedTravelDate: string | null,
): SanitizedTransitExtraction {
    if (Object.keys(corrections).length === 0 && !suppliedEntryPoint && !suppliedTravelDate) {
        return extraction;
    }

    const correctedFields = new Set(Object.keys(corrections));
    if (suppliedEntryPoint) {
        correctedFields.add("entryPoint");
    }
    if (suppliedTravelDate) {
        correctedFields.add("serviceDate");
    }

    return {
        ...extraction,
        entryPoint: suppliedEntryPoint ?? corrections.entryPoint ?? extraction.entryPoint,
        legs: extraction.legs.map((leg, index) => {
            if (index > 0) {
                return leg;
            }

            const origin = corrections.origin ? { nameEn: corrections.origin, nameJa: corrections.origin, stationCode: null } : leg.origin;
            const destination = corrections.destination
                ? { nameEn: corrections.destination, nameJa: corrections.destination, stationCode: null }
                : leg.destination;
            const normalizedDirection = corrections.direction?.toLowerCase() ?? "";
            const originLabel = [origin?.nameEn, origin?.nameJa].filter(Boolean).map((value) => value!.toLowerCase());
            const destinationLabel = [destination?.nameEn, destination?.nameJa].filter(Boolean).map((value) => value!.toLowerCase());
            const originIndex = originLabel.reduce((best, label) => {
                const index = normalizedDirection.indexOf(label);

                return index !== -1 && (best < 0 || index < best) ? index : best;
            }, -1);
            const destinationIndex = destinationLabel.reduce((best, label) => {
                const index = normalizedDirection.indexOf(label);

                return index !== -1 && (best < 0 || index < best) ? index : best;
            }, -1);
            const reverseDirection =
                normalizedDirection === "reverse" || (destinationIndex >= 0 && originIndex >= 0 && destinationIndex < originIndex);

            return {
                ...leg,
                serviceDate: suppliedTravelDate ?? corrections.serviceDate ?? leg.serviceDate,
                trainNumber: corrections.trainNumber ?? leg.trainNumber,
                origin: reverseDirection ? destination : origin,
                destination: reverseDirection ? origin : destination,
                confidence: "high" as const,
            };
        }),
        clarifications: extraction.clarifications.filter((field) => !correctedFields.has(field.field)),
    };
}

function departureWindowSummary(window: ResolvedDepartureWindow) {
    const bound = window.before ? `${window.after}–${window.before}` : `from ${window.after}`;

    return `${window.date} ${bound} JST${window.relativeMinutes === null ? "" : ` (leaving in ${window.relativeMinutes} min)`}`;
}

function userMessageParts(input: TransitTurnInput): readonly TransitMessagePart[] {
    const summary = [
        input.message,
        input.entryPoint ? `Starting point: ${input.entryPoint}` : null,
        input.travelDate ? `Travel date: ${input.travelDate}` : null,
        input.departureWindow ? `Departure window: ${departureWindowSummary(input.departureWindow)}` : null,
        input.mobilityNeeds ? `Mobility/luggage: ${input.mobilityNeeds}` : null,
        input.images.length > 0 ? `${input.images.length} transient screenshot${input.images.length === 1 ? "" : "s"} processed.` : null,
    ]
        .filter(Boolean)
        .join("\n");

    return [{ type: "text", text: summary || "Verify this journey." }];
}

function warningsForBrief(input: {
    brief: TransitBrief;
    extraction: SanitizedTransitExtraction;
    mapFetchAttempted: boolean;
    mapFetchSucceeded: boolean;
}): readonly { code: TransitWarningCode; message: string }[] {
    const warnings: { code: TransitWarningCode; message: string }[] = [];
    if (!input.brief.sources.some((source) => source.basis === "operator_live")) {
        warnings.push({
            code: "not_currently_verified",
            message: "No recent train-specific operator update was verified. Scheduled and reservation details remain clearly labeled.",
        });
    }
    if (input.brief.legs.some((leg) => leg.departurePlatform.value === null || leg.departurePlatform.basis === "unavailable")) {
        warnings.push({
            code: "platform_unpublished",
            message: "A departure platform was not published. Check the station departure board.",
        });
    }
    if (input.mapFetchAttempted && !input.mapFetchSucceeded) {
        warnings.push({
            code: "map_unavailable",
            message: "An official station-map resource could not be read; indoor directions are limited.",
        });
    }
    if (input.extraction.legs.some((leg) => leg.operator && !/\bJR\b|Japan Rail/iu.test(leg.operator))) {
        warnings.push({
            code: "limited_coverage",
            message: "This journey includes a non-JR operator and is handled on a best-effort basis.",
        });
    }

    return warnings;
}

function failureDetails(error: unknown): { code: TransitFailureCode; message: string; status: "failed" | "cancelled" | "timed_out" } {
    if (isAbortError(error)) {
        const timedOut = error instanceof DOMException && error.name === "TimeoutError";

        return {
            code: timedOut ? "timeout" : "network_error",
            message: timedOut
                ? "The rail verification timed out. Your redacted extraction can be retried."
                : "The rail verification was cancelled.",
            status: timedOut ? "timed_out" : "cancelled",
        };
    }

    return {
        code: "model_error",
        message: "The rail assistant could not finish this request. Try research again, or reattach the screenshot if extraction failed.",
        status: "failed",
    };
}

export class TransitService {
    private readonly repository: TransitRepository;

    public constructor(database: DatabaseInstance) {
        this.repository = new TransitRepository(database);
    }

    public async createThread(userId: string) {
        await this.repairStaleRuns();

        return this.repository.createThread(userId);
    }

    public async listThreads(userId: string) {
        await this.repairStaleRuns();

        return this.repository.listThreads(userId);
    }

    public async getThreadDetail(userId: string, threadId: string) {
        await this.repairStaleRuns();

        return this.repository.getThreadDetail(userId, threadId);
    }

    public async deleteThread(userId: string, threadId: string) {
        if (await this.repository.getActiveRunForThread(threadId)) {
            throw new TransitServiceError("This rail check is still running.", "run_in_progress", 409);
        }

        return this.repository.archiveThread(userId, threadId);
    }

    public async runTurn(input: TransitTurnInput) {
        await this.repairStaleRuns();
        const config = getAppConfig();
        const thread = await this.repository.getThread(input.userId, input.threadId);
        if (!thread) {
            throw new TransitServiceError("Transit thread not found.", "not_found", 404);
        }
        if (await this.repository.findRunByClientTurnId(input.threadId, input.clientTurnId)) {
            throw new TransitServiceError("This transit request was already submitted.", "run_in_progress", 409);
        }
        if (await this.repository.getActiveRunForUser(input.userId)) {
            throw new TransitServiceError("Another rail check is already running.", "run_in_progress", 409);
        }
        const previous = await this.repository.getThreadDetail(input.userId, input.threadId);
        if (input.images.length === 0 && !previous?.extraction) {
            throw new TransitServiceError("Attach a journey screenshot to begin.", "needs_image", 400);
        }

        const userMessage = await this.repository.createMessage({
            threadId: input.threadId,
            role: "user",
            status: "completed",
            parts: userMessageParts(input),
        });
        const assistantMessage = await this.repository.createMessage({
            threadId: input.threadId,
            role: "assistant",
            status: "streaming",
            parts: [],
        });
        const run = await this.repository.createRun({
            threadId: input.threadId,
            triggerMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
            clientTurnId: input.clientTurnId,
        });
        const signal = combineSignals([input.requestSignal, AbortSignal.timeout(config.TRANSIT_ASSISTANT_TIMEOUT_MS)]);

        return createTransitNdjsonStream(async (send) => {
            send({ type: "run-start", runId: run.id, threadId: input.threadId });
            let extraction = input.images.length > 0 ? null : (previous?.extraction ?? null);
            let extractionUsage: unknown = null;

            try {
                if (input.images.length > 0) {
                    send({ type: "stage", stage: "reading_screenshot", message: "Reading the screenshot at full detail" });
                    const extracted = await extractTransitFromImages({
                        images: input.images,
                        entryPoint: input.entryPoint,
                        travelDate: input.travelDate,
                        departureWindow: input.departureWindow,
                        mobilityNeeds: input.mobilityNeeds,
                        message: input.message,
                        signal,
                    });
                    extraction = extracted.extraction;
                    extractionUsage = extracted.usage;
                    send({ type: "extraction-ready", extraction });
                }

                if (!extraction) {
                    throw new TransitServiceError("Screenshot extraction is unavailable; reattach the screenshot.", "needs_image", 400);
                }

                extraction = applyCorrections(extraction, input.corrections, input.entryPoint, input.travelDate);
                if (input.departureWindow) {
                    // The window settles which day the traveler is asking about, so a service-date question is
                    // moot. It must not rewrite the reservation's own date or promote its confidence: the window
                    // is an intent, not evidence, and it reaches the model through the research prompt instead.
                    extraction = {
                        ...extraction,
                        clarifications: extraction.clarifications.filter((field) => field.field !== "serviceDate"),
                    };
                }
                if (extraction.clarifications.length > 0) {
                    const parts: TransitMessagePart[] = [
                        { type: "text", text: "I need a few details before checking official rail information." },
                        { type: "transit-extraction", extraction },
                    ];
                    await this.repository.updateAssistantMessage({
                        messageId: assistantMessage.id,
                        status: "completed",
                        parts,
                        modelId: config.TRANSIT_ASSISTANT_MODEL,
                        tokenUsage: extractionUsage,
                    });
                    await this.repository.finalizeRun(run.id, "completed");
                    send({ type: "needs-confirmation", fields: extraction.clarifications });
                    send({ type: "finish", runId: run.id });

                    return;
                }

                send({ type: "stage", stage: "checking_reservation", message: "Checking reservation and timetable evidence" });
                send({ type: "stage", stage: "searching_official", message: "Searching current official JR and SmartEX sources" });
                let researched;
                try {
                    researched = await researchTransit({
                        extraction,
                        entryPoint: input.entryPoint ?? extraction.entryPoint,
                        mobilityNeeds: input.mobilityNeeds ?? extraction.mobilityNeeds,
                        city: input.city,
                        message: input.message,
                        departureWindow: input.departureWindow,
                        previousBrief: previous?.brief ?? null,
                        signal,
                        onStage(stage) {
                            const message =
                                stage === "reading_maps" ? "Reading official station-map resources" : "Building station directions";
                            send({ type: "stage", stage, message });
                        },
                    });
                } catch (researchError) {
                    if (isAbortError(researchError) || signal?.aborted) {
                        throw signal?.reason ?? researchError;
                    }
                    const fallback = buildUnverifiedTransitBrief(extraction);
                    researched = {
                        brief: fallback,
                        sources: fallback.sources,
                        usage: { research: null, refinement: null },
                        mapFetchAttempted: false,
                        mapFetchSucceeded: false,
                    };
                    // Falling back is not the same as finding nothing: say so rather than shipping a
                    // screenshot-only brief that merely looks under-sourced.
                    send({
                        type: "warning",
                        code: "not_currently_verified",
                        message: "Official source research failed, so this brief repeats your screenshot only. Nothing here is verified.",
                    });
                }
                send({ type: "stage", stage: "building_directions", message: "Building your station-ready boarding brief" });
                for (const source of researched.sources) {
                    send({ type: "source", source });
                }
                for (const warning of warningsForBrief({ ...researched, extraction })) {
                    send({ type: "warning", ...warning });
                }

                const parts: TransitMessagePart[] = [
                    { type: "text", text: researched.brief.summary },
                    { type: "transit-extraction", extraction },
                    { type: "transit-brief", brief: researched.brief },
                ];
                await this.repository.updateAssistantMessage({
                    messageId: assistantMessage.id,
                    status: "completed",
                    parts,
                    modelId: config.TRANSIT_ASSISTANT_MODEL,
                    tokenUsage: { extraction: extractionUsage, ...researched.usage },
                });
                await Promise.all([
                    this.repository.finalizeRun(run.id, "completed"),
                    this.repository.updateThreadFromBrief(input.threadId, researched.brief),
                ]);
                send({ type: "brief-ready", brief: researched.brief });
                send({ type: "finish", runId: run.id });
            } catch (error) {
                const failure = failureDetails(signal?.aborted ? signal.reason : error);
                const retainedParts: TransitMessagePart[] = extraction ? [{ type: "transit-extraction", extraction }] : [];
                await Promise.allSettled([
                    this.repository.updateAssistantMessage({
                        messageId: assistantMessage.id,
                        status: failure.status === "cancelled" ? "cancelled" : "failed",
                        parts: retainedParts,
                        failureCode: failure.code,
                        failureMessage: failure.message,
                        modelId: config.TRANSIT_ASSISTANT_MODEL,
                        tokenUsage: extractionUsage,
                    }),
                    this.repository.finalizeRun(run.id, failure.status, failure.message),
                ]);
                send({ type: "error", code: failure.code, message: failure.message });
                send({ type: "finish", runId: run.id });
            }
        });
    }

    private repairStaleRuns() {
        const graceMs = getAppConfig().TRANSIT_ASSISTANT_TIMEOUT_MS + 15_000;

        return this.repository.repairStaleRuns(new Date(Date.now() - graceMs));
    }
}

export function sanitizeTransitTurnFields(input: {
    message?: string | null;
    entryPoint?: string | null;
    mobilityNeeds?: string | null;
    city?: string | null;
}) {
    return {
        message: sanitizeUserText(input.message, 2000),
        entryPoint: sanitizeUserText(input.entryPoint, 240),
        mobilityNeeds: sanitizeUserText(input.mobilityNeeds, 500),
        city: sanitizeUserText(input.city, 120),
    };
}
