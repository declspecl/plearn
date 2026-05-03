import { requireEntity, throwBadRequestFromValidation, unwrapResultOrThrow } from "@plearn/trpc/server";
import { describe, expect, it } from "vitest";

describe("error-mapper", () => {
    it("returns without throwing for valid validation results", () => {
        expect(() =>
            throwBadRequestFromValidation({
                valid: true,
                errors: [],
            }),
        ).not.toThrow();
    });

    it("throws BAD_REQUEST for invalid validation results", () => {
        expect(() =>
            throwBadRequestFromValidation({
                valid: false,
                errors: [{ message: "Title is required" }],
            }),
        ).toThrow("Title is required");
    });

    it("falls back to a generic message when validation errors are empty", () => {
        expect(() =>
            throwBadRequestFromValidation({
                valid: false,
                errors: [],
            }),
        ).toThrow("Invalid input");
    });

    it("returns unwrapped result data when success is true", () => {
        const value = unwrapResultOrThrow({
            success: true,
            data: "ok",
        });

        expect(value).toBe("ok");
    });

    it("uses the fallback message for non-Error failures", () => {
        expect(() =>
            unwrapResultOrThrow(
                {
                    success: false,
                    error: "bad-result",
                },
                {
                    code: "BAD_REQUEST",
                    message: "Fallback message",
                },
            ),
        ).toThrow("Fallback message");
    });

    it("uses the original error message and default code for Error failures", () => {
        expect(() =>
            unwrapResultOrThrow({
                success: false,
                error: new Error("Boom"),
            }),
        ).toThrow("Boom");
    });

    it("throws when entity is null", () => {
        expect(() => requireEntity(null, "Not found")).toThrow("Not found");
    });

    it("returns the entity when present", () => {
        const entity = { id: "post-1" };

        expect(requireEntity(entity, "Not found")).toBe(entity);
    });
});
