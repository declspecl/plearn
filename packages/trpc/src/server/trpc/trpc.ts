import type { AuthInstance } from "@plearn/auth/server";
import type { TaskService } from "@plearn/core/task/service";
import type { DatabaseInstance } from "@plearn/db/client";
import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { ZodError } from "zod";

/**
 * Repository interfaces for dependency injection.
 */
export type Repositories = Record<string, never>;

/**
 * Service interfaces for dependency injection.
 */
export interface Services {
    readonly taskService: TaskService;
}

export interface TRPCContext {
    readonly auth: AuthInstance;
    readonly db: DatabaseInstance;
    readonly headers: Headers;
    readonly session: Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;
    readonly repositories: Repositories;
    readonly services: Services;
}

interface CreateTRPCContextParameters {
    readonly db: DatabaseInstance;
    readonly auth: AuthInstance;
    readonly headers: Headers;
    readonly repositories: Repositories;
    readonly services: Services;
}

export const createTRPCContext = async ({
    db,
    auth,
    headers,
    repositories,
    services,
}: CreateTRPCContextParameters): Promise<TRPCContext> => {
    const session = await auth.api.getSession({ headers });

    return {
        auth,
        db,
        headers,
        session,
        repositories,
        services,
    };
};

const t = initTRPC.context<TRPCContext>().create({
    transformer: SuperJSON,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
    const start = Date.now();
    const result = await next();
    const end = Date.now();

    console.log(`[TRPC] ${path} took ${end - start}ms`);

    return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure.use(timingMiddleware).use(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
        ctx: {
            ...ctx,
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});
