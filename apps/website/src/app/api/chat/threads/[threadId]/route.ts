import { getAuth, getLearningAgentService } from "@/lib/server/clients";

interface RouteContext {
    params: Promise<{ threadId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;
    const threadWithMessages = await getLearningAgentService().getThreadWithMessages(session.user.id, threadId);
    if (!threadWithMessages) {
        return new Response("Thread not found", { status: 404 });
    }

    return Response.json({
        thread: {
            id: threadWithMessages.thread.id,
            title: threadWithMessages.thread.title,
            summary: threadWithMessages.thread.summary,
            languageCode: threadWithMessages.thread.languageCode,
            lastMessageAt: threadWithMessages.thread.lastMessageAt.toISOString(),
            createdAt: threadWithMessages.thread.createdAt.toISOString(),
            updatedAt: threadWithMessages.thread.updatedAt.toISOString(),
        },
        messages: threadWithMessages.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            parts: message.partsJson,
            toolCalls: message.toolCallsJson,
            toolResults: message.toolResultsJson,
            createdAt: message.createdAt.toISOString(),
        })),
    });
}

export async function DELETE(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;

    try {
        await getLearningAgentService().deleteThread(session.user.id, threadId);
        return new Response(null, { status: 204 });
    } catch {
        return new Response("Thread not found or cannot be deleted", { status: 404 });
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
        await getLearningAgentService().renameThread(session.user.id, threadId, body.title.trim());
        return Response.json({ success: true });
    } catch {
        return new Response("Thread not found or cannot be renamed", { status: 404 });
    }
}
