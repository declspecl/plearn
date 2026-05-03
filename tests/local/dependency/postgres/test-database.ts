import { createDatabaseClient } from "@plearn/db/client";
import type { DatabaseInstance } from "@plearn/db/client";
import { tasks } from "@plearn/db/schema";
import { TaskConverter } from "@plearn/dependency/postgres/task/converter";
import { TaskFacade } from "@plearn/dependency/postgres/task/facade";

export const testDatabaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/plearn_test";

export const testDatabase = createDatabaseClient(testDatabaseUrl);

const taskConverter = new TaskConverter();

export async function resetDatabase(database: DatabaseInstance = testDatabase): Promise<void> {
    await database.delete(tasks);
}

export function createPostgresFacades(database: DatabaseInstance = testDatabase) {
    return {
        taskRepository: new TaskFacade(database, taskConverter),
    };
}
