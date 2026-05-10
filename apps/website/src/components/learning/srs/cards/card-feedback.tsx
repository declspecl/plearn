"use client";

import type { SrsGrade } from "@plearn/core/srs/model";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const GRADE_LABELS: Record<SrsGrade, string> = {
    missed: "Missed",
    shaky: "Shaky",
    okay: "Okay",
    solid: "Solid",
    nailed: "Nailed",
};

const GRADE_STYLES: Record<SrsGrade, string> = {
    missed: "border-red-400/40 bg-red-500/10 text-red-200",
    shaky: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    okay: "border-sky-400/40 bg-sky-500/10 text-sky-200",
    solid: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    nailed: "border-primary/50 bg-primary/15 text-primary-foreground",
};

interface CardFeedbackProps {
    readonly grade: SrsGrade;
    readonly feedback: string;
    readonly isLastCard: boolean;
    readonly onNext: () => void;
}

export function CardFeedback({ grade, feedback, isLastCard, onNext }: CardFeedbackProps) {
    return (
        <section className="plearn-panel p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <span className={cn("rounded-full border px-3 py-1 text-sm", GRADE_STYLES[grade])}>{GRADE_LABELS[grade]}</span>
                <Button onClick={onNext}>{isLastCard ? "Finish" : "Next"}</Button>
            </div>
            <p className="mt-5 text-sm leading-7 whitespace-pre-wrap text-[color:var(--plearn-ink-3)]">{feedback}</p>
        </section>
    );
}
