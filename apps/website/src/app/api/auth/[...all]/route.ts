import { getAuth } from "@/lib/server/clients";
import { toNextJsHandler } from "@plearn/auth/server";
import "server-only";

export const GET = (request: Request) => {
    const auth = getAuth();

    return toNextJsHandler(auth).GET(request);
};

export const POST = (request: Request) => {
    const auth = getAuth();

    return toNextJsHandler(auth).POST(request);
};
