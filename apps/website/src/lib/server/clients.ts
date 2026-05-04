import { getAppConfig } from "./app-config";
import { VercelAiLearningAnalyzer, VercelAiLearningEmbedder } from "./learning-ai";
import { createAuth } from "@plearn/auth/server";
import {
    LearnableCatalogService,
    SemanticSearchService,
    SentenceAnalysisService,
    WorkspaceReviewService,
} from "@plearn/core/learning/service";
import { createDatabaseClient } from "@plearn/db/client";
import { LearningConverter } from "@plearn/dependency/postgres/learning/converter";
import { LearningFacade } from "@plearn/dependency/postgres/learning/facade";
import type { Services } from "@plearn/trpc/server";
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

let cachedServices: Services | undefined;

export function getServices(): Services {
    if (cachedServices) {
        return cachedServices;
    }

    const database = getDatabaseClient();
    const learningFacade = new LearningFacade(database, new LearningConverter());
    const embedder = new VercelAiLearningEmbedder();
    cachedServices = {
        learnableCatalogService: new LearnableCatalogService(learningFacade, learningFacade, learningFacade),
        semanticSearchService: new SemanticSearchService(learningFacade, embedder),
        sentenceAnalysisService: new SentenceAnalysisService(learningFacade, learningFacade, new VercelAiLearningAnalyzer()),
        workspaceReviewService: new WorkspaceReviewService(learningFacade, learningFacade, learningFacade, embedder),
    };
    return cachedServices;
}
