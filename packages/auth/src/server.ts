import type { DatabaseInstance } from "@plearn/db/client";
import { accounts, sessions, users, verifications } from "@plearn/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import urlJoin from "url-join";

export interface AuthOptions {
    webUrl: URL;
    serverUrl: URL;
    apiPath: `/${string}`;
    authSecret: string;
    db: DatabaseInstance;
    googleClientId: string;
    googleClientSecret: string;
}

export type AuthInstance = ReturnType<typeof createAuth>;

const authSchema = {
    users,
    sessions,
    accounts,
    verifications,
};

export function createAuth(options: AuthOptions) {
    const { webUrl, serverUrl, apiPath, authSecret, db, googleClientId, googleClientSecret } = options;

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: authSchema,
            usePlural: true,
        }),
        experimental: {
            joins: true,
        },
        plugins: [openAPI()],
        baseURL: urlJoin(serverUrl.toString(), apiPath, "auth"),
        secret: authSecret,
        trustedOrigins: [webUrl.origin],
        session: {
            deferSessionRefresh: true,
            cookieCache: {
                enabled: true,
                maxAge: 10 * 60,
            },
        },
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
            requireEmailVerification: false,
        },
        socialProviders: {
            google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            },
        },
    });
}

export { toNextJsHandler } from "better-auth/next-js";
