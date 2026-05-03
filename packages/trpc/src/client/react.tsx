"use client";

import { createQueryClient } from "../query-client";
import type { AppRouter } from "../server/trpc/root";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

export const api: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>({});

function getBaseUrl() {
    if (globalThis.window !== undefined) {
        return globalThis.location.origin;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCReactProvider(properties: { children: React.ReactNode }) {
    const [queryClient] = useState(() => createQueryClient());

    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                loggerLink({
                    enabled: (op) => process.env.NODE_ENV === "development" || (op.direction === "down" && op.result instanceof Error),
                }),
                httpBatchLink({
                    transformer: SuperJSON,
                    url: `${getBaseUrl()}/api/trpc`,
                    headers: () => {
                        const headers = new Headers();

                        headers.set("x-trpc-source", "nextjs-react");

                        return headers;
                    },
                }),
            ],
        }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
                {properties.children}
            </api.Provider>
        </QueryClientProvider>
    );
}
