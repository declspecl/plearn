import { createDatabaseClient } from "../db/src/client";
import { accounts, sessions, users, verifications } from "../db/src/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import urlJoin from "url-join";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/plearn_dev";
const webUrl = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
const serverUrl = new URL(process.env.BETTER_AUTH_SERVER_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
const apiPath = process.env.BETTER_AUTH_API_PATH ?? "/api";

const database = createDatabaseClient(databaseUrl);

export const auth = betterAuth({
    database: drizzleAdapter(database, {
        provider: "pg",
        schema: {
            users,
            sessions,
            accounts,
            verifications,
        },
        usePlural: true,
    }),
    experimental: {
        joins: true,
    },
    plugins: [openAPI()],
    baseURL: urlJoin(serverUrl.toString(), apiPath, "auth"),
    secret: process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-me",
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
    socialProviders:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                  google: {
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {},
});
