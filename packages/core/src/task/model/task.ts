import type { EntityId } from "../../shared/model/id";

export type TaskId = EntityId<"Task">;

export function createTaskId(id: string): TaskId {
    return id as TaskId;
}

export interface Task {
    readonly id: TaskId;
    readonly title: string;
    readonly completed: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface TaskInput {
    readonly title: string;
    readonly completed?: boolean;
}
