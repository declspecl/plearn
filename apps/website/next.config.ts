import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    transpilePackages: ["@plearn/auth", "@plearn/core", "@plearn/db", "@plearn/dependency", "@plearn/trpc", "@plearn/utils"],
};

export default nextConfig;
