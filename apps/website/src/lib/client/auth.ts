import { getAppConfig } from "./app-config";
import { createAuthClient } from "@plearn/auth/client";
import "client-only";

let cachedAuthClient: ReturnType<typeof createAuthClient> | undefined;

export function getAuthClient() {
    const appConfig = getAppConfig();

    cachedAuthClient ??= createAuthClient({
        baseURL: appConfig.BETTER_AUTH_URL,
    });

    return cachedAuthClient;
}
