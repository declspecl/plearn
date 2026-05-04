import { createComposition } from "@plearn/composition/create-composition";
import type { CreateCompositionOptions } from "@plearn/composition/create-composition";

export const clearboxDomains = [] as const;

export interface ClearboxEnvironment {
    readonly compositionOptions: CreateCompositionOptions<typeof clearboxDomains>;
}

const clearboxClock = {
    now(): Date {
        return new Date();
    },
};

const clearboxLogger = {
    info(message: string, metadata?: Readonly<Record<string, unknown>>): void {
        console.info(message, metadata ?? {});
    },
    warn(message: string, metadata?: Readonly<Record<string, unknown>>): void {
        console.warn(message, metadata ?? {});
    },
    error(message: string, metadata?: Readonly<Record<string, unknown>>): void {
        console.error(message, metadata ?? {});
    },
};

export function loadClearboxEnvironment(environment: NodeJS.ProcessEnv): ClearboxEnvironment {
    return {
        compositionOptions: {
            clock: clearboxClock,
            databaseUrl: requireEnvironmentVariable(environment, "DATABASE_URL"),
            domains: clearboxDomains,
            logger: clearboxLogger,
        },
    };
}

export function createClearboxRuntime(environment: NodeJS.ProcessEnv) {
    const clearboxEnvironment = loadClearboxEnvironment(environment);

    return {
        composition: createComposition(clearboxEnvironment.compositionOptions),
    };
}

function requireEnvironmentVariable(environment: NodeJS.ProcessEnv, name: string): string {
    const value = environment[name];
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${name} is required for clearbox tests`);
    }

    return value;
}
