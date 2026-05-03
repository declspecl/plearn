import type { Task, TaskId, TaskInput } from "./model";

export interface TaskRepository {
    create(task: TaskInput): Promise<Task>;
    findById(id: TaskId): Promise<Task | undefined>;
    listAll(): Promise<readonly Task[]>;
    update(id: TaskId, updates: Partial<TaskInput>): Promise<Task>;
    delete(id: TaskId): Promise<void>;
}
