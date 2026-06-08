"use client";

import { WordPopoverContent } from "./annotated-sentence";
import { TONE_CLASS } from "./tone-utils";
import type { LearnableType } from "@plearn/core/learning/model";
import { getWordTone, type VietnameseTone } from "@plearn/core/vietnamese/tone-parser";
import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";

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
    readonly reading?: string;
    readonly baseForm?: string;
    readonly romanization?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

function LearningText({ text, reading, languageCode }: { text: string; reading?: string; languageCode: string }) {
    if (languageCode === "vi") {
        return <ToneColoredText text={text} />;
    }

    if (languageCode === "ja" && reading && reading !== text) {
        return (
            <ruby>
                {text}
                <rt className="text-[0.55em] text-[color:var(--plearn-ink-4)]">{reading}</rt>
            </ruby>
        );
    }

    return <>{text}</>;
}

export function LearnableHoverText({
    hint,
    className,
    languageCode = "vi",
}: {
    hint: LearnableHint;
    className?: string;
    languageCode?: string;
}) {
    const [hasOpened, setHasOpened] = useState(false);

    const wordInfo = {
        text: hint.text,
        translation: hint.translation,
        type: hint.type,
        notes: hint.notes,
        formula: hint.formula,
        reading: hint.reading,
        baseForm: hint.baseForm,
        romanization: hint.romanization,
        exampleHints: hint.exampleHints,
    };

    return (
        <HoverCard
            onOpenChange={(open) => {
                if (open) setHasOpened(true);
            }}
        >
            <HoverCardTrigger delay={150} className={className} render={<span />}>
                <LearningText text={hint.text} reading={hint.reading} languageCode={languageCode} />
            </HoverCardTrigger>
            <HoverCardContent side="top" sideOffset={6} className="w-64">
                <WordPopoverContent wordInfo={wordInfo} text={hint.text} enabled={hasOpened} languageCode={languageCode} />
            </HoverCardContent>
        </HoverCard>
    );
}
