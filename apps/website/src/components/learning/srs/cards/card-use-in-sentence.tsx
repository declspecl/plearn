"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { TextAnswerCard } from "./text-answer-card";

export function CardUseInSentence(props: {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onRevealHint?: () => void;
    readonly onSubmit: (answer: string) => void;
}) {
    return (
        <TextAnswerCard
            answerLabel="Compose"
            placeholder="Write a natural Vietnamese sentence..."
            submitLabel="Grade sentence"
            {...props}
        />
    );
}
