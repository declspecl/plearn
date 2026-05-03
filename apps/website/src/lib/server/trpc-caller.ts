import { getAuth, getDatabaseClient, getRepositories, getServices } from "./clients";
import { appRouter, createCallerFactory, createTRPCContext } from "@plearn/trpc/server";
import { headers } from "next/headers";
import "server-only";

const createCaller = createCallerFactory(appRouter);

export async function createTRPCCaller() {
    const requestHeaders = new Headers(await headers());

    const context = await createTRPCContext({
        db: getDatabaseClient(),
        auth: getAuth(),
        headers: requestHeaders,
        repositories: getRepositories(),
        services: getServices(),
    });

    return createCaller(context);
}
