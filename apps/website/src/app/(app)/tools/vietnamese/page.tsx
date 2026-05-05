import { ArtisanWorkbenchBanner } from "./_components/artisan-workbench-banner";
import { relativeTime } from "@/lib/format";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { cn } from "~/lib/utils";

export default async function VietnameseToolPage() {
    const caller = await createTRPCCaller();
    const [learnables, workspaces] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            limit: 100,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "vi",
            limit: 6,
        }),
    ]);

    const latestWorkspace = workspaces[0];
    const recentFeed = workspaces.slice(0, 6);
    const streakDates = new Set(workspaces.map((workspace) => workspace.createdAt.toISOString().slice(0, 10)).slice(0, 14));
    const streak = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));

        return streakDates.has(date.toISOString().slice(0, 10));
    });

    return (
        <div className="plearn-page">
            <header className="max-w-4xl space-y-3">
                <p className="plearn-eyebrow">Vietnamese · Hub</p>
                <p className="text-[2rem] leading-[1.35] font-[var(--font-display)] tracking-[-0.02em] text-balance md:text-[2.3rem]">
                    {latestWorkspace?.summary ?? "Your latest sentence will live here once you decompose it."}
                </p>
                {latestWorkspace ? (
                    <p className="text-sm text-[color:var(--plearn-ink-4)]">
                        From your last decomposition · {relativeTime(latestWorkspace.createdAt.toISOString())} ·{" "}
                        <Link href={`/tools/vietnamese/sentences/${latestWorkspace.id}`} className="text-primary no-underline">
                            revisit →
                        </Link>
                    </p>
                ) : null}
            </header>

            <div className="mt-8">
                <ArtisanWorkbenchBanner />
            </div>

            <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div>
                    <div className="plearn-divider-heading mb-4">
                        <span className="name">Where you left off</span>
                        <span className="count">last {recentFeed.length}</span>
                    </div>
                    <div className="space-y-2">
                        {recentFeed.map((workspace) => (
                            <Link
                                key={workspace.id}
                                href={`/tools/vietnamese/sentences/${workspace.id}`}
                                className="plearn-panel hover:border-primary/60 grid gap-3 px-4 py-3 transition-colors md:grid-cols-[90px_1fr_auto] md:items-center"
                            >
                                <span className="text-sm text-[color:var(--plearn-ink-4)]">
                                    {relativeTime(workspace.createdAt.toISOString())}
                                </span>
                                <span className="text-sm text-[color:var(--muted-foreground)]">
                                    Analyzed{" "}
                                    <span className="text-foreground text-base font-[var(--font-display)]">{workspace.sourceText}</span>
                                </span>
                                <span className="justify-self-start rounded-full border border-[color:var(--border)] px-3 py-1 text-sm text-[color:var(--plearn-ink-3)] md:justify-self-end">
                                    Decomposition
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="plearn-panel p-5">
                        <p className="text-sm text-[color:var(--plearn-ink-3)]">Streak</p>
                        <p className="mt-2 text-5xl leading-none font-[var(--font-display)] tracking-[-0.04em]">
                            {streak.filter(Boolean).length}
                            <span className="ml-2 font-sans text-sm text-[color:var(--plearn-ink-3)]">days</span>
                        </p>
                        <div className="mt-4 grid grid-cols-7 gap-1.5">
                            {streak.map((active, index) => (
                                <span
                                    key={index}
                                    className={cn(
                                        "h-3 rounded-sm",
                                        active ? "bg-[color:var(--plearn-green)]" : "bg-[color:var(--plearn-bg-3)]",
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="plearn-panel p-5">
                        <p className="text-sm text-[color:var(--plearn-ink-3)]">Catalog</p>
                        <p className="mt-2 text-3xl font-[var(--font-display)] tracking-[-0.03em]">
                            {learnables.length}
                            <span className="ml-2 font-sans text-sm text-[color:var(--plearn-ink-3)]">entries</span>
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                href="/tools/vietnamese/analyze"
                                className="text-primary rounded border border-[color:var(--border)] px-3 py-2 text-sm"
                            >
                                Analyze
                            </Link>
                            <Link
                                href="/tools/vietnamese/catalog"
                                className="text-primary rounded border border-[color:var(--border)] px-3 py-2 text-sm"
                            >
                                Catalog
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
