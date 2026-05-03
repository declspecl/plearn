/** @type {import("eslint").Linter.Config} */
import baseConfig from "@plearn/eslint/base";

export default [
    ...baseConfig,
    {
        ignores: ["layers/**", "cdk.out/**", "dist/**"],
    },
];
