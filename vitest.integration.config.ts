import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        fileParallelism: false,
        include: [resolve(__dirname, "tests/integration/**/*.test.ts")],
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
