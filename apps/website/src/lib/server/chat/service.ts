import { ChatRepository } from "@/lib/server/chat/persistence/repository";
import { ChatRunService } from "@/lib/server/chat/run-service";
import { ChatThreadService } from "@/lib/server/chat/thread-service";
import type { LearningEmbedder } from "@plearn/core/learning/repository";
import type { DatabaseInstance } from "@plearn/db/client";
import type { Services } from "@plearn/trpc/server";
import "server-only";

export class ChatService {
    private readonly repository: ChatRepository;
    private readonly threadService: ChatThreadService;
    private readonly runService: ChatRunService;

    public constructor(database: DatabaseInstance, services: Services, embedder: LearningEmbedder) {
        this.repository = new ChatRepository(database);
        this.threadService = new ChatThreadService(this.repository);
        this.runService = new ChatRunService(this.repository, services, embedder);
    }

    public createThread(userId: string, languageCode = "vi") {
        return this.threadService.createThread(userId, languageCode);
    }

    public listThreads(userId: string) {
        return this.threadService.listThreads(userId);
    }

    public getThreadDetail(userId: string, threadId: string, options?: { before?: string | null; limit?: number }) {
        return this.threadService.getThreadDetail(userId, threadId, options);
    }

    public renameThread(userId: string, threadId: string, title: string) {
        return this.threadService.renameThread(userId, threadId, title);
    }

    public deleteThread(userId: string, threadId: string) {
        return this.threadService.deleteThread(userId, threadId);
    }

    public runTurn(input: {
        userId: string;
        threadId: string;
        message?: string;
        retryMessageId?: string;
        clientTurnId?: string;
        requestSignal?: AbortSignal;
    }) {
        return this.runService.runTurn(input);
    }
}
