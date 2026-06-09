import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    transpilePackages: ["@plearn/auth", "@plearn/core", "@plearn/db", "@plearn/dependency", "@plearn/trpc", "@plearn/utils"],
    // kuromoji loads its dictionary from disk at runtime (require.resolve("kuromoji/package.json")),
    // which breaks if Next bundles it. Keep it external so the dict path resolves in node_modules.
    serverExternalPackages: ["kuromoji"],
};

export default nextConfig;
