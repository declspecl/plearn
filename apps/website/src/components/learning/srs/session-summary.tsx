"use client";

import type { Learnable } from "@plearn/core/learning/model";
import type { SrsGrade } from "@plearn/core/srs/model";
import Link from "next/link";
import { Button } from "~/components/ui/button";

const GRADE_ORDER: readonly SrsGrade[] = ["missed", "shaky", "okay", "solid", "nailed"];
const GRADE_LABELS: Record<SrsGrade, string> = {
    missed: "Missed",
    shaky: "Shaky",
    okay: "Okay",
    solid: "Solid",
    nailed: "Nailed",
};

interface SessionSummaryProps {
    readonly total: number;
    readonly grades: Record<SrsGrade, number>;
    readonly weakItems: readonly Learnable[];
}

export function SessionSummary({ total, grades, weakItems }: SessionSummaryProps) {
    return (
        <section className="space-y-5">
            <div className="plearn-panel p-6">
                <p className="plearn-eyebrow">Session complete</p>
                <p className="mt-2 text-5xl leading-none font-[var(--font-display)] tracking-[-0.04em]">
                    {total}
                    <span className="ml-2 font-sans text-sm text-[color:var(--plearn-ink-3)]">cards graded</span>
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-5">
                    {GRADE_ORDER.map((grade) => (
                        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] p-3" key={grade}>
                            <p className="text-xs text-[color:var(--plearn-ink-4)]">{GRADE_LABELS[grade]}</p>
                            <p className="mt-1 text-2xl font-[var(--font-display)]">{grades[grade]}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="plearn-panel p-6">
                <div className="plearn-divider-heading mb-4">
                    <span className="name">Weak items</span>
                    <span className="count">{weakItems.length}</span>
                </div>
                {weakItems.length > 0 ? (
                    <div className="space-y-2">
                        {weakItems.map((learnable) => (
                            <Link
                                className="hover:border-primary/60 grid gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-4 py-3 transition-colors md:grid-cols-[1fr_auto]"
                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                                key={learnable.id}
                            >
                                <span>
                                    <span className="block text-[1.2rem] font-[var(--font-display)] tracking-[-0.02em]">
                                        {learnable.canonicalText}
                                    </span>
                                    <span className="text-sm text-[color:var(--plearn-ink-3)]">{learnable.translation}</span>
                                </span>
                                <span className="text-xs text-[color:var(--plearn-ink-4)]">{learnable.type.replaceAll("_", " ")}</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-[color:var(--plearn-ink-3)]">No weak items detected from recent review history.</p>
                )}
                <Button className="mt-5" render={<Link href="/tools/vietnamese/practice?mode=weak_items" />} variant="outline">
                    Drill weak items
                </Button>
            </div>
        </section>
    );
}
