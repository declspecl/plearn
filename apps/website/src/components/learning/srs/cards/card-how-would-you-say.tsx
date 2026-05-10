"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { TextAnswerCard } from "./text-answer-card";

export function CardHowWouldYouSay(props: {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onRevealHint?: () => void;
    readonly onSubmit: (answer: string) => void;
}) {
    return (
        <TextAnswerCard answerLabel="Produce Vietnamese" placeholder="Answer in Vietnamese..." submitLabel="Grade response" {...props} />
    );
}
