import { describe, expect, it } from "vitest";

const rawBaseUrl = process.env.VITE_BASE_URL ?? process.env.BASE_URL;
const baseUrl = rawBaseUrl && /^https?:\/\//.test(rawBaseUrl) ? rawBaseUrl.replace(/\/$/, "") : null;
const testWithEndpoint = baseUrl ? it : it.skip;

describe("smoke", () => {
    testWithEndpoint("health check responds", async () => {
        const response = await fetch(`${baseUrl}/api/health`);

        expect(response.ok).toBe(true);
    });
});
