import preferUnionStatus from "./rules/prefer-union-status.js";
import jseslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import turboPlugin from "eslint-plugin-turbo";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.ConfigWithExtendsArray} */
export const options = [
    jseslint.configs.recommended,
    tseslint.configs.recommended,
    eslintPluginUnicorn.configs.recommended,
    pluginReact.configs.flat.recommended,
    globalIgnores([".husky", ".next", "out/**", "build/**", "node_modules", ".env*", "next-env.d.ts", "pnpm-*"]),
    {
        plugins: {
            local: {
                rules: {
                    "prefer-union-status": preferUnionStatus,
                },
            },
        },
        rules: {
            // Naming & Clarity
            "unicorn/prevent-abbreviations": "warn", // Enforce explicit names
            "unicorn/no-null": "off",
            "unicorn/no-array-reduce": "off", // Allow .reduce (declarative)
            "unicorn/no-abusive-eslint-disable": "off",
            "unicorn/no-useless-undefined": "off",
            "unicorn/prevent-abbreviations": "off",
            "unicorn/no-for-loop": "error", // Prefer for-of over for
            "local/prefer-union-status": "warn", // Custom rule: Prefer union types over boolean flags

            // Type Safety
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "error", // Ban 'any'
            "@typescript-eslint/consistent-type-imports": "error",

            // Control Flow & Style
            curly: ["error", "all"], // Always brackets
            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "*", next: "return" }, // Newline before return
            ],
            "no-restricted-syntax": [
                "error",
                {
                    selector: "ForStatement",
                    message: "Prefer declarative array methods (map, filter, reduce) or for-of loops over imperative for loops.",
                },
                {
                    selector: "ForInStatement",
                    message: "Prefer declarative methods or for-of loops over for-in loops.",
                },
                {
                    selector: "TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
                    message: "Do not use 'as unknown'. Fix the types strictly.",
                },
                {
                    selector: "TSAsExpression > TSAsExpression",
                    message: "Do not use double assertions (e.g. 'as unknown as Type'). Fix the types strictly.",
                },
            ],
            // Architecture: No Barrel Files (Global)
            "no-restricted-imports": [
                "warn",
                {
                    paths: [
                        {
                            name: "@plearn/core",
                            message:
                                "Do not import from the package root (barrel file). Use direct deep imports (e.g. @plearn/core/user/model).",
                        },
                        {
                            name: "@plearn/db",
                            message: "Do not import from the package root (barrel file). Use direct deep imports (e.g. @plearn/db/client).",
                        },
                        {
                            name: "@plearn/trpc",
                            message: "Do not import from the package root (barrel file). Use direct deep imports.",
                        },
                        {
                            name: "@plearn/auth",
                            message: "Do not import from the package root (barrel file). Use direct deep imports.",
                        },
                        {
                            name: "@plearn/dependency",
                            message: "Do not import from the package root (barrel file). Use direct deep imports.",
                        },
                        {
                            name: "@plearn/utils",
                            message: "Do not import from the package root (barrel file). Use direct deep imports.",
                        },
                    ],
                },
            ],
        },
    },
    {
        plugins: {
            turbo: turboPlugin,
        },
        rules: {
            "turbo/no-undeclared-env-vars": "warn",
        },
    },
    {
        languageOptions: {
            ...pluginReact.configs.flat.recommended.languageOptions,
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
    },
    {
        plugins: {
            "react-hooks": pluginReactHooks,
        },
        settings: { react: { version: "detect" } },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
        },
    },
    {
        ignores: ["dist/**"],
    },
    eslintConfigPrettier,
];

/** @type {import("eslint").Linter.Config} */
export default defineConfig(options);
