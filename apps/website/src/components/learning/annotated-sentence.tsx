"use client";

import { POS_CLASS, POS_LABEL, POS_LEGEND_ORDER, posCategory, posClassName } from "./pos-utils";
import { ToneGraph } from "./tone-graph";
import { TONE_CLASS } from "./tone-utils";
import type { DisplayToken } from "@plearn/core/learning/text-processor";
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
    readonly reading?: string;
    readonly baseForm?: string;
    readonly romanization?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

interface AnnotatedSpan {
    readonly text: string;
    readonly wordInfo?: WordInfo;
    readonly partOfSpeech?: string;
    readonly reading?: string;
    readonly tokens?: readonly DisplayToken[];
}

interface ParticleInsight {
    readonly label: string;
    readonly role: string;
    readonly contrast: string;
    readonly learnerTrap: string;
}

const JAPANESE_PARTICLES: Readonly<Record<string, ParticleInsight>> = {
    は: {
        label: "topic marker",
        role: "frames what the sentence is about, often setting up contrast or known context.",
        contrast: "が tends to spotlight the subject or new information; は sets the topic lane.",
        learnerTrap: "Do not read it as a simple subject marker. It often means 'as for...'.",
    },
    が: {
        label: "subject focus",
        role: "marks the thing doing or being something, especially when it is new, emphasized, or identified.",
        contrast: "は sets a topic; が answers 'who/what exactly?'.",
        learnerTrap: "It can feel stronger than English subject marking because it often carries focus.",
    },
    を: {
        label: "direct object",
        role: "marks the thing directly affected by the verb.",
        contrast: "で marks where/how an action happens; を marks what the action acts on.",
        learnerTrap: "With motion verbs, を can mark a path through or across a place.",
    },
    に: {
        label: "target / point",
        role: "points to a destination, time, recipient, existence location, or result state.",
        contrast: "で is the action stage; に is the target point.",
        learnerTrap: "Think 'pinpoint' more than 'in/on/at'.",
    },
    で: {
        label: "scene / means",
        role: "marks where an action takes place or the tool/method used to do it.",
        contrast: "に marks existence or destination; で marks the action stage.",
        learnerTrap: "Location choice changes with whether something exists there or happens there.",
    },
    へ: {
        label: "direction",
        role: "marks movement toward a direction or destination, with softer destination focus than に.",
        contrast: "に lands on the endpoint; へ points the arrow.",
        learnerTrap: "Pronounced え when used as a particle.",
    },
    と: {
        label: "with / quote / and",
        role: "links companions, quotes, exact content, or complete list items.",
        contrast: "や gives a partial example list; と tends to feel complete or exact.",
        learnerTrap: "Its job changes sharply depending on whether a speech/thought verb follows.",
    },
    の: {
        label: "linking / nominalizer",
        role: "connects nouns, marks possession/association, or turns a clause into a noun-like idea.",
        contrast: "こと nominalizes more abstractly; の often feels concrete or immediate.",
        learnerTrap: "It is not only possessive. Often it means 'the one/act/fact of...'.",
    },
    も: {
        label: "also / even",
        role: "adds the marked item to an existing set or raises it as an emphatic case.",
        contrast: "は contrasts a topic; も includes another member.",
        learnerTrap: "It replaces は/が/を rather than stacking after them in many basic uses.",
    },
    か: {
        label: "question / option",
        role: "marks a question, uncertainty, or one option among alternatives.",
        contrast: "ね seeks agreement; よ pushes information; か asks or opens uncertainty.",
        learnerTrap: "In embedded clauses, it can mean whether/if, not a direct question.",
    },
    ね: {
        label: "shared feeling",
        role: "invites agreement, softens a statement, or checks shared understanding.",
        contrast: "よ informs/asserts; ね aligns with the listener.",
        learnerTrap: "Overusing it can sound like constant confirmation-seeking.",
    },
    よ: {
        label: "assertive cue",
        role: "presents information the listener may not know or adds insistence.",
        contrast: "ね shares; よ tells.",
        learnerTrap: "It can sound pushy if the sentence already feels forceful.",
    },
};

function isJapaneseParticle(text: string) {
    return Boolean(JAPANESE_PARTICLES[text]);
}

function particleInsightFor(text: string): ParticleInsight | undefined {
    return JAPANESE_PARTICLES[text];
}

