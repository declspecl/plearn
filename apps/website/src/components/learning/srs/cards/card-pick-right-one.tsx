"use client";

import type { CardPromptMetadata } from "./prompt-metadata";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

interface PickRightOneProps {
    readonly prompt: string;
    readonly metadata?: CardPromptMetadata;
    readonly disabled?: boolean;
    readonly onSubmit: (answer: string) => void;
    readonly onRevealHint?: () => void;
}

function parseOptions(prompt: string) {
    const lines = prompt.split("\n");
    const options = lines
        .map((line) => line.trim())
        .map((line) => {
            const match = /^([A-Da-d])[\).:-]\s*(.+)$/.exec(line);
            return match ? { label: match[1]!.toUpperCase(), text: match[2]! } : undefined;
        })
        .filter((option): option is { label: string; text: string } => Boolean(option));

    return options;
}

export function CardPickRightOne({ prompt, metadata, disabled = false, onSubmit, onRevealHint }: PickRightOneProps) {
    const options = useMemo(() => metadata?.options ?? parseOptions(prompt), [metadata?.options, prompt]);
    const [selected, setSelected] = useState<{ label: string; answer: string } | undefined>();
    const [why, setWhy] = useState("");
    const [showHint, setShowHint] = useState(false);
    const stimulusLabel = metadata?.stimulusLabel === "Meaning" ? "Prompt" : metadata?.stimulusLabel;

    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                const answer = [selected?.answer, why.trim()].filter(Boolean).join("\nWhy: ");
                if (answer) onSubmit(answer);
            }}
        >
            <div className="space-y-3">
                <p className="text-xs text-[color:var(--plearn-ink-4)]">Choose</p>
                {metadata?.context ? (
                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-4 py-3">
                        <p className="text-xs text-[color:var(--plearn-ink-4)]">Context</p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--plearn-ink-3)]">{metadata.context}</p>
                    </div>
                ) : null}
                {metadata?.stimulus ? (
                    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3">
                        <p className="text-xs text-[color:var(--plearn-ink-4)]">{stimulusLabel ?? "Sentence"}</p>
                        <p className="mt-1 text-[1.6rem] leading-[1.45] font-[var(--font-display)] tracking-[-0.02em] whitespace-pre-wrap">
                            {metadata.stimulus}
                        </p>
                    </div>
                ) : null}
                <p
                    className={cn(
                        "leading-[1.55] font-[var(--font-display)] text-balance whitespace-pre-wrap",
                        metadata?.stimulus ? "text-[1.2rem] tracking-[-0.01em]" : "text-[1.55rem] tracking-[-0.02em]",
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

            {options.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                    {options.map((option) => (
                        <button
                            className={cn(
                                "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                                selected?.label === option.label
                                    ? "border-primary/70 bg-primary/15 text-foreground"
                                    : "hover:text-foreground border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] text-[color:var(--plearn-ink-3)] hover:border-white/20",
                            )}
                            disabled={disabled}
                            key={option.label}
                            onClick={() => setSelected({ label: option.label, answer: `${option.label}. ${option.text}` })}
                            type="button"
                        >
                            <span className="mr-2 text-[color:var(--plearn-ink-4)]">{option.label}</span>
                            {option.text}
                        </button>
                    ))}
                </div>
            ) : null}

            <Textarea
                aria-label="Why this answer"
                disabled={disabled}
                onChange={(event) => setWhy(event.target.value)}
                placeholder="Optional: explain why this option is right..."
                size="sm"
                value={why}
            />

            <div className="flex justify-end">
                <Button disabled={disabled || (!selected && !why.trim())} size="lg" type="submit">
                    Check choice
                </Button>
            </div>
        </form>
    );
}
