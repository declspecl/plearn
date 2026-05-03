import type { Task } from "@plearn/core/task/model";
import { createTaskId } from "@plearn/core/task/model";
import type { TaskRepository } from "@plearn/core/task/repository";
import { TaskService } from "@plearn/core/task/service";
import { describe, expect, it } from "vitest";

describe("TaskService", () => {
    it("delegates listAll to the repository", async () => {
        const fixedDate = new Date();
        const fakeTasks: readonly Task[] = [
            {
                id: createTaskId("1"),
                title: "Test Task",
                completed: false,
                createdAt: fixedDate,
                updatedAt: fixedDate,
            },
        ];
        const taskRepository: TaskRepository = {
            async create() {
                throw new Error("not implemented");
            },
            async findById() {
                return undefined;
            },
            async listAll() {
                return fakeTasks;
            },
            async update() {
                throw new Error("not implemented");
            },
            async delete() {
                throw new Error("not implemented");
            },
        };
        const service = new TaskService(taskRepository);

        const tasks = await service.listTasks();

        expect(tasks).toHaveLength(1);
        expect(tasks[0]?.title).toBe("Test Task");
    });
});
