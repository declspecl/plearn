import { createPostgresFacades, resetDatabase } from "./test-database";
import { beforeEach, describe, expect, it } from "vitest";

describe("TaskFacade", () => {
    beforeEach(async () => {
        await resetDatabase();
    });

    it("creates and finds a task", async () => {
        const { taskRepository } = createPostgresFacades();

        const created = await taskRepository.create({
            title: "Integration Test Task",
        });

        const found = await taskRepository.findById(created.id);

        expect(found).toMatchObject({
            id: created.id,
            title: "Integration Test Task",
            completed: false,
        });
    });

    it("updates a task", async () => {
        const { taskRepository } = createPostgresFacades();

        const created = await taskRepository.create({
            title: "Task to update",
        });

        const updated = await taskRepository.update(created.id, {
            completed: true,
        });

        expect(updated.completed).toBe(true);
    });

    it("deletes a task", async () => {
        const { taskRepository } = createPostgresFacades();

        const created = await taskRepository.create({
            title: "Task to delete",
        });

        await taskRepository.delete(created.id);

        const found = await taskRepository.findById(created.id);
        expect(found).toBeUndefined();
    });
});
