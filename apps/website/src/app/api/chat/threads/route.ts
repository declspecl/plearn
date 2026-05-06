import { getAuth, getLearningChatService } from "@/lib/server/clients";
import { z } from "zod";

const createThreadSchema = z.object({
    languageCode: z.string().min(2).optional(),
});

export async function GET(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const threads = await getLearningChatService().listThreads(session.user.id);

    return Response.json({ threads });
}

export async function POST(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const parsed = createThreadSchema.safeParse(payload);
    if (!parsed.success) {
        return new Response("Invalid request payload", { status: 400 });
    }

    const thread = await getLearningChatService().createThread(session.user.id, parsed.data.languageCode ?? "vi");

    return Response.json({ thread });
}
