/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: "suggestion",
        docs: {
            description: "Prefer union types over multiple boolean flags for state",
            category: "Best Practices",
            recommended: false,
        },
        schema: [], // no options
        messages: {
            preferUnion:
                "Found {{count}} boolean flags ({{flags}}). Consider replacing them with a single union type (e.g. status: 'loading' | 'error' | 'success') to prevent impossible states.",
        },
    },
    create(context) {
        return {
            TSInterfaceDeclaration(node) {
                checkProperties(node.body.body);
            },
            TSTypeLiteral(node) {
                checkProperties(node.members);
            },
        };

        function checkProperties(properties) {
            const booleanFlags = [];

            for (const prop of properties) {
                if (
                    prop.type === "TSPropertySignature" &&
                    prop.key.type === "Identifier" &&
                    prop.typeAnnotation &&
                    prop.typeAnnotation.typeAnnotation.type === "TSBooleanKeyword"
                ) {
                    const name = prop.key.name;
                    // Check for common state flag prefixes
                    if (name.startsWith("is") || name.startsWith("has") || name.startsWith("can") || name.startsWith("should")) {
                        booleanFlags.push(name);
                    }
                }
            }

            // Heuristic: If we have 3 or more boolean flags, or specific combinations like loading/error
            if (booleanFlags.length >= 3) {
                context.report({
                    node: properties[0].parent, // Report on the interface/type node
                    messageId: "preferUnion",
                    data: {
                        count: booleanFlags.length,
                        flags: booleanFlags.join(", "),
                    },
                });
            } else if (booleanFlags.length === 2) {
                // Check for specific suspicious pairs
                const hasLoading = booleanFlags.some((f) => f.toLowerCase().includes("loading"));
                const hasError = booleanFlags.some((f) => f.toLowerCase().includes("error"));
                const hasSuccess = booleanFlags.some((f) => f.toLowerCase().includes("success"));

                if ((hasLoading && hasError) || (hasLoading && hasSuccess)) {
                    context.report({
                        node: properties[0].parent,
                        messageId: "preferUnion",
                        data: {
                            count: booleanFlags.length,
                            flags: booleanFlags.join(", "),
                        },
                    });
                }
            }
        }
    },
};
