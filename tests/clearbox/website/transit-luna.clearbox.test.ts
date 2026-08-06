import { OFFICIAL_RAIL_DOMAINS } from "../../../apps/website/src/lib/server/transit/constants";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { describe, expect, it } from "vitest";

const runTransitClearbox = process.env.RUN_TRANSIT_CLEARBOX === "true" && Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!runTransitClearbox)("GPT-5.6 Luna transit web search", () => {
    it("uses native web search and returns an official JR or SmartEX source", async () => {
        const result = await generateText({
            model: openai.responses(process.env.TRANSIT_ASSISTANT_MODEL ?? "gpt-5.6-luna"),
            system: "Use only official Japanese railway sources. Never describe timetable data as live status.",
            prompt: "Find the official SmartEX guidance about what a traveler should verify when a booked train is delayed. Answer in one sentence.",
            tools: {
                officialWebSearch: openai.tools.webSearch({
                    externalWebAccess: true,
                    searchContextSize: "high",
                    userLocation: { type: "approximate", country: "JP", timezone: "Asia/Tokyo" },
                    filters: { allowedDomains: [...OFFICIAL_RAIL_DOMAINS] },
                }),
            },
            stopWhen: stepCountIs(5),
            providerOptions: { openai: { reasoningEffort: "medium", store: false, maxToolCalls: 5 } },
        });

        expect(result.text.length).toBeGreaterThan(0);
        expect(
            result.sources.some(
                (source) =>
                    source.sourceType === "url" && OFFICIAL_RAIL_DOMAINS.some((domain) => new URL(source.url).hostname.endsWith(domain)),
            ),
        ).toBe(true);
    });
});
