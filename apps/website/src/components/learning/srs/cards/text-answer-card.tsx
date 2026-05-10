"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

interface TextAnswerCardProps {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly answerLabel: string;
    readonly submitLabel?: string;
    readonly disabled?: boolean;
    readonly placeholder?: string;
    readonly onSubmit: (answer: string) => void;
    readonly onRevealHint?: () => void;
}

export function TextAnswerCard({
    prompt,
    metadata,
    answerLabel,
    submitLabel = "Check answer",
    disabled = false,
    placeholder = "Type your answer...",
    onSubmit,
    onRevealHint,
}: TextAnswerCardProps) {
    const [answer, setAnswer] = useState("");
    const [showHint, setShowHint] = useState(false);
    const stimulusLabel = metadata?.stimulusLabel === "Meaning" ? "Prompt" : metadata?.stimulusLabel;

    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                const trimmed = answer.trim();
                if (trimmed) onSubmit(trimmed);
            }}
        >
            <div className="space-y-3">
                <p className="text-xs text-[color:var(--plearn-ink-4)]">{answerLabel}</p>
                {metadata?.context ? (
                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-4 py-3">
                        <p className="text-xs text-[color:var(--plearn-ink-4)]">Context</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--plearn-ink-3)]">{metadata.context}</p>
                    </div>
                ) : null}
                {metadata?.stimulus ? (
                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
                        <p className="text-xs text-[color:var(--plearn-ink-4)]">{stimulusLabel ?? "Prompt"}</p>
                        <p className="mt-1 text-[1.6rem] leading-[1.45] font-[var(--font-display)] tracking-[-0.02em] whitespace-pre-wrap">
                            {metadata.stimulus}
                        </p>
                    </div>
                ) : null}
                <p
                    className={cn(
                        "leading-[1.55] font-[var(--font-display)] text-balance whitespace-pre-wrap",
                        metadata?.stimulus ? "text-[1.2rem] tracking-[-0.01em]" : "text-[1.6rem] tracking-[-0.02em]",
                    )}
                >
                    {prompt}
                </p>
                {metadata?.hint && !showHint ? (
                    <Button
                        className="w-fit"
                        onClick={() => {
                            setShowHint(true);
                            onRevealHint?.();
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        Show hint
                    </Button>
                ) : null}
                {metadata?.hint && showHint ? (
                    <div className="rounded-lg border border-dashed border-[color:var(--border)] px-4 py-3">
                        <p className="text-xs text-[color:var(--plearn-ink-4)]">Hint</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--plearn-ink-3)]">{metadata.hint}</p>
                    </div>
                ) : null}
            </div>

            <Textarea
                aria-label={answerLabel}
                disabled={disabled}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={placeholder}
                size="lg"
                value={answer}
            />

            <div className="flex justify-end">
                <Button disabled={disabled || !answer.trim()} size="lg" type="submit">
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
