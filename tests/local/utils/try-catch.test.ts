import { tryCatch, tryCatchSync } from "@plearn/utils/try-catch";
import { describe, expect, it } from "vitest";

describe("tryCatch", () => {
    it("returns success for successful async operation", async () => {
        const result = await tryCatch(async () => 42);

        expect(result).toEqual({ success: true, data: 42 });
    });

    it("returns error for failed async operation with Error", async () => {
        const error = new Error("Test error");
        const result = await tryCatch(async () => {
            throw error;
        });

        expect(result).toEqual({ success: false, error });
    });

    it("wraps non-Error thrown values in Error", async () => {
        const result = await tryCatch(async () => {
            throw "string error";
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe("string error");
        }
    });

    it("handles rejected promises", async () => {
        const result = await tryCatch(() => Promise.reject(new Error("Rejected")));

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.message).toBe("Rejected");
        }
    });
});

describe("tryCatchSync", () => {
    it("returns success for successful sync operation", () => {
        const result = tryCatchSync(() => 42);

        expect(result).toEqual({ success: true, data: 42 });
    });

    it("returns error for failed sync operation with Error", () => {
        const error = new Error("Test error");
        const result = tryCatchSync(() => {
            throw error;
        });

        expect(result).toEqual({ success: false, error });
    });

    it("wraps non-Error thrown values in Error", () => {
        const result = tryCatchSync(() => {
            throw "string error";
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe("string error");
        }
    });

    it("handles null thrown values", () => {
        const result = tryCatchSync(() => {
            throw null;
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe("null");
        }
    });

    it("handles undefined thrown values", () => {
        const result = tryCatchSync(() => {
            throw undefined;
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toBe("undefined");
        }
    });
});
