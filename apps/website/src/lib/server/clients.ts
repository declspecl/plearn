import { getAppConfig } from "./app-config";
import { createAuth } from "@plearn/auth/server";
import { TaskService } from "@plearn/core/task/service";
import { createDatabaseClient } from "@plearn/db/client";
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
        apiPath: "/api/auth",
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

    return {
        taskService: new TaskService(new TaskFacade(database, new TaskConverter())),
    };
}
