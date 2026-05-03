/**
 * Result type for error handling without exceptions
 */

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export async function tryCatch<T>(function_: () => Promise<T>): Promise<Result<T, Error>> {
    try {
        const data = await function_();

        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}

export function tryCatchSync<T>(function_: () => T): Result<T, Error> {
    try {
        const data = function_();

        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}
