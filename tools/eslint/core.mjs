import { options as baseOptions } from "./base.mjs";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.ConfigWithExtendsArray} */
export const options = tseslint.config(
    ...baseOptions,
    // Strict Core Rules
    {
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "zod",
                            message: "Do not use Zod in core. Use pure TypeScript interfaces for models and ValidationResult pattern.",
                        },
                        {
                            name: "react",
                            message: "Core must be framework-agnostic. UI logic belongs in apps or trpc clients.",
                        },
                        {
                            name: "next",
                            message: "Core must be framework-agnostic.",
                        },
                        // Re-iterate the global rule to ensure it merges correctly
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
                    patterns: [
                        {
                            group: ["@plearn/db*", "@plearn/trpc*", "@plearn/auth*", "@plearn/dependency*"],
                            message:
                                "Core must not depend on infrastructure layers (db, trpc, auth, dependency). Dependencies point inwards.",
                        },
                    ],
                },
            ],
        },
    },
);

export default options;
