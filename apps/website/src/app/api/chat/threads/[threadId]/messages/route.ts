import { getAuth, getLearningChatService } from "@/lib/server/clients";
import { z } from "zod";

const requestSchema = z.object({
    message: z.string().min(1).optional(),
    retryMessageId: z.string().min(1).optional(),
    clientTurnId: z.string().min(1).optional(),
});

interface RouteContext {
    params: Promise<{ threadId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { threadId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
        return new Response("Invalid request payload", { status: 400 });
    }

    return getLearningChatService().runTurn({
        userId: session.user.id,
        threadId,
        message: parsed.data.message,
        retryMessageId: parsed.data.retryMessageId,
        clientTurnId: parsed.data.clientTurnId,
        requestSignal: request.signal,
    });
}
