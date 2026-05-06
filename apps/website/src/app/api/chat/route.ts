import { getAuth, getServices } from "@/lib/server/clients";
import { runVietnameseChatTurn } from "@/lib/server/vietnamese-chat-machine";
import { z } from "zod";

const requestSchema = z.object({
    message: z.string().min(1),
});

export async function POST(request: Request) {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
        return new Response("Invalid request payload", { status: 400 });
    }

    return runVietnameseChatTurn({
        message: parsed.data.message,
        userId: session.user.id,
        services: getServices(),
    });
}
