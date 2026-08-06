import { getAuth, getTransitService } from "@/lib/server/clients";
import { TransitServiceError } from "@/lib/server/transit/service";

export const runtime = "nodejs";

function serviceErrorResponse(error: unknown) {
    if (error instanceof TransitServiceError) {
        return Response.json({ code: error.code, message: error.message }, { status: error.status });
    }

    console.error("[TRANSIT] Thread request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
    });

    return Response.json({ code: "network_error", message: "The Transit service is unavailable." }, { status: 500 });
}

export async function GET(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ code: "unauthorized", message: "Unauthorized" }, { status: 401 });
    }

    try {
        const threads = await getTransitService().listThreads(session.user.id);

        return Response.json({ threads });
    } catch (error) {
        return serviceErrorResponse(error);
    }
}

export async function POST(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ code: "unauthorized", message: "Unauthorized" }, { status: 401 });
    }

    try {
        const thread = await getTransitService().createThread(session.user.id);

        return Response.json({ thread });
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
