import { getAppConfig } from "./app-config";
import { VercelAiLearningAnalyzer, VercelAiLearningEmbedder } from "./learning-ai";
import { createAuth } from "@plearn/auth/server";
import {
    LearnableCatalogService,
    SemanticSearchService,
    SentenceAnalysisService,
    WorkspaceReviewService,
} from "@plearn/core/learning/service";
import { TaskService } from "@plearn/core/task/service";
import { createDatabaseClient } from "@plearn/db/client";
import { LearningConverter } from "@plearn/dependency/postgres/learning/converter";
import { LearningFacade } from "@plearn/dependency/postgres/learning/facade";
import { TaskConverter } from "@plearn/dependency/postgres/task/converter";
import { TaskFacade } from "@plearn/dependency/postgres/task/facade";
import "server-only";

let cachedDatabaseClient: ReturnType<typeof createDatabaseClient> | undefined;

export function getDatabaseClient() {
    if (cachedDatabaseClient) {
        return cachedDatabaseClient;
    }

    const appConfig = getAppConfig();

    cachedDatabaseClient = createDatabaseClient(appConfig.DATABASE_URL);

    return cachedDatabaseClient;
}

let cachedAuthClient: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
    if (cachedAuthClient) {
        return cachedAuthClient;
    }

    const appConfig = getAppConfig();
    const webUrl = new URL(appConfig.BETTER_AUTH_URL);

    cachedAuthClient = createAuth({
        webUrl,
        serverUrl: webUrl,
        apiPath: "/api",
        authSecret: appConfig.BETTER_AUTH_SECRET,
        db: getDatabaseClient(),
        googleClientId: appConfig.GOOGLE_CLIENT_ID,
        googleClientSecret: appConfig.GOOGLE_CLIENT_SECRET,
    });

    return cachedAuthClient;
}

export function getRepositories() {
    return {};
}

export function getServices() {
    const database = getDatabaseClient();
    const learningFacade = new LearningFacade(database, new LearningConverter());
    const embedder = new VercelAiLearningEmbedder();

    return {
        learnableCatalogService: new LearnableCatalogService(learningFacade, learningFacade, learningFacade),
        semanticSearchService: new SemanticSearchService(learningFacade, embedder),
        sentenceAnalysisService: new SentenceAnalysisService(learningFacade, learningFacade, new VercelAiLearningAnalyzer()),
        taskService: new TaskService(new TaskFacade(database, new TaskConverter())),
        workspaceReviewService: new WorkspaceReviewService(learningFacade, learningFacade, learningFacade, learningFacade, embedder),
    };
}
