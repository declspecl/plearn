import { getAuth, getDatabaseClient, getRepositories, getServices } from "@/lib/server/clients";
import { appRouter, createTRPCContext } from "@plearn/trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import "server-only";

const createContext = async (request: NextRequest) => {
    return createTRPCContext({
        db: getDatabaseClient(),
        auth: getAuth(),
        headers: request.headers,
        repositories: getRepositories(),
        services: getServices(),
    });
};

const handler = (request: NextRequest) =>
    fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: () => createContext(request),
        onError:
            process.env.NODE_ENV === "development"
                ? ({ path, error }) => {
                      console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
                  }
                : undefined,
    });

export { handler as GET, handler as POST };
