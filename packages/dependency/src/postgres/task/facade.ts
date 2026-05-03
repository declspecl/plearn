import type { TaskConverter } from "./converter";
import type { Task, TaskId, TaskInput } from "@plearn/core/task/model";
import type { TaskRepository } from "@plearn/core/task/repository";
import type { DatabaseInstance } from "@plearn/db/client";
import { tasks } from "@plearn/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export class TaskFacade implements TaskRepository {
    private readonly converter: TaskConverter;
    private readonly database: DatabaseInstance;

    public constructor(database: DatabaseInstance, converter: TaskConverter) {
        this.converter = converter;
        this.database = database;
    }

    public async create(input: TaskInput): Promise<Task> {
        const [row] = await this.database
            .insert(tasks)
            .values({
                id: randomUUID(),
                title: input.title,
                completed: input.completed ?? false,
            })
            .returning();

        if (!row) {
            throw new Error("Task insert returned no row");
        }

        return this.converter.convertToDomain(row);
    }

    public async findById(id: TaskId): Promise<Task | undefined> {
        const [row] = await this.database.select().from(tasks).where(eq(tasks.id, id)).limit(1);

        if (!row) {
            return undefined;
        }

        return this.converter.convertToDomain(row);
    }

    public async listAll(): Promise<readonly Task[]> {
        const rows = await this.database.select().from(tasks);

        return rows.map((row) => this.converter.convertToDomain(row));
    }

    public async update(id: TaskId, updates: Partial<TaskInput>): Promise<Task> {
        const [row] = await this.database
            .update(tasks)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(tasks.id, id))
            .returning();

        if (!row) {
            throw new Error(`Task not found: ${id}`);
        }

        return this.converter.convertToDomain(row);
    }

    public async delete(id: TaskId): Promise<void> {
        await this.database.delete(tasks).where(eq(tasks.id, id));
    }
}
