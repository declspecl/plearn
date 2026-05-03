import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server";

interface ValidationIssue {
    message: string;
}

interface ValidationResultLike {
    valid: boolean;
    errors: ValidationIssue[];
}

type ResultLike<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export function throwBadRequestFromValidation(validation: ValidationResultLike): void {
    if (validation.valid) {
        return;
    }

    const message = validation.errors.map((error) => error.message).join(", ") || "Invalid input";

    throw new TRPCError({
        code: "BAD_REQUEST",
        message,
    });
}

export function unwrapResultOrThrow<T, E = Error>(
    result: ResultLike<T, E>,
    options?: {
        code?: TRPC_ERROR_CODE_KEY;
        message?: string;
    },
): T {
    if (result.success) {
        return result.data;
    }

    const fallbackMessage = options?.message ?? "Operation failed";
    const message = result.error instanceof Error ? result.error.message : fallbackMessage;

    throw new TRPCError({
        code: options?.code ?? "INTERNAL_SERVER_ERROR",
        message,
    });
}

export function requireEntity<T>(entity: T | null | undefined, message: string): T {
    if (!entity) {
        throw new TRPCError({ code: "NOT_FOUND", message });
    }

    return entity;
}
