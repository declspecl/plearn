import { getAppConfig } from "./app-config";
import { ChatService } from "./chat/service";
import { VercelAiLearningAnalyzer, VercelAiLearningEmbedder } from "./learning-ai";
import { VercelAiCardGenerator, VercelAiAnswerGrader } from "./srs-ai";
import { TransitService } from "./transit/service";
import { createAuth } from "@plearn/auth/server";
import {
    LearnableCatalogService,
    SemanticSearchService,
    SentenceAnalysisService,
    WorkspaceReviewService,
} from "@plearn/core/learning/service";
import { Sm2Scheduler } from "@plearn/core/srs/algorithm";
import { ReviewSessionService, PracticeService } from "@plearn/core/srs/service";
import { createDatabaseClient } from "@plearn/db/client";
import { LearningConverter } from "@plearn/dependency/postgres/learning/converter";
import { LearningFacade } from "@plearn/dependency/postgres/learning/facade";
import { SrsConverter } from "@plearn/dependency/postgres/srs/converter";
import { SrsFacade } from "@plearn/dependency/postgres/srs/facade";
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
let cachedChatService: ChatService | undefined;
let cachedTransitService: TransitService | undefined;
let cachedLearningEmbedder: VercelAiLearningEmbedder | undefined;

function getLearningEmbedder() {
    if (cachedLearningEmbedder) {
        return cachedLearningEmbedder;
    }

    cachedLearningEmbedder = new VercelAiLearningEmbedder();

    return cachedLearningEmbedder;
}

export function getServices(): Services {
    if (cachedServices) {
        return cachedServices;
    }

    const database = getDatabaseClient();
    const learningFacade = new LearningFacade(database, new LearningConverter());
    const embedder = getLearningEmbedder();

    const srsFacade = new SrsFacade(database, new SrsConverter());
    const scheduler = new Sm2Scheduler();
    const cardGenerator = new VercelAiCardGenerator();
    const answerGrader = new VercelAiAnswerGrader();

    cachedServices = {
        learnableCatalogService: new LearnableCatalogService(learningFacade, learningFacade, learningFacade),
        semanticSearchService: new SemanticSearchService(learningFacade, embedder),
        sentenceAnalysisService: new SentenceAnalysisService(learningFacade, learningFacade, new VercelAiLearningAnalyzer()),
        workspaceReviewService: new WorkspaceReviewService(learningFacade, learningFacade, learningFacade, embedder),
        reviewSessionService: new ReviewSessionService(srsFacade, srsFacade, learningFacade, scheduler, cardGenerator, answerGrader),
        practiceService: new PracticeService(srsFacade, srsFacade, learningFacade, cardGenerator, answerGrader),
    };

    return cachedServices;
}

export function getLearningChatService(): ChatService {
    if (cachedChatService) {
        return cachedChatService;
    }

    cachedChatService = new ChatService(getDatabaseClient(), getServices(), getLearningEmbedder());

    return cachedChatService;
}

export function getTransitService(): TransitService {
    if (cachedTransitService) {
        return cachedTransitService;
    }

    cachedTransitService = new TransitService(getDatabaseClient());

    return cachedTransitService;
}
