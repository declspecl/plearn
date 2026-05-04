import { getAuth } from "./clients";
import { headers } from "next/headers";
import "server-only";

export async function getSession() {
    const requestHeaders = new Headers(await headers());

    return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireSession() {
    const session = await getSession();

    if (!session?.user) {
        return null;
    }

    return session;
}
