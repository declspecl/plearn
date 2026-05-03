import "server-only";
import { z } from "zod";

const schema = z.object({
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().nonempty(),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().nonempty(),
    GOOGLE_CLIENT_SECRET: z.string().nonempty(),
});

export type AppConfig = z.infer<typeof schema>;

let cachedAppConfig: AppConfig | undefined;

export function getAppConfig(): AppConfig {
    if (cachedAppConfig) {
        return cachedAppConfig;
    }

    cachedAppConfig = schema.parse({
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    });

    return cachedAppConfig;
}
