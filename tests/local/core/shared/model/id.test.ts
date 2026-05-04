import { createEntityId } from "@plearn/core/shared/model/id";
import { describe, expect, it } from "vitest";

describe("EntityId", () => {
    it("creates a branded ID", () => {
        const id = createEntityId<"User">("123");
        expect(id).toBe("123");
    });

    it("throws on empty ID", () => {
        expect(() => createEntityId<"User">("")).toThrow("Entity ID cannot be empty");
    });

    it("trims whitespace", () => {
        const id = createEntityId<"User">("  123  ");
        expect(id).toBe("123");
    });
});
