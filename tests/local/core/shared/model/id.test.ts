import { createEntityId } from "@plearn/core/shared/model/id";
import { createTaskId } from "@plearn/core/task/model";
import { describe, expect, it } from "vitest";

describe("EntityId", () => {
    it("creates a branded ID", () => {
        const id = createTaskId("123");
        expect(id).toBe("123");
    });

    it("throws on empty ID", () => {
        expect(() => createEntityId<"Task">("")).toThrow("Entity ID cannot be empty");
    });

    it("trims whitespace", () => {
        const id = createEntityId<"Task">("  123  ");
        expect(id).toBe("123");
    });
});
