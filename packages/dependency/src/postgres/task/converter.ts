import { createTaskId } from "@plearn/core/task/model";
import type { Task } from "@plearn/core/task/model";
import type { tasks } from "@plearn/db/schema";

type TaskRow = typeof tasks.$inferSelect;

export class TaskConverter {
    public convertToDomain(row: TaskRow): Task {
        return {
            id: createTaskId(row.id),
            title: row.title,
            completed: row.completed,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}
