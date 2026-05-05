"use client";

import { AnnotatedSentence, type WordInfo } from "./annotated-sentence";
import { api } from "@plearn/trpc/client/react";
import { useMemo } from "react";

interface AnnotatedVietnameseTextProps {
    readonly text: string;
    readonly languageCode?: string;
    readonly className?: string;
    readonly showToneGraph?: boolean;
}

/**
 * Find the best text form from a learnable that actually appears in the sentence.
 * Prefers canonicalText, then falls back to aliases.
 */
function findMatchingText(sentenceLower: string, canonicalText: string, aliases: readonly string[]): string {
    const canonicalLower = canonicalText.toLowerCase();
    if (sentenceLower.includes(canonicalLower)) {
        return canonicalText;
    }

    for (const alias of aliases) {
        if (sentenceLower.includes(alias.toLowerCase())) {
            return alias;
        }
    }

    // Fall back to canonical even if not found — annotateSpans will skip it gracefully
    return canonicalText;
}

export function AnnotatedVietnameseText({ text, languageCode = "vi", className, showToneGraph }: AnnotatedVietnameseTextProps) {
    const { data: learnables } = api.learning.annotateText.useQuery({ languageCode, text }, { staleTime: 300_000 });

    const wordInfos = useMemo<readonly WordInfo[]>(() => {
        if (!learnables) return [];
        const sentenceLower = text.toLowerCase();
        return learnables.map((learnable) => ({
            text: findMatchingText(sentenceLower, learnable.canonicalText, learnable.aliases),
            translation: learnable.translation,
            type: learnable.type,
            notes: learnable.usageNotes,
            formula: learnable.patternTemplate,
            exampleHints: learnable.examples.slice(0, 2).map((e) => ({
                exampleText: e.exampleText,
                translation: e.translation,
            })),
        }));
    }, [learnables, text]);

    return <AnnotatedSentence sentence={text} items={wordInfos} className={className} showToneGraph={showToneGraph} />;
}
