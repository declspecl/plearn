import { getAuth, getLearningChatService } from "@/lib/server/clients";

interface RouteContext {
    params: Promise<{ threadId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;
    const url = new URL(request.url);
    const before = url.searchParams.get("before");
    const limit = Number(url.searchParams.get("limit") ?? "60");
    const threadDetail = await getLearningChatService().getThreadDetail(session.user.id, threadId, {
        before,
        limit: Number.isFinite(limit) ? limit : 60,
    });
    if (!threadDetail) {
        return new Response("Thread not found", { status: 404 });
    }

    return Response.json(threadDetail);
}

export async function DELETE(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;

    try {
        const result = await getLearningChatService().deleteThread(session.user.id, threadId);
        if (!result.ok) {
            return Response.json({ code: result.code, message: result.message }, { status: result.status });
        }

        return new Response(null, { status: 204 });
    } catch {
        return Response.json({ code: "unknown", message: "Thread not found or cannot be deleted." }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;

    try {
        const body = await request.json();
        if (typeof body.title !== "string" || body.title.trim().length === 0) {
            return new Response("Invalid title", { status: 400 });
        }
        const result = await getLearningChatService().renameThread(session.user.id, threadId, body.title.trim());
        if (!result.ok) {
            return Response.json({ code: result.code, message: result.message }, { status: result.status });
        }

        return Response.json({ success: true });
    } catch {
        return Response.json({ code: "unknown", message: "Thread not found or cannot be renamed." }, { status: 500 });
    }
}
