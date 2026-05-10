import { getAppConfig } from "./app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { Learnable } from "@plearn/core/learning/model";
import type { SrsAnswerGrader, SrsAnswerGraderInput, SrsCardGenerator, SrsCardGeneratorInput, SrsCardType } from "@plearn/core/srs";
import { srsGrades } from "@plearn/core/srs/model";
import { generateObject } from "ai";
import "server-only";
import { z } from "zod";

function getSrsModel() {
    const appConfig = getAppConfig();

    switch (appConfig.LEARNING_ANALYSIS_PROVIDER) {
        case "deepseek": {
            return deepseek(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        case "openai": {
            return openai(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        default: {
            throw new Error(`Unsupported SRS analysis provider: ${appConfig.LEARNING_ANALYSIS_PROVIDER}`);
        }
    }
}

function getSrsProviderOptions() {
    const appConfig = getAppConfig();

    if (appConfig.LEARNING_ANALYSIS_PROVIDER !== "deepseek" || appConfig.LEARNING_ANALYSIS_THINKING_MODE === "inherit") {
        return undefined;
    }

    return {
        deepseek: {
            thinking: {
                type: appConfig.LEARNING_ANALYSIS_THINKING_MODE,
            },
        },
    };
}

function createSrsAbortSignal() {
    const appConfig = getAppConfig();

    if (!appConfig.LEARNING_ANALYSIS_TIMEOUT_MS) {
        return undefined;
    }

    return AbortSignal.timeout(appConfig.LEARNING_ANALYSIS_TIMEOUT_MS);
}

function formatLearnableContext(learnable: Learnable): string {
    const parts = [`Vietnamese: ${learnable.canonicalText}`, `Type: ${learnable.type}`, `Meaning: ${learnable.translation}`];
    if (learnable.usageNotes) parts.push(`Usage notes: ${learnable.usageNotes}`);
    if (learnable.patternTemplate) parts.push(`Pattern: ${learnable.patternTemplate}`);
    if (learnable.partOfSpeech) parts.push(`Part of speech: ${learnable.partOfSpeech}`);
    if (learnable.aliases.length > 0) parts.push(`Aliases: ${learnable.aliases.join(", ")}`);
    if (learnable.examples.length > 0) {
        const exs = learnable.examples
            .slice(0, 3)
            .map((e) => `  - ${e.exampleText} (${e.translation})`)
            .join("\n");
        parts.push(`Examples:\n${exs}`);
    }
    return parts.join("\n");
}

function formatLearnableList(learnables: readonly Learnable[]): string {
    return learnables.map((l, i) => `[Item ${i + 1}]\n${formatLearnableContext(l)}`).join("\n\n");
}

function formatKnownLearnableInventory(learnables: readonly Learnable[]): string {
    if (learnables.length === 0) {
        return "No supporting learnables are available. Build the card around the target item only.";
    }

    const grouped = new Map<string, Learnable[]>();
    for (const learnable of learnables) {
        const current = grouped.get(learnable.type) ?? [];
        current.push(learnable);
        grouped.set(learnable.type, current);
    }

    return [...grouped.entries()]
        .map(([type, items]) => {
            const rows = items.map((learnable) => {
                const details = [
                    learnable.translation,
                    learnable.patternTemplate && learnable.patternTemplate !== learnable.canonicalText
                        ? `pattern: ${learnable.patternTemplate}`
                        : undefined,
                    learnable.partOfSpeech ? `pos: ${learnable.partOfSpeech}` : undefined,
                    learnable.aliases.length > 0 ? `aliases: ${learnable.aliases.join(", ")}` : undefined,
                ].filter(Boolean);

                return `- ${learnable.canonicalText}: ${details.join("; ")}`;
            });

            return `${type}:\n${rows.join("\n")}`;
        })
        .join("\n\n");
}

const CARD_TYPE_LABELS: Record<SrsCardType, string> = {
    use_in_sentence: "Use It in a Sentence",
    whats_wrong: "What's Wrong Here?",
    pick_right_one: "Pick the Right One",
    shift_register: "Shift the Register",
    complete_thought: "Complete the Thought",
    what_does_this_mean: "What Does This Actually Mean?",
    how_would_you_say: "How Would You Say This?",
};

const cardPromptOptionSchema = z.object({
    label: z.string().describe("A short option label, such as A, B, C, or D"),
    text: z.string().describe("The option text shown to the learner"),
});

const cardPromptSchema = z.object({
    instruction: z.string().describe("The direct task or question shown to the learner"),
    context: z.string().optional().describe("Optional social or situational context"),
    stimulus: z.string().optional().describe("Optional Vietnamese sentence, sentence start, source sentence, or English meaning"),
    stimulusLabel: z.string().optional().describe("Optional short label for the stimulus, such as Sentence, Source, or Meaning"),
    hint: z.string().optional().describe("Optional learner-facing hint that does not reveal the tested target item"),
    options: z.array(cardPromptOptionSchema).optional().describe("Multiple choice options, if applicable"),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

function buildCardGenerationPrompt(input: SrsCardGeneratorInput): string {
    const targetContext = formatLearnableList(input.targetLearnables);
    const knownInventory = formatKnownLearnableInventory(input.bundledLearnables ?? []);

    const base = `You are a Vietnamese language tutor creating a review card for a learner studying Southern Vietnamese.

Target item(s) to test:
${targetContext}

Complete known catalog the learner may use:
${knownInventory}

Card type: ${CARD_TYPE_LABELS[input.cardType]}

Hard constraint:
- Treat the known catalog as the learner's entire current usable inventory.
- This is a "given everything the learner has learned, what can they do with it?" card.
- Do not require Vietnamese vocabulary, phrases, grammar patterns, or cultural/register knowledge that is not in the target item(s) or complete known catalog.
- The expected answer must be constructible from the target item(s), the complete known catalog, and only unavoidable ultra-basic function words.
- Do not introduce new required ideas such as jobs, hobbies, locations, people, adverbs, or objects unless the exact Vietnamese item is listed above.
- Keep the English scenario semantically narrow. It may give social context, but the actual content the learner must produce should only combine listed learnables.
- If the listed learnables are not enough for a rich prompt, make a shorter simpler card instead of inventing unknown vocabulary.
- The answer should not require every known item. Pick a natural small subset from the complete known catalog.

Visible output rules:
- Return structured fields. Do not pack "Context:", "Sentence:", "Hint:", or option sections into the instruction string.
- Do not show the hidden known catalog or an explicit "use only familiar items" list to the learner.
- Do not tell the learner which target item is being tested.
- Hints may mention the general skill to inspect, or may include one or two non-target familiar items if useful, but must not give away the answer.
- If the target appears in the stimulus sentence because the exercise needs it, do not call it "the target" or say whether it is correct.
- Only include context when social relationship, register, pronoun choice, or setting materially changes the expected answer. Omit context for straightforward translation/meaning tasks.
- For English-to-Vietnamese production cards, put the English sentence or idea in stimulus with stimulusLabel "Prompt"; keep instruction short.

`;

    switch (input.cardType) {
        case "use_in_sentence":
            return (
                base +
                `Create a specific, realistic scenario where a natural answer would use the target item.
The scenario should specify:
- Who the learner is talking to (age, relationship, formality level)
- What they want to express
- The social context

The prompt should feel like a real situation, not a textbook exercise. Use Southern Vietnamese context (Saigon, daily life).
Put the situation in context, any English meaning to express in stimulus, and the task in instruction. Do not name the target item as the thing being tested.`
            );

        case "whats_wrong":
            return (
                base +
                `Create a Vietnamese sentence that contains ONE specific error related to the target item.
The error should be about: wrong pronoun for the context, wrong particle, wrong register, or incorrect usage of the target item.
Include a social context so the learner knows why it's wrong (e.g., "A student writing to their professor:").
The sentence should otherwise be natural Vietnamese.
Put the context in context, the incorrect Vietnamese sentence in stimulus with stimulusLabel "Sentence", and the task in instruction.
Do not say the target expression is correct or incorrect in the hint.`
            );

        case "pick_right_one":
            return (
                base +
                `Create a Vietnamese sentence with a blank (___) where the target item or a related word goes.
Provide 4 options — one correct answer and three plausible but incorrect alternatives.
Include an English translation hint.
Also include "Why?" in the prompt to encourage the learner to explain their reasoning.
Put the cloze sentence in stimulus with stimulusLabel "Sentence", the English translation clue in hint, and the choices in options.
The correct answer should NOT always be first — randomize position.`
            );

        case "shift_register":
            return (
                base +
                `Create a correct Vietnamese sentence using the target item in one specific social context.
Then ask the learner to rewrite it for a DIFFERENT social context.
The two contexts should require meaningfully different pronoun choices, particles, or formality.
Example: casual with a friend → formal with an older coworker.
Put the original sentence in stimulus with stimulusLabel "Source", the context shift in context, and the task in instruction.`
            );

        case "complete_thought":
            return (
                base +
                `Create the beginning of a Vietnamese sentence that uses or relates to the target item, then ask the learner to complete it.
Provide context about who is speaking and what they want to say.
The sentence start should be 3-6 words — enough to establish direction but requiring the learner to finish naturally.
Put the context in context, the sentence beginning in stimulus with stimulusLabel "Start", and the task in instruction.`
            );

        case "what_does_this_mean":
            return (
                base +
                `Create a Vietnamese sentence using the target item in a specific social context where the SUBTEXT matters more than the literal meaning.
Ask the learner to explain what the person is REALLY saying (not just translate literally).
The context should make the subtext clear to someone who understands Vietnamese culture.
Put the social context in context, the Vietnamese sentence in stimulus with stimulusLabel "Sentence", and the task in instruction.`
            );

        case "how_would_you_say":
            return (
                base +
                `Create an English idea/meaning that the learner must express in Vietnamese.
The answer should naturally require using the target item(s).
Include a specific social context (who they're talking to, the relationship, the setting).
${input.bundledLearnables?.length ? "The sentence should also naturally incorporate the scaffolding items the learner already knows well." : ""}
If relationship/register matters, put that in context; otherwise omit context. Put the English sentence or idea in stimulus with stimulusLabel "Prompt", and keep instruction brief.`
            );
    }
}

function buildGradingPrompt(input: SrsAnswerGraderInput): string {
    const targetContext = formatLearnableList(input.targetLearnables);

    return `You are a Vietnamese language tutor grading a learner's answer on a review card.

Card type: ${CARD_TYPE_LABELS[input.cardType]}

Target item(s) being tested:
${targetContext}

Prompt shown to learner:
${input.prompt}

Learner's answer:
${input.userAnswer}

Grade the answer on this scale:
- "missed" (1): Wrong, blank, or shows no understanding
- "shaky" (2): Partially right but with significant gaps — wrong word, wrong register, or key misunderstanding
- "okay" (3): Correct but uncertain, slow, imprecise, or overly literal
- "solid" (4): Correct and natural — shows good understanding
- "nailed" (5): Correct with good instinct for nuance, register, and natural phrasing

Important grading guidelines:
- For "pick_right_one" cards: if the learner picked the right answer but gave a wrong or no explanation in the "why?" field, grade as "shaky" — correct guessing without understanding doesn't count
- For production cards: accept valid alternative phrasings. Vietnamese has many natural ways to say things. Don't penalize regional variations or equally natural alternatives.
- For register/pronoun cards: be strict about social correctness — using the wrong pronoun for the context is a real error even if the grammar is fine
- Give brief, conversational feedback in English (1-3 sentences). Sound like a helpful friend, not a test grader. If they got it right, acknowledge what was good. If wrong, explain why clearly.
- Keep the explanatory prose in English. Vietnamese text is allowed only when quoting the learner's answer, the correct answer, or a natural alternative phrasing.
- If there are natural alternative phrasings worth knowing, mention one briefly.

Return your grade and feedback.`;
}

export class VercelAiCardGenerator implements SrsCardGenerator {
    public async generateCard(input: SrsCardGeneratorInput) {
        const prompt = buildCardGenerationPrompt(input);

        const { object } = await generateObject({
            model: getSrsModel(),
            schema: cardPromptSchema,
            prompt,
            maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: createSrsAbortSignal(),
            providerOptions: getSrsProviderOptions(),
        });

        return {
            prompt: object.instruction,
            metadata: {
                ...(object.metadata ?? {}),
                ...(object.context ? { context: object.context } : {}),
                ...(object.stimulus ? { stimulus: object.stimulus } : {}),
                ...(object.stimulusLabel ? { stimulusLabel: object.stimulusLabel } : {}),
                ...(object.hint ? { hint: object.hint } : {}),
                ...(object.options ? { options: object.options } : {}),
            },
        };
    }
}

const gradeSchema = z.object({
    grade: z.enum(srsGrades),
    feedback: z.string(),
});

export class VercelAiAnswerGrader implements SrsAnswerGrader {
    public async gradeAnswer(input: SrsAnswerGraderInput) {
        const prompt = buildGradingPrompt(input);

        const { object } = await generateObject({
            model: getSrsModel(),
            schema: gradeSchema,
            prompt,
            maxRetries: getAppConfig().LEARNING_ANALYSIS_MAX_RETRIES,
            abortSignal: createSrsAbortSignal(),
            providerOptions: getSrsProviderOptions(),
        });

        const appConfig = getAppConfig();

        return {
            grade: object.grade,
            feedback: object.feedback,
            modelProvider: appConfig.LEARNING_ANALYSIS_PROVIDER,
            modelId: appConfig.LEARNING_ANALYSIS_MODEL,
        };
    }
}
