import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: [resolve(__dirname, "tests/local/**/*.test.ts")],
        exclude: ["**/node_modules/**", "**/dist/**"],
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: "v8",
            include: ["packages/core/src/**", "packages/dependency/src/**", "packages/utils/src/**", "packages/trpc/src/server/trpc/**"],
            exclude: [
                "**/tests/**",
                "**/__tests__/**",
                "**/io/**",
                "**/index.ts",
                "packages/core/src/**/client.ts",
                "**/model/**",
                "**/repository.ts",
                "**/*-port.ts",
                "**/model.ts",
                "**/*-models.ts",
                "packages/core/src/shared/clock.ts",
                "packages/core/src/shared/logger.ts",
                "**/trpc/trpc.ts",
            ],
            reporter: ["text", "json", "html"],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
            },
        },
    },
    resolve: {
        alias: {
            "@plearn/auth": resolve(__dirname, "./packages/auth/src"),
            "@plearn/core": resolve(__dirname, "./packages/core/src"),
            "@plearn/db": resolve(__dirname, "./packages/db/src"),
            "@plearn/dependency": resolve(__dirname, "./packages/dependency/src"),
            "@plearn/trpc": resolve(__dirname, "./packages/trpc/src"),
            "@plearn/utils": resolve(__dirname, "./packages/utils/src"),
        },
    },
});
