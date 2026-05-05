"use client";

import { AnnotatedSentence, ToneLegend, type WordInfo } from "./annotated-sentence";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/local-storage";
import { api } from "@plearn/trpc/client/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ExplanationSentence {
    readonly text: string;
    readonly naturalGloss: string;
    readonly literalGloss?: string;
}

interface ExplanationComponent {
    readonly text: string;
    readonly meaning: string;
    readonly literalMeaning?: string;
    readonly formula: string;
    readonly learnableType: "grammar_pattern" | "phrase";
    readonly notes?: string;
    readonly registerNotes?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

interface ExplanationWord {
    readonly text: string;
    readonly meaning: string;
    readonly literalMeaning?: string;
    readonly partOfSpeech?: string;
    readonly learnableType: "vocabulary" | "utility_word";
    readonly notes?: string;
    readonly registerNotes?: string;
    readonly exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
}

interface ExplanationIdiom {
    readonly text: string;
    readonly literalMeaning: string;
    readonly actualMeaning: string;
    readonly notes?: string;
}

interface ExplanationData {
    readonly sentence: ExplanationSentence;
    readonly components: readonly ExplanationComponent[];
    readonly words: readonly ExplanationWord[];
    readonly idioms: readonly ExplanationIdiom[];
    readonly registerCommentary?: string;
    readonly pronounNotes?: string;
    readonly structuralNotes?: string;
}

function extractExplanationData(rawAnalysisJson?: Record<string, unknown>): ExplanationData | undefined {
    if (!rawAnalysisJson?.sentence || typeof rawAnalysisJson.sentence !== "object") return undefined;
    const sentence = rawAnalysisJson.sentence as Record<string, unknown>;
    if (typeof sentence.text !== "string" || typeof sentence.naturalGloss !== "string") return undefined;

    return rawAnalysisJson as unknown as ExplanationData;
}

function typeLabel(type: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase") {
    switch (type) {
        case "grammar_pattern":
            return "Pattern";
        case "utility_word":
            return "Utility";
        case "vocabulary":
            return "Word";
        case "phrase":
            return "Phrase";
    }
}

function typeColor(type: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase") {
    switch (type) {
        case "grammar_pattern":
            return "var(--plearn-type-pattern)";
        case "vocabulary":
            return "var(--plearn-type-word)";
        case "phrase":
            return "var(--plearn-type-phrase)";
        case "utility_word":
            return "var(--plearn-type-utility)";
    }
}

function CommentaryCard({ title, content }: { title: string; content: string }) {
    return (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] px-5 py-4">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-[color:var(--plearn-ink-4)] uppercase">{title}</p>
            <p className="text-sm leading-relaxed text-[color:var(--plearn-ink-2)]">{content}</p>
        </div>
    );
}

