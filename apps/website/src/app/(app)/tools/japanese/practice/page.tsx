import { ReviewSession } from "@/components/learning/srs/review-session";

interface JapanesePracticePageProps {
    readonly searchParams: Promise<{
        mode?: string;
    }>;
}

export default async function JapanesePracticePage({ searchParams }: JapanesePracticePageProps) {
    const params = await searchParams;
    const initialPracticeMode =
        params.mode === "weak_items" || params.mode === "category" || params.mode === "random" ? params.mode : undefined;

    return (
        <div className="plearn-page">
            <header className="mb-7 max-w-3xl">
                <p className="plearn-eyebrow">Japanese · Practice</p>
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Freeform drills</h1>
                <p className="mt-2 text-sm leading-7 text-[color:var(--plearn-ink-3)]">
                    Run AI-graded Japanese production practice without moving the spaced repetition schedule.
                </p>
            </header>

            <ReviewSession initialPracticeMode={initialPracticeMode} languageCode="ja" mode="practice" />
        </div>
    );
}
