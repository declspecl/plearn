import "client-only";
import { z } from "zod";

const schema = z.object({
    BETTER_AUTH_URL: z.url(),
});

export type AppConfig = z.infer<typeof schema>;

let cachedAppConfig: AppConfig | undefined;

export function getAppConfig(): AppConfig {
    if (cachedAppConfig) {
        return cachedAppConfig;
    }

    cachedAppConfig = schema.parse({
        BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    });

    return cachedAppConfig;
}