function annotateSpans(sentence: string, items: readonly WordInfo[], languageCode: string): readonly AnnotatedSpan[] {
    const sortedItems = [...items].toSorted((a, b) => b.text.length - a.text.length);
    const spans: AnnotatedSpan[] = [];
    let remaining = sentence;
    const requiresWordBoundary = languageCode !== "ja";

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
                if (!requiresWordBoundary || !nextChar || /[\s,.\-!?;:"""''()[\]{}…]/.test(nextChar)) {
                    spans.push({ text: remaining.slice(0, item.text.length), wordInfo: item });
                    remaining = remaining.slice(item.text.length);
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            const nextSpace = remaining.search(/\s/);
            const end = nextSpace === -1 ? 1 : nextSpace;
            spans.push({ text: remaining.slice(0, end) });
            remaining = remaining.slice(end);
        }
    }

    return spans;
}

/**
 * Builds spans from kuromoji display tokens so every Japanese word can be colored by its
 * part of speech. Consecutive tokens that reconstruct a catalog entry are grouped into one
 * hoverable span (keeping their individual tokens for per-word coloring); everything else
 * stays as its own token, carrying its POS and reading.
 */
function annotateJapaneseSpans(tokens: readonly DisplayToken[], items: readonly WordInfo[]): readonly AnnotatedSpan[] {
    const sortedItems = [...items].toSorted((a, b) => b.text.length - a.text.length);
    const spans: AnnotatedSpan[] = [];
    let index = 0;

    while (index < tokens.length) {
        const token = tokens[index]!;
        if (!token.isWordLike || token.surface.trim().length === 0) {
            spans.push({ text: token.surface });
            index += 1;
            continue;
        }

        let matchedTokenCount = 0;
        let matchedItem: WordInfo | undefined;
        for (const item of sortedItems) {
            const itemLower = item.text.toLowerCase();
            let joined = "";
            let count = 0;
            for (const token of tokens.slice(index)) {
                joined += token.surface;
                count += 1;
                if (joined.length > item.text.length) break;
                if (joined.toLowerCase() === itemLower) {
                    matchedTokenCount = count;
                    matchedItem = item;
                    break;
                }
            }
            if (matchedItem) break;
        }

        if (matchedItem && matchedTokenCount > 0) {
            const runTokens = tokens.slice(index, index + matchedTokenCount);
            spans.push({
                text: runTokens.map((t) => t.surface).join(""),
                wordInfo: matchedItem,
                partOfSpeech: runTokens[0]!.partOfSpeech,
                reading: matchedTokenCount === 1 ? runTokens[0]!.reading : undefined,
                tokens: runTokens,
            });
            index += matchedTokenCount;
            continue;
        }

        spans.push({ text: token.surface, partOfSpeech: token.partOfSpeech, reading: token.reading, tokens: [token] });
        index += 1;
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

function JapaneseParticleXray({ text }: { text: string }) {
    const insight = particleInsightFor(text);
    if (!insight) return null;

    return (
        <div className="border-border/80 space-y-2 border-t pt-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-[color:var(--plearn-ink-4)]">Particle x-ray</span>
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    {insight.label}
                </Badge>
            </div>
            <p className="text-foreground/90 text-xs leading-5">{insight.role}</p>
            <p className="text-muted-foreground text-xs leading-5">{insight.contrast}</p>
            <p className="text-muted-foreground text-xs leading-5">{insight.learnerTrap}</p>
        </div>
    );
}

function analyzeJapaneseForm(input: { text: string; baseForm?: string; partOfSpeech?: string }) {
    const text = input.text.trim();
    const base = input.baseForm?.trim();
    const pos = input.partOfSpeech?.trim();
    const steps: string[] = [];
    let label: string | undefined;
    let stem: string | undefined;

    if (!text) return undefined;

    if (text.endsWith("ませんでした")) {
        label = "polite past negative";
        stem = text.slice(0, -"ませんでした".length);
        steps.push("stem + ません + でした");
    } else if (text.endsWith("ません")) {
        label = "polite negative";
        stem = text.slice(0, -"ません".length);
        steps.push("stem + ません");
    } else if (text.endsWith("ました")) {
        label = "polite past";
        stem = text.slice(0, -"ました".length);
        steps.push("stem + ました");
    } else if (text.endsWith("ます")) {
        label = "polite non-past";
        stem = text.slice(0, -"ます".length);
        steps.push("stem + ます");
    } else if (text.endsWith("ている") || text.endsWith("でいる")) {
        label = "progressive / resultant state";
        stem = text.slice(0, -2);
        steps.push("te-form + いる");
    } else if (text.endsWith("なかった")) {
        label = "plain past negative";
        stem = text.slice(0, -"なかった".length);
        steps.push("negative stem + なかった");
    } else if (text.endsWith("ない")) {
        label = "plain negative";
        stem = text.slice(0, -"ない".length);
        steps.push("negative stem + ない");
    } else if (text.endsWith("させられる") || text.endsWith("させられた")) {
        label = "causative-passive";
        steps.push("causative + passive ending");
    } else if (text.endsWith("させる") || text.endsWith("させた")) {
        label = "causative";
        steps.push("someone causes/allows someone to do it");
    } else if (text.endsWith("られる") || text.endsWith("られた") || text.endsWith("れる") || text.endsWith("れた")) {
        label = "passive / potential";
        steps.push("passive or potential ending; context decides which reading wins");
    } else if (text.endsWith("かった")) {
        label = "i-adjective past";
        stem = text.slice(0, -"かった".length);
        steps.push("adjective stem + かった");
    } else if (text.endsWith("くない")) {
        label = "i-adjective negative";
        stem = text.slice(0, -"くない".length);
        steps.push("adjective stem + くない");
    } else if (text.endsWith("くて")) {
        label = "i-adjective connective";
        stem = text.slice(0, -"くて".length);
        steps.push("adjective stem + くて");
    }

    if (base && base !== text) {
        steps.unshift(`dictionary form: ${base}`);
    }

    if (!label && !steps.length) {
        return undefined;
    }

    return {
        label: label ?? "surface form",
        stem: stem && stem.length > 0 ? stem : undefined,
        partOfSpeech: pos,
        steps,
    };
}

function JapaneseFormBreakdown({ text, baseForm, partOfSpeech }: { text: string; baseForm?: string; partOfSpeech?: string }) {
    const form = analyzeJapaneseForm({ text, baseForm, partOfSpeech });
    if (!form) return null;

    return (
        <div className="border-border/80 space-y-2 border-t pt-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-[color:var(--plearn-ink-4)]">Form machine</span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {form.label}
                </Badge>
            </div>
            {form.stem ? <p className="text-muted-foreground text-xs">Stem: {form.stem}</p> : null}
            <div className="flex flex-wrap gap-1.5">
                {form.steps.map((step) => (
                    <span
                        key={step}
                        className="rounded-md border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-2 py-1 text-[11px] text-[color:var(--plearn-ink-3)]"
                    >
                        {step}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function WordPopoverContent({
    wordInfo,
    text,
    enabled,
    languageCode,
}: {
    wordInfo: WordInfo;
    text: string;
    enabled: boolean;
    languageCode: string;
}) {
    const catalogQuery = api.learning.lookupByText.useQuery({ languageCode, text: wordInfo.text }, { staleTime: 60_000, enabled });

    const catalogData = catalogQuery.data;
    const isLoading = enabled && catalogQuery.isLoading;
    const isError = catalogQuery.isError;
    const examples = catalogData?.examples ?? wordInfo.exampleHints;
    const translation = catalogData?.translation ?? wordInfo.translation;
    const notes = catalogData?.usageNotes ?? wordInfo.notes;
    const formula = catalogData?.patternTemplate ?? wordInfo.formula;
    const partOfSpeech =
        catalogData?.partOfSpeech ??
        (typeof catalogData?.languageMetadata.tokenizerPartOfSpeech === "string"
            ? catalogData.languageMetadata.tokenizerPartOfSpeech
            : undefined);
    const reading =
        (typeof catalogData?.languageMetadata.reading === "string" ? catalogData.languageMetadata.reading : undefined) ?? wordInfo.reading;
    const baseForm =
        (typeof catalogData?.languageMetadata.baseForm === "string" ? catalogData.languageMetadata.baseForm : undefined) ??
        wordInfo.baseForm;
    const romanization =
        (typeof catalogData?.languageMetadata.romanization === "string" ? catalogData.languageMetadata.romanization : undefined) ??
        wordInfo.romanization;
    const occurrenceCount = catalogData?.occurrenceCount;

    return (
        <div className="space-y-2">
            {languageCode === "vi" ? <ToneGraph text={wordInfo.text} className="mb-4 h-12 w-full max-w-[200px]" /> : null}
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
            {reading || baseForm || romanization ? (
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {reading ? <span>Reading: {reading}</span> : null}
                    {baseForm ? <span>Base: {baseForm}</span> : null}
                    {romanization ? <span>{romanization}</span> : null}
                </div>
            ) : null}
            <p className="text-foreground/90">{translation}</p>
            {formula ? <p className="text-muted-foreground font-mono text-[11px]">{formula}</p> : null}
            {notes ? <p className="text-muted-foreground">{notes}</p> : null}
            {languageCode === "ja" ? (
                <>
                    <JapaneseParticleXray text={wordInfo.text} />
                    <JapaneseFormBreakdown text={wordInfo.text} baseForm={baseForm} partOfSpeech={partOfSpeech} />
                </>
            ) : null}
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

function InlineWordText({
    text,
    reading,
    languageCode,
    partOfSpeech,
}: {
    text: string;
    reading?: string;
    languageCode: string;
    partOfSpeech?: string;
}) {
    if (languageCode === "vi") {
        return <ToneColoredWord text={text} />;
    }

    if (languageCode !== "ja") {
        return <span>{text}</span>;
    }

    const colorClass = posClassName(partOfSpeech);
    if (!reading || reading === text) {
        return <span className={colorClass}>{text}</span>;
    }

    return (
        <ruby className={colorClass}>
            {text}
            <rt className="text-[0.55em] text-[color:var(--plearn-ink-4)]">{reading}</rt>
        </ruby>
    );
}

/** Renders a run of kuromoji tokens, each colored by its own part of speech. */
function JapaneseTokenRun({ tokens }: { tokens: readonly DisplayToken[] }) {
    return (
        <>
            {tokens.map((token, i) => (
                <InlineWordText
                    key={`${token.surface}-${i}`}
                    text={token.surface}
                    reading={token.reading}
                    partOfSpeech={token.partOfSpeech}
                    languageCode="ja"
                />
            ))}
        </>
    );
}

function PlainParticle({ text }: { text: string }) {
    const [hasOpened, setHasOpened] = useState(false);
    const insight = particleInsightFor(text);
    if (!insight) return <span>{text}</span>;

    return (
        <HoverCard
            onOpenChange={(open) => {
                if (open) setHasOpened(true);
            }}
        >
            <HoverCardTrigger
                delay={120}
                className="text-primary decoration-primary/40 cursor-default rounded-sm px-0.5 underline decoration-dotted underline-offset-4"
            >
                {text}
            </HoverCardTrigger>
            <HoverCardContent side="top" sideOffset={6} className="w-64">
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground text-sm font-semibold">{text}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {insight.label}
                        </Badge>
                    </div>
                    {hasOpened ? <JapaneseParticleXray text={text} /> : null}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}

function HoverableWord({ span, languageCode }: { span: AnnotatedSpan & { wordInfo: WordInfo }; languageCode: string }) {
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
                {languageCode === "ja" && span.tokens ? (
                    <JapaneseTokenRun tokens={span.tokens} />
                ) : (
                    <InlineWordText
                        text={span.text}
                        reading={span.reading ?? span.wordInfo.reading}
                        languageCode={languageCode}
                        partOfSpeech={span.partOfSpeech}
                    />
                )}
            </HoverCardTrigger>
            <HoverCardContent side="top" sideOffset={6} className="w-72">
                <WordPopoverContent wordInfo={span.wordInfo} text={span.text} enabled={hasOpened} languageCode={languageCode} />
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

export function PosLegend() {
    return (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {POS_LEGEND_ORDER.map((category) => (
                <span key={category} className="flex items-center gap-1">
                    <span className={`${POS_CLASS[category]} font-medium`}>{POS_LABEL[category]}</span>
                </span>
            ))}
        </div>
    );
}

function ReadingFlowTile({
    token,
    index,
    isLast,
    languageCode,
}: {
    token: DisplayToken;
    index: number;
    isLast: boolean;
    languageCode: string;
}) {
    const [hasOpened, setHasOpened] = useState(false);
    const particle = particleInsightFor(token.surface);
    const category = posCategory(token.partOfSpeech);
    const type = particle?.label ?? POS_LABEL[category];

    const wordInfo: WordInfo = {
        text: token.surface,
        translation: "",
        type: "vocabulary",
        notes: "",
        reading: token.reading,
        baseForm: token.baseForm,
        exampleHints: [],
    };

    return (
        <div className="group relative flex min-w-[56px] flex-col items-center">
            <span className="mb-1 flex size-5 items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] text-[color:var(--plearn-ink-4)]">
                {index + 1}
            </span>
            <HoverCard
                onOpenChange={(open) => {
                    if (open) setHasOpened(true);
                }}
            >
                <HoverCardTrigger
                    delay={120}
                    className={cn(
                        "cursor-default rounded-md border bg-[color:var(--background)] px-2 py-1 text-base font-medium transition-colors hover:border-white/25",
                        particle ? "border-primary/50 bg-primary/10" : "border-[color:var(--border)]",
                        POS_CLASS[category],
                    )}
                >
                    {token.surface}
                </HoverCardTrigger>
                <HoverCardContent side="top" sideOffset={6} className="w-72">
                    {particle ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-foreground text-sm font-semibold">{token.surface}</span>
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                    {particle.label}
                                </Badge>
                            </div>
                            {hasOpened ? <JapaneseParticleXray text={token.surface} /> : null}
                        </div>
                    ) : (
                        <WordPopoverContent wordInfo={wordInfo} text={token.surface} enabled={hasOpened} languageCode={languageCode} />
                    )}
                </HoverCardContent>
            </HoverCard>
            <span className="mt-1 min-h-4 text-[11px] text-[color:var(--plearn-ink-4)]">{token.reading ?? ""}</span>
            <span className="max-w-[92px] truncate text-[10px] text-[color:var(--plearn-ink-4)]">{type}</span>
            {isLast ? null : <span className="absolute top-[34px] left-[calc(100%-1px)] h-px w-2 bg-[color:var(--border)]" />}
        </div>
    );
}

function JapaneseReadingFlow({ tokens, languageCode }: { tokens: readonly DisplayToken[]; languageCode: string }) {
    const flowItems = tokens.filter((token) => token.isWordLike && token.surface.trim().length > 0);
    if (flowItems.length === 0) return null;

    return (
        <div className="mt-4 w-full overflow-x-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-[color:var(--plearn-ink-4)]">Reading flow</span>
                <span className="text-[11px] text-[color:var(--plearn-ink-4)]">surface / reading / function</span>
            </div>
            <div className="flex min-w-max items-stretch gap-2">
                {flowItems.map((token, index) => (
                    <ReadingFlowTile
                        key={`${token.surface}-${index}`}
                        token={token}
                        index={index}
                        isLast={index === flowItems.length - 1}
                        languageCode={languageCode}
                    />
                ))}
            </div>
        </div>
    );
}

export interface AnnotatedSentenceProps {
    readonly sentence: string;
    readonly items: readonly WordInfo[];
    readonly className?: string;
    readonly languageCode?: string;
    readonly showToneGraph?: boolean;
    readonly showJapaneseFlow?: boolean;
}

export function AnnotatedSentence({
    sentence,
    items,
    className,
    languageCode = "vi",
    showToneGraph,
    showJapaneseFlow,
}: AnnotatedSentenceProps) {
    const tokensQuery = api.learning.tokenizeText.useQuery(
        { languageCode, text: sentence },
        { enabled: languageCode === "ja", staleTime: 300_000 },
    );
    const tokens = tokensQuery.data;

    const spans = useMemo(() => {
        if (languageCode === "ja" && tokens) {
            return annotateJapaneseSpans(tokens, items);
        }

        return annotateSpans(sentence, items, languageCode);
    }, [sentence, items, languageCode, tokens]);

    if (showToneGraph && languageCode === "vi") {
        return (
            <div className={cn("flex flex-wrap items-end gap-x-1 gap-y-4", className)}>
                {spans.map((span, i) => {
                    if (/^\s+$/.test(span.text)) {
                        return <span key={i} className="w-1" />; // Space
                    }
                    const content = span.wordInfo ? (
                        <HoverableWord key={i} span={span as AnnotatedSpan & { wordInfo: WordInfo }} languageCode={languageCode} />
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

    const inline = (
        <span className={className}>
            {spans.map((span, i) =>
                span.wordInfo ? (
                    <HoverableWord key={i} span={span as AnnotatedSpan & { wordInfo: WordInfo }} languageCode={languageCode} />
                ) : /^\s+$/.test(span.text) ? (
                    <span key={i}>{span.text}</span>
                ) : languageCode === "ja" && isJapaneseParticle(span.text) ? (
                    <PlainParticle text={span.text} key={`particle-${i}`} />
                ) : (
                    <InlineWordText
                        text={span.text}
                        reading={span.reading}
                        partOfSpeech={span.partOfSpeech}
                        languageCode={languageCode}
                        key={`plain-${i}`}
                    />
                ),
            )}
        </span>
    );

    if (languageCode === "ja" && showJapaneseFlow && tokens) {
        return (
            <span className="block">
                {inline}
                <JapaneseReadingFlow tokens={tokens} languageCode={languageCode} />
            </span>
        );
    }

    return inline;
}

export type { WordInfo };
