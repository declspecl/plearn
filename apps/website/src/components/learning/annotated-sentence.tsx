"use client";

import { ToneGraph } from "./tone-graph";
import { TONE_CLASS } from "./tone-utils";
import { getWordTone, type VietnameseTone } from "@plearn/core/vietnamese/tone-parser";
import { api } from "@plearn/trpc/client/react";
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { cn } from "~/lib/utils";

interface WordInfo {
    readonly text: string;
    readonly translation: string;
    readonly type: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase";
    readonly notes: string;
    readonly formula?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

interface AnnotatedSpan {
    readonly text: string;
    readonly wordInfo?: WordInfo;
}

function annotateSpans(sentence: string, items: readonly WordInfo[]): readonly AnnotatedSpan[] {
    const sortedItems = [...items].toSorted((a, b) => b.text.length - a.text.length);
    const spans: AnnotatedSpan[] = [];
    let remaining = sentence;

    while (remaining.length > 0) {
        const leadingSpace = remaining.match(/^\s+/);
        if (leadingSpace) {
            spans.push({ text: leadingSpace[0] });
            remaining = remaining.slice(leadingSpace[0].length);
            continue;
        }

        let matched = false;
        for (const item of sortedItems) {
            const lower = remaining.toLowerCase();
            const itemLower = item.text.toLowerCase();
            if (lower.startsWith(itemLower)) {
                const nextChar = remaining[item.text.length];
                if (!nextChar || /[\s,.\-!?;:"""''()[\]{}…]/.test(nextChar)) {
                    spans.push({ text: remaining.slice(0, item.text.length), wordInfo: item });
                    remaining = remaining.slice(item.text.length);
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            const nextSpace = remaining.search(/\s/);
            const end = nextSpace === -1 ? remaining.length : nextSpace;
            spans.push({ text: remaining.slice(0, end) });
            remaining = remaining.slice(end);
        }
    }

    return spans;
}

function ToneColoredWord({ text }: { text: string }) {
    return <span className={TONE_CLASS[getWordTone(text)]}>{text}</span>;
}

function PulsingDots() {
    return (
        <div className="flex items-center gap-1 py-2">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="bg-foreground/30 inline-block size-1.5 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}

export function WordPopoverContent({ wordInfo, text, enabled }: { wordInfo: WordInfo; text: string; enabled: boolean }) {
    const catalogQuery = api.learning.lookupByText.useQuery({ languageCode: "vi", text: wordInfo.text }, { staleTime: 60_000, enabled });

    const catalogData = catalogQuery.data;
    const isLoading = enabled && catalogQuery.isLoading;
    const isError = catalogQuery.isError;
    const examples = catalogData?.examples ?? wordInfo.exampleHints;
    const translation = catalogData?.translation ?? wordInfo.translation;
    const notes = catalogData?.usageNotes ?? wordInfo.notes;
    const formula = catalogData?.patternTemplate ?? wordInfo.formula;
    const partOfSpeech = catalogData?.partOfSpeech;
    const occurrenceCount = catalogData?.occurrenceCount;

    return (
        <div className="space-y-2">
            <ToneGraph text={wordInfo.text} className="mb-4 h-12 w-full max-w-[200px]" />
            <div className="flex items-center gap-2">
                <span className="text-foreground text-sm font-semibold">{text}</span>
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.span
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <PulsingDots />
                        </motion.span>
                    ) : partOfSpeech ? (
                        <motion.span
                            key="pos"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                {partOfSpeech}
                            </Badge>
                        </motion.span>
                    ) : null}
                </AnimatePresence>
                {occurrenceCount && occurrenceCount > 1 ? (
                    <motion.span
                        className="text-muted-foreground text-[10px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        seen {occurrenceCount}x
                    </motion.span>
                ) : null}
            </div>
            <p className="text-foreground/90">{translation}</p>
            {formula ? <p className="text-muted-foreground font-mono text-[11px]">{formula}</p> : null}
            {notes ? <p className="text-muted-foreground">{notes}</p> : null}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loading"
                        className="flex items-center gap-2 pt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            className="bg-muted h-px flex-1"
                            animate={{ scaleX: [0, 1, 0.6, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            style={{ transformOrigin: "left" }}
                        />
                        <span className="text-muted-foreground text-[10px]">looking up...</span>
                    </motion.div>
                ) : isError ? (
                    <motion.p key="error" className="text-destructive text-[10px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        catalog unavailable
                    </motion.p>
                ) : examples.length > 0 ? (
                    <motion.div
                        key="examples"
                        className="border-border space-y-1 border-t pt-1.5"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {examples.slice(0, 2).map((example, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <p className="text-foreground/80">{example.exampleText}</p>
                                <p className="text-muted-foreground italic">{example.translation}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function HoverableWord({ span }: { span: AnnotatedSpan & { wordInfo: WordInfo } }) {
    const [hasOpened, setHasOpened] = useState(false);

    return (
        <HoverCard
            onOpenChange={(open) => {
                if (open) setHasOpened(true);
            }}
        >
            <HoverCardTrigger
                delay={150}
                className="decoration-foreground/30 cursor-default underline decoration-dotted underline-offset-4"
            >
                <ToneColoredWord text={span.text} />
            </HoverCardTrigger>
            <HoverCardContent side="top" sideOffset={6} className="w-64">
                <WordPopoverContent wordInfo={span.wordInfo} text={span.text} enabled={hasOpened} />
            </HoverCardContent>
        </HoverCard>
    );
}

const TONE_LABELS: Record<VietnameseTone, string> = {
    1: "ngang",
    2: "huyền",
    3: "hỏi",
    4: "ngã",
    5: "sắc",
    6: "nặng",
};

export function ToneLegend() {
    return (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {(Object.entries(TONE_CLASS) as [string, string][]).map(([tone, cls]) => (
                <span key={tone} className="flex items-center gap-1">
                    <span className={`${cls} font-medium`}>{TONE_LABELS[Number(tone) as VietnameseTone]}</span>
                </span>
            ))}
        </div>
    );
}

export interface AnnotatedSentenceProps {
    readonly sentence: string;
    readonly items: readonly WordInfo[];
    readonly className?: string;
    readonly showToneGraph?: boolean;
}

export function AnnotatedSentence({ sentence, items, className, showToneGraph }: AnnotatedSentenceProps) {
    const spans = useMemo(() => annotateSpans(sentence, items), [sentence, items]);

    if (showToneGraph) {
        return (
            <div className={cn("flex flex-wrap items-end gap-x-1 gap-y-4", className)}>
                {spans.map((span, i) => {
                    if (/^\s+$/.test(span.text)) {
                        return <span key={i} className="w-1" />; // Space
                    }
                    const content = span.wordInfo ? (
                        <HoverableWord key={i} span={span as AnnotatedSpan & { wordInfo: WordInfo }} />
                    ) : (
                        <ToneColoredWord key={`plain-${i}`} text={span.text} />
                    );

                    return (
                        <div key={i} className="flex flex-col items-center">
                            <ToneGraph text={span.text} height={24} widthPerSyllable={30} className="mb-1 opacity-80" />
                            {content}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <span className={className}>
            {spans.map((span, i) =>
                span.wordInfo ? (
                    <HoverableWord key={i} span={span as AnnotatedSpan & { wordInfo: WordInfo }} />
                ) : /^\s+$/.test(span.text) ? (
                    <span key={i}>{span.text}</span>
                ) : (
                    <ToneColoredWord key={`plain-${i}`} text={span.text} />
                ),
            )}
        </span>
    );
}

export type { WordInfo };
