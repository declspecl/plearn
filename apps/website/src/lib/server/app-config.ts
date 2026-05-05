import "server-only";
import { z } from "zod";

const schema = z.object({
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().nonempty(),
    BETTER_AUTH_URL: z.url(),
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    LEARNING_ANALYSIS_PROVIDER: z.string(),
    LEARNING_ANALYSIS_MODEL: z.string(),
    LEARNING_ANALYSIS_MAX_RETRIES: z.coerce.number().int().min(0).default(0),
    LEARNING_ANALYSIS_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    LEARNING_ANALYSIS_THINKING_MODE: z.enum(["enabled", "disabled", "inherit"]).default("disabled"),
    LEARNING_ANALYSIS_STREAM_PROBE: z.enum(["off", "before"]).default("off"),
    LEARNING_EMBEDDING_PROVIDER: z.string(),
    LEARNING_EMBEDDING_MODEL: z.string(),
    PLEARN_OWNER_EMAIL: z.email(),
    PLEARN_OWNER_NAME: z.string(),
    PLEARN_OWNER_PASSWORD: z.string().min(8),
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
        NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        LEARNING_ANALYSIS_PROVIDER: process.env.LEARNING_ANALYSIS_PROVIDER,
        LEARNING_ANALYSIS_MODEL: process.env.LEARNING_ANALYSIS_MODEL,
        LEARNING_ANALYSIS_MAX_RETRIES: process.env.LEARNING_ANALYSIS_MAX_RETRIES,
        LEARNING_ANALYSIS_TIMEOUT_MS: process.env.LEARNING_ANALYSIS_TIMEOUT_MS,
        LEARNING_ANALYSIS_THINKING_MODE: process.env.LEARNING_ANALYSIS_THINKING_MODE,
        LEARNING_ANALYSIS_STREAM_PROBE: process.env.LEARNING_ANALYSIS_STREAM_PROBE,
        LEARNING_EMBEDDING_PROVIDER: process.env.LEARNING_EMBEDDING_PROVIDER,
        LEARNING_EMBEDDING_MODEL: process.env.LEARNING_EMBEDDING_MODEL,
        PLEARN_OWNER_EMAIL: process.env.PLEARN_OWNER_EMAIL,
        PLEARN_OWNER_NAME: process.env.PLEARN_OWNER_NAME,
        PLEARN_OWNER_PASSWORD: process.env.PLEARN_OWNER_PASSWORD,
    });

    return cachedAppConfig;
}