function ExplanationItemCard({
    text,
    meaning,
    literalMeaning,
    learnableType,
    formula,
    notes,
    registerNotes,
    exampleHints,
    expanded,
    onToggle,
}: {
    text: string;
    meaning: string;
    literalMeaning?: string;
    learnableType: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase";
    formula?: string;
    notes?: string;
    registerNotes?: string;
    exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
    expanded: boolean;
    onToggle: () => void;
}) {
    const tColor = typeColor(learnableType);

    return (
        <div
            className={cn(
                "overflow-hidden rounded-[10px] border transition-colors",
                expanded
                    ? "border-[color:var(--border)] bg-[color:var(--plearn-bg-2)]"
                    : "border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] hover:border-white/20",
            )}
            style={{ borderLeftWidth: "3px", borderLeftColor: tColor }}
        >
            <button
                className="grid w-full gap-3 px-4 py-3.5 text-left md:grid-cols-[1fr_auto] md:items-center"
                onClick={onToggle}
                type="button"
            >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-foreground text-[1.2rem] font-[var(--font-display)] tracking-[-0.02em]">{text}</span>
                    <span className="text-sm text-[color:var(--plearn-ink-3)]">{meaning}</span>
                </span>
                <span
                    className="justify-self-start rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `color-mix(in srgb, ${tColor} 15%, transparent)`, color: tColor }}
                >
                    {typeLabel(learnableType)}
                </span>
            </button>

            {expanded ? (
                <div className="space-y-4 border-t border-dashed border-[color:var(--border)] px-5 py-5">
                    {literalMeaning ? (
                        <div>
                            <p className="mb-1 text-xs text-[color:var(--plearn-ink-4)]">Literal meaning</p>
                            <p className="text-sm text-[color:var(--plearn-ink-2)]">{literalMeaning}</p>
                        </div>
                    ) : null}

                    {formula ? (
                        <div>
                            <p className="mb-1 text-xs text-[color:var(--plearn-ink-4)]">Pattern</p>
                            <p className="font-mono text-sm text-[color:var(--plearn-ink-2)]">{formula}</p>
                        </div>
                    ) : null}

                    {notes ? (
                        <div>
                            <p className="mb-1 text-xs text-[color:var(--plearn-ink-4)]">Notes</p>
                            <p className="text-sm leading-relaxed text-[color:var(--plearn-ink-2)]">{notes}</p>
                        </div>
                    ) : null}

                    {registerNotes ? (
                        <div>
                            <p className="mb-1 text-xs text-[color:var(--plearn-ink-4)]">Register</p>
                            <p className="text-sm leading-relaxed text-[color:var(--plearn-ink-2)]">{registerNotes}</p>
                        </div>
                    ) : null}

                    {exampleHints.length > 0 ? (
                        <div>
                            <p className="mb-2 text-xs text-[color:var(--plearn-ink-4)]">Examples</p>
                            <div className="space-y-2">
                                {exampleHints.map((example, index) => (
                                    <div
                                        key={index}
                                        className="rounded-md border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-3 py-2"
                                    >
                                        <p className="text-foreground text-sm">{example.exampleText}</p>
                                        <p className="text-xs text-[color:var(--plearn-ink-3)]">{example.translation}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

const EXPLAIN_PHASES = [
    { label: "Parsing Vietnamese", duration: 5000 },
    { label: "Decomposing grammar", duration: 7000 },
    { label: "Explanation ready", duration: 3000 },
] as const;

const EXPLAIN_DRAFT_KEY = "plearn:explain:draft:v1";

function ExplainProgress({ isActive }: { isActive: boolean }) {
    const [phase, setPhase] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef(Date.now());

    useEffect(() => {
        if (!isActive) {
            setPhase(0);
            setElapsed(0);
            return;
        }

        startRef.current = Date.now();
        let currentPhaseIdx = 0;
        let phaseTimeout: ReturnType<typeof setTimeout>;

        function scheduleNext() {
            if (currentPhaseIdx >= EXPLAIN_PHASES.length - 1) return;
            phaseTimeout = setTimeout(() => {
                currentPhaseIdx++;
                setPhase(currentPhaseIdx);
                scheduleNext();
            }, EXPLAIN_PHASES[currentPhaseIdx]!.duration);
        }

        scheduleNext();

        const elapsedTimer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);

        return () => {
            clearTimeout(phaseTimeout);
            clearInterval(elapsedTimer);
        };
    }, [isActive]);

    if (!isActive) return null;

    const currentPhase = EXPLAIN_PHASES[phase]!;

    return (
        <motion.div
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={phase}
                            className="text-foreground text-sm font-medium"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentPhase.label}
                        </motion.p>
                    </AnimatePresence>
                    <span className="text-xs text-[color:var(--plearn-ink-4)] tabular-nums">{elapsed}s</span>
                </div>

                <div className="flex items-center gap-2">
                    {EXPLAIN_PHASES.map((_, index) => (
                        <div key={index} className="relative h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--plearn-bg-3)]">
                            {index < phase ? (
                                <motion.div
                                    className="bg-primary/70 absolute inset-0 rounded-full"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : index === phase ? (
                                <motion.div
                                    className="bg-primary/50 absolute inset-0 rounded-full"
                                    animate={{ scaleX: [0, 0.7, 0.4, 0.9] }}
                                    transition={{ duration: currentPhase.duration / 1000, ease: "easeInOut" }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export function ExplanationViewer() {
    const [vietnameseText, setVietnameseText] = useState("");
    const [explanationData, setExplanationData] = useState<ExplanationData | undefined>();
    const [workspaceId, setWorkspaceId] = useState<string | undefined>();
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [draftHydrated, setDraftHydrated] = useState(false);

    const explainMutation = api.learning.explainVietnameseSentence.useMutation();

    useEffect(() => {
        const draft = getLocalStorageItem<string>(EXPLAIN_DRAFT_KEY);
        if (draft !== null) {
            setVietnameseText(draft);
        }
        setDraftHydrated(true);
    }, []);

    useEffect(() => {
        if (!draftHydrated) return;
        setLocalStorageItem(EXPLAIN_DRAFT_KEY, vietnameseText);
    }, [draftHydrated, vietnameseText]);

    async function explain() {
        const result = await explainMutation.mutateAsync({ vietnameseText: vietnameseText.trim() });
        const rawJson = result.workspace.rawAnalysisJson as Record<string, unknown> | undefined;
        setExplanationData(extractExplanationData(rawJson));
        setWorkspaceId(result.workspace.id);
        setExpandedItemId(null);
    }

    const wordInfoItems: WordInfo[] = useMemo(() => {
        if (!explanationData) return [];

        const items: WordInfo[] = [];

        for (const component of explanationData.components) {
            items.push({
                text: component.text,
                translation: component.meaning,
                type: component.learnableType,
                notes: component.notes ?? "",
                formula: component.formula,
                exampleHints: component.exampleHints,
            });
        }

        for (const word of explanationData.words) {
            items.push({
                text: word.text,
                translation: word.meaning,
                type: word.learnableType,
                notes: word.notes ?? "",
                exampleHints: word.exampleHints,
            });
        }

        return items;
    }, [explanationData]);

    const allItems = useMemo(() => {
        if (!explanationData) return [];

        const items: Array<{
            key: string;
            text: string;
            meaning: string;
            literalMeaning?: string;
            learnableType: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase";
            formula?: string;
            notes?: string;
            registerNotes?: string;
            exampleHints: readonly { readonly exampleText: string; readonly translation: string }[];
        }> = [];

        for (const [index, component] of explanationData.components.entries()) {
            items.push({
                key: `c-${index}`,
                text: component.text,
                meaning: component.meaning,
                literalMeaning: component.literalMeaning,
                learnableType: component.learnableType,
                formula: component.formula,
                notes: component.notes,
                registerNotes: component.registerNotes,
                exampleHints: component.exampleHints,
            });
        }

        for (const [index, word] of explanationData.words.entries()) {
            items.push({
                key: `w-${index}`,
                text: word.text,
                meaning: word.meaning,
                literalMeaning: word.literalMeaning,
                learnableType: word.learnableType,
                notes: word.notes,
                registerNotes: word.registerNotes,
                exampleHints: word.exampleHints,
            });
        }

        return items;
    }, [explanationData]);

    return (
        <div className="space-y-8">
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)]">
                <div className="flex items-baseline justify-between px-4 pt-4 pb-2 text-sm text-[color:var(--plearn-ink-3)]">
                    <span>Vietnamese sentence</span>
                    <span className="text-[color:var(--plearn-ink-4)]">Cmd + Enter to explain</span>
                </div>
                <div className="px-4 pb-4">
                    <textarea
                        className="text-foreground field-sizing-content min-h-36 w-full resize-y rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base transition-colors outline-none focus:border-white/18"
                        data-slot="textarea"
                        maxLength={1000}
                        placeholder="Em ơi, anh muốn ăn phở bò tái nạm..."
                        value={vietnameseText}
                        onChange={(event) => setVietnameseText(event.target.value)}
                        onKeyDown={(event) => {
                            if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === "Enter" &&
                                vietnameseText.trim() &&
                                !explainMutation.isPending
                            ) {
                                event.preventDefault();
                                void explain();
                            }
                        }}
                    />
                </div>
                <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-3 py-3">
                    <span className="text-sm text-[color:var(--plearn-ink-4)]">{vietnameseText.length} / 1000</span>
                    <div className="flex items-center gap-3">
                        {explainMutation.error ? (
                            <span className="text-destructive-foreground text-sm">{explainMutation.error.message}</span>
                        ) : null}
                        <Button
                            disabled={!vietnameseText.trim() || explainMutation.isPending}
                            onClick={() => explain()}
                            type="button"
                            variant="secondary"
                        >
                            {explainMutation.isPending ? "Explaining..." : "Explain"}
                        </Button>
                    </div>
                </div>
            </div>

            <AnimatePresence>{explainMutation.isPending ? <ExplainProgress isActive={explainMutation.isPending} /> : null}</AnimatePresence>

            {explanationData ? (
                <div className="space-y-8">
                    <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] px-6 py-6">
                        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[color:var(--plearn-ink-4)]">
                            <span>Explained</span>
                            <span className="text-[color:var(--plearn-green)]">Vietnamese · comprehension</span>
                        </div>
                        <div className="space-y-3">
                            <AnnotatedSentence
                                sentence={explanationData.sentence.text}
                                items={wordInfoItems}
                                showToneGraph={true}
                                className="text-[1.95rem] leading-[1.35] font-[var(--font-display)] tracking-[-0.02em]"
                            />
                            <p className="text-foreground text-sm">{explanationData.sentence.naturalGloss}</p>
                            {explanationData.sentence.literalGloss ? (
                                <p className="text-sm text-[color:var(--plearn-ink-3)]">
                                    <span className="text-[color:var(--plearn-ink-4)]">Lit.</span> {explanationData.sentence.literalGloss}
                                </p>
                            ) : null}
                            <div className="border-t border-[color:var(--border)] pt-4">
                                <ToneLegend />
                            </div>
                        </div>
                    </section>

                    {explanationData.registerCommentary || explanationData.pronounNotes || explanationData.structuralNotes ? (
                        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {explanationData.registerCommentary ? (
                                <CommentaryCard title="Register" content={explanationData.registerCommentary} />
                            ) : null}
                            {explanationData.pronounNotes ? (
                                <CommentaryCard title="Pronouns" content={explanationData.pronounNotes} />
                            ) : null}
                            {explanationData.structuralNotes ? (
                                <CommentaryCard title="Structure" content={explanationData.structuralNotes} />
                            ) : null}
                        </section>
                    ) : null}

                    {explanationData.idioms.length > 0 ? (
                        <section className="space-y-3">
                            <div className="plearn-divider-heading">
                                <span className="name">Idioms & Fixed Expressions</span>
                                <span className="count">{explanationData.idioms.length}</span>
                            </div>
                            <div className="grid gap-2">
                                {explanationData.idioms.map((idiom, index) => (
                                    <div
                                        key={index}
                                        className="rounded-[10px] border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] px-5 py-4"
                                    >
                                        <p className="text-foreground text-[1.1rem] font-[var(--font-display)] tracking-[-0.02em]">
                                            {idiom.text}
                                        </p>
                                        <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                                            <div>
                                                <span className="text-[color:var(--plearn-ink-4)]">Literally:</span>{" "}
                                                <span className="text-[color:var(--plearn-ink-2)]">{idiom.literalMeaning}</span>
                                            </div>
                                            <div>
                                                <span className="text-[color:var(--plearn-ink-4)]">Means:</span>{" "}
                                                <span className="text-[color:var(--plearn-ink-2)]">{idiom.actualMeaning}</span>
                                            </div>
                                        </div>
                                        {idiom.notes ? (
                                            <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">{idiom.notes}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {allItems.length > 0 ? (
                        <section className="space-y-3">
                            <div className="plearn-divider-heading">
                                <span className="name">Breakdown</span>
                                <span className="count">{allItems.length} items</span>
                            </div>
                            <div className="grid gap-2">
                                {allItems.map((item) => (
                                    <ExplanationItemCard
                                        key={item.key}
                                        text={item.text}
                                        meaning={item.meaning}
                                        literalMeaning={item.literalMeaning}
                                        learnableType={item.learnableType}
                                        formula={item.formula}
                                        notes={item.notes}
                                        registerNotes={item.registerNotes}
                                        exampleHints={item.exampleHints}
                                        expanded={expandedItemId === item.key}
                                        onToggle={() => setExpandedItemId((current) => (current === item.key ? null : item.key))}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {workspaceId ? (
                        <div className="flex items-center justify-end">
                            <a
                                href={`/tools/vietnamese/sentences/${workspaceId}`}
                                className="text-sm text-[color:var(--plearn-ink-3)] underline underline-offset-4 transition-colors hover:text-[color:var(--foreground)]"
                            >
                                Review & save to catalog
                            </a>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
