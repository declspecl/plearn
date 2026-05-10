"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { TextAnswerCard } from "./text-answer-card";

export function CardWhatDoesThisMean(props: {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onRevealHint?: () => void;
    readonly onSubmit: (answer: string) => void;
}) {
    return <TextAnswerCard answerLabel="Explain meaning" placeholder="Give the natural meaning and any nuance you notice..." {...props} />;
}
