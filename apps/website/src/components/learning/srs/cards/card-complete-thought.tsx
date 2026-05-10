"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { TextAnswerCard } from "./text-answer-card";

export function CardCompleteThought(props: {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onRevealHint?: () => void;
    readonly onSubmit: (answer: string) => void;
}) {
    return (
        <TextAnswerCard answerLabel="Complete" placeholder="Finish the Vietnamese thought..." submitLabel="Check completion" {...props} />
    );
}
