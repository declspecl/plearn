"use client";

import { WordPopoverContent } from "./annotated-sentence";
import type { LearnableType } from "@plearn/core/learning/model";
import { getWordTone, type VietnameseTone } from "@plearn/core/vietnamese/tone-parser";
import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";

const TONE_CLASS: Record<VietnameseTone, string> = {
    1: "text-tone-1",
    2: "text-tone-2",
    3: "text-tone-3",
    4: "text-tone-4",
    5: "text-tone-5",
    6: "text-tone-6",
};

export function ToneColoredText({ text }: { text: string }) {
    const parts = text.split(/(\s+)/);
    return (
        <>
            {parts.map((part, i) =>
                /^\s+$/.test(part) ? (
                    <span key={i}>{part}</span>
                ) : (
                    <span key={i} className={TONE_CLASS[getWordTone(part)]}>
                        {part}
                    </span>
                ),
            )}
        </>
    );
}

export interface LearnableHint {
    readonly text: string;
    readonly translation: string;
    readonly type: LearnableType;
    readonly notes: string;
    readonly formula?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

export function LearnableHoverText({ hint, className }: { hint: LearnableHint; className?: string }) {
    const [hasOpened, setHasOpened] = useState(false);

    const wordInfo = {
        text: hint.text,
        translation: hint.translation,
        type: hint.type,
        notes: hint.notes,
        formula: hint.formula,
        exampleHints: hint.exampleHints,
    };

    return (
        <HoverCard
            onOpenChange={(open) => {
                if (open) setHasOpened(true);
            }}
        >
            <HoverCardTrigger delay={150} className={className} render={<span />}>
                <ToneColoredText text={hint.text} />
            </HoverCardTrigger>
            <HoverCardContent side="top" sideOffset={6} className="w-64">
                <WordPopoverContent wordInfo={wordInfo} text={hint.text} enabled={hasOpened} />
            </HoverCardContent>
        </HoverCard>
    );
}
