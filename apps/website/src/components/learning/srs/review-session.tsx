"use client";

import { CardFeedback } from "./cards/card-feedback";
import { CardRenderer } from "./cards/card-renderer";
import { CardShell } from "./cards/card-shell";
import { parseCardPromptMetadata, type CardPromptMetadata } from "./cards/prompt-metadata";
import { SessionSummary } from "./session-summary";
import { ArrowClockwise, Barbell, Cards, CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import type { Learnable, LearnableType } from "@plearn/core/learning/model";
import type { SrsCardType, SrsGrade } from "@plearn/core/srs/model";
import { api } from "@plearn/trpc/client/react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";

type SessionMode = "review" | "practice";
type SessionPhase = "idle" | "loading_card" | "answering" | "grading" | "feedback" | "summary" | "empty" | "error";
type PracticeMode = "weak_items" | "category" | "random";

interface ReviewCardRef {
    readonly cardId: string;
    readonly learnableId: string;
}

interface ActiveSession {
    readonly sessionId: string;
    readonly cards: readonly ReviewCardRef[];
}

interface GeneratedCardState {
    readonly cardType: SrsCardType;
    readonly prompt: string;
    readonly metadata: CardPromptMetadata;
    readonly learnables: readonly Learnable[];
}

interface FeedbackState {
    readonly grade: SrsGrade;
    readonly feedback: string;
}

interface SummaryState {
    readonly total: number;
    readonly grades: Record<SrsGrade, number>;
    readonly weakItems: readonly Learnable[];
}

interface ReviewSessionProps {
    readonly mode: SessionMode;
    readonly initialDueCount?: number;
    readonly initialNewAvailable?: number;
    readonly initialPracticeMode?: PracticeMode;
}

const TYPE_FILTERS: ReadonlyArray<{ value: LearnableType; label: string }> = [
    { value: "grammar_pattern", label: "Patterns" },
    { value: "phrase", label: "Phrases" },
    { value: "vocabulary", label: "Vocabulary" },
    { value: "utility_word", label: "Utility" },
];

function practiceModeFromQuery(value: string | null): PracticeMode {
    if (value === "weak_items" || value === "category" || value === "random") return value;
    return "weak_items";
}

function LoadingPanel({ label }: { readonly label: string }) {
    return (
        <section className="plearn-panel flex items-center gap-3 p-6 text-sm text-[color:var(--plearn-ink-3)]">
            <SpinnerGap className="size-4 animate-spin" />
            {label}
        </section>
    );
}

function formatPromptForGrading(card: GeneratedCardState) {
    return [
        card.metadata.context ? `Context: ${card.metadata.context}` : undefined,
        card.metadata.stimulus ? `${card.metadata.stimulusLabel ?? "Stimulus"}: ${card.metadata.stimulus}` : undefined,
        `Instruction: ${card.prompt}`,
        card.metadata.hint ? `Hint: ${card.metadata.hint}` : undefined,
        card.metadata.options?.length
            ? `Options:\n${card.metadata.options.map((option) => `${option.label}. ${option.text}`).join("\n")}`
            : undefined,
    ]
        .filter(Boolean)
        .join("\n\n");
}

export function ReviewSession({
    mode,
    initialDueCount = 0,
    initialNewAvailable = 0,
    initialPracticeMode = "weak_items",
}: ReviewSessionProps) {
    const [phase, setPhase] = useState<SessionPhase>("idle");
    const [session, setSession] = useState<ActiveSession | undefined>();
    const [cardIndex, setCardIndex] = useState(0);
    const [generatedCard, setGeneratedCard] = useState<GeneratedCardState | undefined>();
    const [feedback, setFeedback] = useState<FeedbackState | undefined>();
    const [summary, setSummary] = useState<SummaryState | undefined>();
    const [error, setError] = useState<string | undefined>();
    const [cardStartedAt, setCardStartedAt] = useState<number>(Date.now());
    const [hintRevealed, setHintRevealed] = useState(false);
    const [practiceMode, setPracticeMode] = useState<PracticeMode>(() => practiceModeFromQuery(initialPracticeMode));
    const [practiceLimit, setPracticeLimit] = useState(10);
    const [typeFilters, setTypeFilters] = useState<readonly LearnableType[]>([]);

    const startReview = api.srs.startReviewSession.useMutation();
    const startPractice = api.srs.startPracticeSession.useMutation();
    const generateReviewCard = api.srs.generateCard.useMutation();
    const generatePracticeCard = api.srs.generatePracticeCard.useMutation();
    const submitReviewAnswer = api.srs.submitAnswer.useMutation();
    const submitPracticeAnswer = api.srs.submitPracticeAnswer.useMutation();
    const summaryQuery = api.srs.getSessionSummary.useQuery(
        { sessionId: session?.sessionId ?? "" },
        { enabled: phase === "summary" && mode === "review" && Boolean(session?.sessionId) },
    );

    const activeCard = session?.cards[cardIndex];
    const availableCount = initialDueCount + initialNewAvailable;
    const selectedTypeText = useMemo(() => {
        if (typeFilters.length === 0) return "All categories";
        return typeFilters.map((type) => type.replaceAll("_", " ")).join(", ");
    }, [typeFilters]);

    async function loadCard(nextSession: ActiveSession, nextIndex: number) {
        const card = nextSession.cards[nextIndex];
        if (!card) {
            await finishSession(nextSession.sessionId);
            return;
        }

        setPhase("loading_card");
        setGeneratedCard(undefined);
        setFeedback(undefined);
        setError(undefined);
        setHintRevealed(false);

        try {
            const result =
                mode === "review"
                    ? await generateReviewCard.mutateAsync({ cardId: card.cardId })
                    : await generatePracticeCard.mutateAsync({ learnableId: card.learnableId });
            setGeneratedCard({
                cardType: result.cardType,
                prompt: result.prompt,
                metadata: parseCardPromptMetadata(result.metadata),
                learnables: result.learnables,
            });
            setCardStartedAt(Date.now());
            setPhase("answering");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to generate the card.");
            setPhase("error");
        }
    }

    async function startSession() {
        setPhase("loading_card");
        setError(undefined);
        setSummary(undefined);
        setCardIndex(0);

        try {
            const result =
                mode === "review"
                    ? await startReview.mutateAsync({ maxCards: 15 })
                    : await startPractice.mutateAsync({
                          mode: practiceMode,
                          limit: practiceLimit,
                          types: practiceMode === "category" && typeFilters.length > 0 ? [...typeFilters] : undefined,
                      });

            const nextSession = {
                sessionId: result.sessionId,
                cards: result.cards.map((card) => ({
                    cardId: card.cardId,
                    learnableId: card.learnableId,
                })),
            };

            setSession(nextSession);

            if (nextSession.cards.length === 0) {
                setPhase("empty");
                return;
            }

            await loadCard(nextSession, 0);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to start the session.");
            setPhase("error");
        }
    }

    async function submitAnswer(answer: string) {
        if (!session || !activeCard || !generatedCard) return;

        setPhase("grading");
        setError(undefined);
        const durationMs = Date.now() - cardStartedAt;
        const targetLearnableIds = generatedCard.learnables.map((learnable) => learnable.id);

        try {
            const result =
                mode === "review"
                    ? await submitReviewAnswer.mutateAsync({
                          sessionId: session.sessionId,
                          cardId: activeCard.cardId,
                          cardType: generatedCard.cardType,
                          prompt: formatPromptForGrading({
                              ...generatedCard,
                              metadata: hintRevealed
                                  ? generatedCard.metadata
                                  : {
                                        ...generatedCard.metadata,
                                        hint: undefined,
                                    },
                          }),
                          userAnswer: answer,
                          targetLearnableIds,
                          durationMs,
                      })
                    : await submitPracticeAnswer.mutateAsync({
                          sessionId: session.sessionId,
                          cardId: activeCard.cardId,
                          cardType: generatedCard.cardType,
                          prompt: formatPromptForGrading({
                              ...generatedCard,
                              metadata: hintRevealed
                                  ? generatedCard.metadata
                                  : {
                                        ...generatedCard.metadata,
                                        hint: undefined,
                                    },
                          }),
                          userAnswer: answer,
                          targetLearnableIds,
                          durationMs,
                      });

            setFeedback({ grade: result.grade, feedback: result.feedback });
            setPhase("feedback");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to grade the answer.");
            setPhase("error");
        }
    }

    async function finishSession(sessionId: string) {
        if (mode === "practice") {
            setSummary(undefined);
            setPhase("summary");
            return;
        }

        setPhase("summary");
        if (summaryQuery.data && summaryQuery.data.sessionId === sessionId) {
            setSummary(summaryQuery.data);
        }
    }

    async function moveNext() {
        if (!session) return;
        const nextIndex = cardIndex + 1;
        if (nextIndex >= session.cards.length) {
            await finishSession(session.sessionId);
            return;
        }

        setCardIndex(nextIndex);
        await loadCard(session, nextIndex);
    }

    if (phase === "idle") {
        if (mode === "practice") {
            return (
                <section className="plearn-panel p-5 md:p-7">
                    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                        <div>
                            <p className="text-[1.55rem] font-[var(--font-display)] tracking-[-0.02em]">Choose a drill lane</p>
                            <div className="mt-4 grid gap-2">
                                {[
                                    { value: "weak_items" as const, label: "Weak items", detail: "Prioritize recent misses." },
                                    { value: "category" as const, label: "Category", detail: "Practice selected catalog types." },
                                    { value: "random" as const, label: "Recent saves", detail: "Pull from recently seen catalog items." },
                                ].map((option) => (
                                    <button
                                        className={cn(
                                            "rounded-lg border px-4 py-3 text-left transition-colors",
                                            practiceMode === option.value
                                                ? "border-primary/70 bg-primary/15"
                                                : "border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] hover:border-white/20",
                                        )}
                                        key={option.value}
                                        onClick={() => setPracticeMode(option.value)}
                                        type="button"
                                    >
                                        <span className="text-foreground block text-sm">{option.label}</span>
                                        <span className="text-xs text-[color:var(--plearn-ink-4)]">{option.detail}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs text-[color:var(--plearn-ink-4)]">Card count</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {[5, 10, 15, 20].map((limit) => (
                                        <button
                                            className={cn(
                                                "rounded-md border px-3 py-2 text-sm",
                                                practiceLimit === limit
                                                    ? "border-primary/70 bg-primary/15 text-foreground"
                                                    : "border-[color:var(--border)] text-[color:var(--plearn-ink-3)]",
                                            )}
                                            key={limit}
                                            onClick={() => setPracticeLimit(limit)}
                                            type="button"
                                        >
                                            {limit}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={cn("space-y-2", practiceMode !== "category" && "opacity-45")}>
                                <p className="text-xs text-[color:var(--plearn-ink-4)]">{selectedTypeText}</p>
                                {TYPE_FILTERS.map((filter) => (
                                    <label className="flex items-center gap-2 text-sm text-[color:var(--plearn-ink-3)]" key={filter.value}>
                                        <Checkbox
                                            checked={typeFilters.includes(filter.value)}
                                            disabled={practiceMode !== "category"}
                                            onCheckedChange={(checked) => {
                                                setTypeFilters((current) =>
                                                    checked
                                                        ? [...current, filter.value]
                                                        : current.filter((value) => value !== filter.value),
                                                );
                                            }}
                                        />
                                        {filter.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={startSession} size="lg">
                            <Barbell />
                            Start practice
                        </Button>
                    </div>
                </section>
            );
        }

        return (
            <section className="plearn-panel p-5 md:p-7">
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                        <p className="text-[1.55rem] font-[var(--font-display)] tracking-[-0.02em]">Ready when you are</p>
                        <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">
                            {initialDueCount} due, {initialNewAvailable} new available for introduction.
                        </p>
                    </div>
                    <Button disabled={availableCount === 0} onClick={startSession} size="lg">
                        <Cards />
                        Start review
                    </Button>
                </div>
            </section>
        );
    }

    if (phase === "loading_card") {
        return <LoadingPanel label="Generating the next card..." />;
    }

    if (phase === "grading") {
        return <LoadingPanel label="Grading your answer..." />;
    }

    if (phase === "empty") {
        return (
            <section className="plearn-panel p-6">
                <p className="text-[1.4rem] font-[var(--font-display)] tracking-[-0.02em]">Nothing matched that session.</p>
                <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">Try another practice lane or save more catalog items first.</p>
                <Button className="mt-5" onClick={() => setPhase("idle")} variant="outline">
                    Change setup
                </Button>
            </section>
        );
    }

    if (phase === "error") {
        return (
            <section className="plearn-panel p-6">
                <p className="text-[1.4rem] font-[var(--font-display)] tracking-[-0.02em]">Session paused</p>
                <p className="mt-2 text-sm text-red-300">{error}</p>
                <Button className="mt-5" onClick={startSession} variant="outline">
                    <ArrowClockwise />
                    Retry
                </Button>
            </section>
        );
    }

    if (phase === "summary") {
        if (mode === "practice") {
            return (
                <section className="plearn-panel p-6">
                    <CheckCircle className="text-primary size-7" weight="duotone" />
                    <p className="mt-3 text-[1.65rem] font-[var(--font-display)] tracking-[-0.02em]">Practice complete</p>
                    <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">
                        Answers were logged as practice and did not change SRS intervals.
                    </p>
                    <Button className="mt-5" onClick={() => setPhase("idle")}>
                        Start another drill
                    </Button>
                </section>
            );
        }

        const querySummary = summary ?? summaryQuery.data;
        if (!querySummary) return <LoadingPanel label="Building your session summary..." />;
        return <SessionSummary grades={querySummary.grades} total={querySummary.total} weakItems={querySummary.weakItems} />;
    }

    if (phase === "feedback" && feedback) {
        return (
            <CardFeedback
                feedback={feedback.feedback}
                grade={feedback.grade}
                isLastCard={!session || cardIndex >= session.cards.length - 1}
                onNext={moveNext}
            />
        );
    }

    if (!generatedCard || !session) {
        return <LoadingPanel label="Preparing session..." />;
    }

    return (
        <div className="space-y-4">
            <CardShell cardType={generatedCard.cardType} currentIndex={cardIndex} totalCards={session.cards.length}>
                <CardRenderer
                    cardType={generatedCard.cardType}
                    disabled={phase !== "answering"}
                    metadata={generatedCard.metadata}
                    onRevealHint={() => setHintRevealed(true)}
                    onSubmit={submitAnswer}
                    prompt={generatedCard.prompt}
                />
            </CardShell>
        </div>
    );
}
