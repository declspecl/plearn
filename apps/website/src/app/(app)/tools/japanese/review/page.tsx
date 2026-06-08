import { ReviewSession } from "@/components/learning/srs/review-session";
import { createTRPCCaller } from "@/lib/server/trpc-caller";

export default async function JapaneseReviewPage() {
    const caller = await createTRPCCaller();
    const status = await caller.srs.getReviewStatus({ languageCode: "ja" });
    const availableCount = status.dueCount + status.newAvailable;

    return (
        <div className="plearn-page">
            <header className="mb-7 max-w-3xl">
                <p className="plearn-eyebrow">Japanese · Review</p>
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">
                    {status.dueCount > 0 ? `${status.dueCount} items due` : "Review queue"}
                </h1>
                <p className="mt-2 text-sm leading-7 text-[color:var(--plearn-ink-3)]">
                    Work through generated recall cards for saved Japanese items.
                </p>
            </header>

            {availableCount > 0 ? (
                <ReviewSession
                    initialDueCount={status.dueCount}
                    initialNewAvailable={status.newAvailable}
                    languageCode="ja"
                    mode="review"
                />
            ) : (
                <section className="plearn-panel p-7">
                    <p className="text-[1.65rem] font-[var(--font-display)] tracking-[-0.02em]">All caught up</p>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-[color:var(--plearn-ink-3)]">
                        No due or newly available Japanese cards are waiting right now.
                    </p>
                </section>
            )}
        </div>
    );
}
