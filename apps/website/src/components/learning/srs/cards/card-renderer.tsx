"use client";

import { CardCompleteThought } from "./card-complete-thought";
import { CardHowWouldYouSay } from "./card-how-would-you-say";
import { CardPickRightOne } from "./card-pick-right-one";
import { CardShiftRegister } from "./card-shift-register";
import { CardUseInSentence } from "./card-use-in-sentence";
import { CardWhatDoesThisMean } from "./card-what-does-this-mean";
import { CardWhatsWrong } from "./card-whats-wrong";
import type { CardPromptMetadata } from "./prompt-metadata";
import type { SrsCardType } from "@plearn/core/srs/model";

interface CardRendererProps {
    readonly cardType: SrsCardType;
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onSubmit: (answer: string) => void;
    readonly onRevealHint?: () => void;
}

export function CardRenderer({ cardType, prompt, metadata, disabled, onSubmit, onRevealHint }: CardRendererProps) {
    switch (cardType) {
        case "use_in_sentence":
            return (
                <CardUseInSentence
                    disabled={disabled}
                    metadata={metadata}
                    onRevealHint={onRevealHint}
                    onSubmit={onSubmit}
                    prompt={prompt}
                />
            );
        case "whats_wrong":
            return (
                <CardWhatsWrong disabled={disabled} metadata={metadata} onRevealHint={onRevealHint} onSubmit={onSubmit} prompt={prompt} />
            );
        case "pick_right_one":
            return (
                <CardPickRightOne disabled={disabled} metadata={metadata} onRevealHint={onRevealHint} onSubmit={onSubmit} prompt={prompt} />
            );
        case "shift_register":
            return (
                <CardShiftRegister
                    disabled={disabled}
                    metadata={metadata}
                    onRevealHint={onRevealHint}
                    onSubmit={onSubmit}
                    prompt={prompt}
                />
            );
        case "complete_thought":
            return (
                <CardCompleteThought
                    disabled={disabled}
                    metadata={metadata}
                    onRevealHint={onRevealHint}
                    onSubmit={onSubmit}
                    prompt={prompt}
                />
            );
        case "what_does_this_mean":
            return (
                <CardWhatDoesThisMean
                    disabled={disabled}
                    metadata={metadata}
                    onRevealHint={onRevealHint}
                    onSubmit={onSubmit}
                    prompt={prompt}
                />
            );
        case "how_would_you_say":
            return (
                <CardHowWouldYouSay
                    disabled={disabled}
                    metadata={metadata}
                    onRevealHint={onRevealHint}
                    onSubmit={onSubmit}
                    prompt={prompt}
                />
            );
    }
}
