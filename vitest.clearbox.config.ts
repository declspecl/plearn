import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        fileParallelism: false,
        include: [resolve(__dirname, "tests/clearbox/**/*.clearbox.test.ts")],
        exclude: ["**/node_modules/**", "**/dist/**"],
        testTimeout: 120000,
        hookTimeout: 120000,
    },
    resolve: {
        alias: {
            "@plearn/auth": resolve(__dirname, "./packages/auth/src"),
            "@plearn/composition": resolve(__dirname, "./packages/composition/src"),
            "@plearn/core": resolve(__dirname, "./packages/core/src"),
            "@plearn/db": resolve(__dirname, "./packages/db/src"),
            "@plearn/dependency": resolve(__dirname, "./packages/dependency/src"),
            "@plearn/trpc": resolve(__dirname, "./packages/trpc/src"),
            "@plearn/utils": resolve(__dirname, "./packages/utils/src"),
        },
    },
});
