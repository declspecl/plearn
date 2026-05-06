import { getAuth, getLearningAgentService } from "@/lib/server/clients";
import { z } from "zod";

const createThreadSchema = z.object({
    languageCode: z.string().min(2).optional(),
});

export async function GET(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const threads = await getLearningAgentService().listThreads(session.user.id);

    return Response.json({
        threads: threads.map((thread) => ({
            id: thread.id,
            title: thread.title,
            summary: thread.summary,
            languageCode: thread.languageCode,
            lastMessageAt: thread.lastMessageAt.toISOString(),
            createdAt: thread.createdAt.toISOString(),
            updatedAt: thread.updatedAt.toISOString(),
        })),
    });
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

    const thread = await getLearningAgentService().createThread(session.user.id, parsed.data.languageCode ?? "vi");

    return Response.json({
        thread: {
            id: thread.id,
            title: thread.title,
            summary: thread.summary,
            languageCode: thread.languageCode,
            lastMessageAt: thread.lastMessageAt.toISOString(),
            createdAt: thread.createdAt.toISOString(),
            updatedAt: thread.updatedAt.toISOString(),
        },
    });
}
