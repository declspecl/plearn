import { learningRouter } from "./learning-router";
import { srsRouter } from "./srs-router";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    learning: learningRouter,
    srs: srsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
