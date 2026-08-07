import { DATE_PATTERN } from "@/lib/calendar";
import { getAuth, getTransitService } from "@/lib/server/clients";
import { sanitizeTransitTurnFields, TransitServiceError } from "@/lib/server/transit/service";
import { normalizeTransitImages, TransitUploadError } from "@/lib/server/transit/uploads";
import { CLOCK_PATTERN, MAX_DEPARTURE_OFFSET_MINUTES, resolveDepartureWindow } from "@/lib/transit/departure";
import { transitCorrectionsSchema } from "@/lib/transit/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 180;

const fieldsSchema = z.object({
    clientTurnId: z.string().trim().min(1).max(120),
    travelDate: z.string().regex(DATE_PATTERN).nullable(),
    departOffsetMinutes: z.coerce.number().int().min(0).max(MAX_DEPARTURE_OFFSET_MINUTES).nullable(),
    departAfter: z.string().regex(CLOCK_PATTERN).nullable(),
    departBefore: z.string().regex(CLOCK_PATTERN).nullable(),
});

interface RouteContext {
    readonly params: Promise<{ threadId: string }>;
}

function field(formData: FormData, key: string) {
    const value = formData.get(key);

    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ code: "unauthorized", message: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const parsedFields = fieldsSchema.safeParse({
            clientTurnId: field(formData, "clientTurnId"),
            travelDate: field(formData, "travelDate"),
            departOffsetMinutes: field(formData, "departOffsetMinutes"),
            departAfter: field(formData, "departAfter"),
            departBefore: field(formData, "departBefore"),
        });
        if (!parsedFields.success) {
            return Response.json({ code: "invalid_upload", message: "The transit request fields are invalid." }, { status: 400 });
        }

        const correctionsText = field(formData, "correctionsJson");
        const parsedCorrections = transitCorrectionsSchema.safeParse(correctionsText ? JSON.parse(correctionsText) : {});
        if (!parsedCorrections.success) {
            return Response.json({ code: "needs_confirmation", message: "The extraction corrections are invalid." }, { status: 400 });
        }

        const files = formData.getAll("images").filter((value): value is File => value instanceof File);
        const [images, params] = await Promise.all([normalizeTransitImages(files), context.params]);
        const text = sanitizeTransitTurnFields({
            message: field(formData, "message"),
            entryPoint: field(formData, "entryPoint"),
            mobilityNeeds: field(formData, "mobilityNeeds"),
            city: field(formData, "city"),
        });

        const departureWindow = resolveDepartureWindow({
            travelDate: parsedFields.data.travelDate,
            offsetMinutes: parsedFields.data.departOffsetMinutes,
            after: parsedFields.data.departAfter,
            before: parsedFields.data.departBefore,
        });

        return await getTransitService().runTurn({
            userId: session.user.id,
            threadId: params.threadId,
            clientTurnId: parsedFields.data.clientTurnId,
            travelDate: parsedFields.data.travelDate,
            departureWindow,
            corrections: parsedCorrections.data,
            images,
            requestSignal: request.signal,
            ...text,
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return Response.json({ code: "needs_confirmation", message: "The extraction corrections are invalid JSON." }, { status: 400 });
        }
        if (error instanceof TransitUploadError) {
            return Response.json({ code: "invalid_upload", message: error.message }, { status: 400 });
        }
        if (error instanceof TransitServiceError) {
            return Response.json({ code: error.code, message: error.message }, { status: error.status });
        }

        return Response.json({ code: "network_error", message: "The rail check could not be started." }, { status: 500 });
    }
}
