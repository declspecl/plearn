import { SentenceSearchForm } from "./_components/sentence-search-form";
import { AnnotatedVietnameseText } from "@/components/learning/annotated-vietnamese-text";
import { relativeTime, shortDate } from "@/lib/format";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { performance } from "node:perf_hooks";

interface SentenceHistoryPageProps {
    readonly searchParams: Promise<{
        q?: string;
    }>;
}

export default async function SentenceHistoryPage({ searchParams }: SentenceHistoryPageProps) {
    const startedAt = performance.now();
    const params = await searchParams;
    const caller = await createTRPCCaller();
    const workspaces = await caller.learning.listSentenceWorkspaces({
        languageCode: "vi",
        query: params.q,
        limit: 100,
        offset: 0,
    });

    const grouped = Object.groupBy(workspaces, (workspace) => {
        const today = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().slice(0, 10);
        const key = workspace.createdAt.toISOString().slice(0, 10);
        if (key === today) return "Today";
        if (key === yesterday) return "Yesterday";

        return shortDate(workspace.createdAt.toISOString());
    });

    console.info("[PERF][PAGE] vietnamese.sentences", { elapsedMs: Math.round(performance.now() - startedAt) });

    return (
        <div className="plearn-page">
            <header className="mb-8 max-w-3xl">
                <p className="plearn-eyebrow">Vietnamese</p>
                <h1 className="mt-2 text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">History</h1>
                <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">Everything you&apos;ve analyzed, added, or reviewed.</p>
            </header>

            <div className="mb-8 max-w-2xl">
                <SentenceSearchForm />
            </div>

            <section className="space-y-7">
                {Object.entries(grouped).map(([label, entries]) =>
                    entries?.length ? (
                        <div key={label}>
                            <div className="plearn-divider-heading mb-3">
                                <span className="name">{label}</span>
                                <span className="count">{entries.length}</span>
                            </div>
                            <div className="space-y-1">
                                {entries.map((workspace) => (
                                    <Link
                                        key={workspace.id}
                                        href={`/tools/vietnamese/sentences/${workspace.id}`}
                                        className="group grid gap-3 border-b border-[color:var(--plearn-line-soft)] px-2 py-4 transition-colors hover:bg-white/2 md:grid-cols-[80px_1fr_auto_auto] md:items-center"
                                    >
                                        <span className="text-sm text-[color:var(--plearn-ink-4)]">
                                            {relativeTime(workspace.createdAt.toISOString()).replace(" ago", "")}
                                        </span>
                                        <div>
                                            <p className="text-foreground text-[1.05rem] leading-[1.4] font-[var(--font-display)] tracking-[-0.01em]">
                                                <AnnotatedVietnameseText text={workspace.sourceText} />
                                            </p>
                                            <p className="mt-1 text-xs text-[color:var(--plearn-ink-3)]">
                                                {workspace.summary ?? workspace.status}
                                            </p>
                                        </div>
                                        <span className="text-sm text-[color:var(--plearn-ink-3)]">Decomposition</span>
                                        <span className="hidden gap-2 text-sm text-[color:var(--plearn-ink-4)] group-hover:flex">
                                            <span>Open</span>
                                            <span>Re-analyze</span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null,
                )}
            </section>
        </div>
    );
}
