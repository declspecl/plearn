"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { TextAnswerCard } from "./text-answer-card";

export function CardWhatsWrong(props: {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onRevealHint?: () => void;
    readonly onSubmit: (answer: string) => void;
}) {
    return (
        <TextAnswerCard
            answerLabel="Diagnose and fix"
            placeholder="Explain the issue, then provide the corrected Vietnamese..."
            {...props}
        />
    );
}
