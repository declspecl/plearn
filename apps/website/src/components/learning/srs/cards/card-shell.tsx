import type { SrsCardType } from "@plearn/core/srs/model";

const CARD_TYPE_LABELS: Record<SrsCardType, string> = {
    use_in_sentence: "Use in a sentence",
    whats_wrong: "What's wrong?",
    pick_right_one: "Pick the right one",
    shift_register: "Shift register",
    complete_thought: "Complete the thought",
    what_does_this_mean: "What does this mean?",
    how_would_you_say: "How would you say?",
};

interface CardShellProps {
    readonly cardType: SrsCardType;
    readonly currentIndex: number;
    readonly totalCards: number;
    readonly children: React.ReactNode;
}

export function cardTypeLabel(cardType: SrsCardType) {
    return CARD_TYPE_LABELS[cardType];
}

export function CardShell({ cardType, currentIndex, totalCards, children }: CardShellProps) {
    const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

    return (
        <section className="plearn-panel overflow-hidden">
            <div className="h-1.5 bg-[color:var(--plearn-bg-3)]">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="border-b border-[color:var(--border)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-3 py-1 text-xs text-[color:var(--plearn-ink-3)]">
                        {cardTypeLabel(cardType)}
                    </span>
                    <span className="text-xs text-[color:var(--plearn-ink-4)]">
                        Card {currentIndex + 1} of {totalCards}
                    </span>
                </div>
            </div>
            <div className="p-5 md:p-7">{children}</div>
        </section>
    );
}
