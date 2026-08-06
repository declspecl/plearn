import { getAuth, getTransitService } from "@/lib/server/clients";
import { TransitServiceError } from "@/lib/server/transit/service";

export const runtime = "nodejs";

interface RouteContext {
    readonly params: Promise<{ threadId: string }>;
}

function serviceErrorResponse(error: unknown) {
    if (error instanceof TransitServiceError) {
        return Response.json({ code: error.code, message: error.message }, { status: error.status });
    }

    return Response.json({ code: "network_error", message: "The Transit service is unavailable." }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ code: "unauthorized", message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { threadId } = await context.params;
        const detail = await getTransitService().getThreadDetail(session.user.id, threadId);
        if (!detail) {
            return Response.json({ code: "not_found", message: "Transit thread not found." }, { status: 404 });
        }

        return Response.json(detail);
    } catch (error) {
        return serviceErrorResponse(error);
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return Response.json({ code: "unauthorized", message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { threadId } = await context.params;
        const deleted = await getTransitService().deleteThread(session.user.id, threadId);

        return deleted
            ? new Response(null, { status: 204 })
            : Response.json({ code: "not_found", message: "Transit thread not found." }, { status: 404 });
    } catch (error) {
        return serviceErrorResponse(error);
    }
}
