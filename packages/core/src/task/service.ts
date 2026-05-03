import type { Task, TaskId, TaskInput } from "./model";
import type { TaskRepository } from "./repository";

export class TaskService {
    private readonly taskRepository: TaskRepository;

    public constructor(taskRepository: TaskRepository) {
        this.taskRepository = taskRepository;
    }

    public async createTask(input: TaskInput): Promise<Task> {
        return this.taskRepository.create(input);
    }

    public async getTask(id: TaskId): Promise<Task | undefined> {
        return this.taskRepository.findById(id);
    }

    public async listTasks(): Promise<readonly Task[]> {
        return this.taskRepository.listAll();
    }

    public async updateTask(id: TaskId, updates: Partial<TaskInput>): Promise<Task> {
        return this.taskRepository.update(id, updates);
    }

    public async deleteTask(id: TaskId): Promise<void> {
        return this.taskRepository.delete(id);
    }
}
