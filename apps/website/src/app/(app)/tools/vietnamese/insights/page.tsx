import { GraphShell } from "@/components/learning/graph/graph-shell";
import { createTRPCCaller } from "@/lib/server/trpc-caller";

export default async function VietnameseInsightsPage() {
    const caller = await createTRPCCaller();
    const [graphData, learnables, workspaceList] = await Promise.all([
        caller.learning.getLearnableGraph({
            languageCode: "vi",
            limit: 300,
        }),
        caller.learning.listLearnables({
            languageCode: "vi",
            limit: 100,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "vi",
            limit: 12,
        }),
    ]);

    const workspaceDetails = await Promise.all(
        workspaceList.slice(0, 8).map((workspace) =>
            caller.learning.getWorkspace({
                workspaceId: workspace.id,
                languageCode: "vi",
            }),
        ),
    );

    const known = new Set(learnables.map((learnable) => learnable.canonicalText.normalize("NFKC").trim().toLowerCase()));
    const unseenCounts = new Map<string, { count: number; translation: string }>();

    for (const workspace of workspaceDetails) {
        if (!workspace) continue;
        for (const item of workspace.items) {
            const key = item.proposedText.normalize("NFKC").trim().toLowerCase();
            if (!key || known.has(key)) continue;
            const current = unseenCounts.get(key);
            unseenCounts.set(key, {
                count: (current?.count ?? 0) + 1,
                translation: item.proposedTranslation,
            });
        }
    }

    const gapItems = [...unseenCounts.entries()].toSorted((left, right) => right[1].count - left[1].count).slice(0, 6);
    const analyzedItemCount = workspaceDetails.reduce((sum, workspace) => sum + (workspace?.items.length ?? 0), 0);
    const catalogCoverage = analyzedItemCount > 0 ? Math.round((learnables.length / analyzedItemCount) * 100) : 0;

    return (
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <header className="max-w-3xl space-y-3">
                <p className="plearn-eyebrow">Vietnamese · Insights</p>
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Signals from your learning loop.</h1>
                <p className="text-sm leading-7 text-[color:var(--plearn-ink-3)]">
                    The report called for glanceable progress first, then deeper analysis. These headline stats surface coverage and
                    repeated misses before you drop into the graph.
                </p>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
                <div className="plearn-panel p-6">
                    <p className="text-sm text-[color:var(--plearn-ink-3)]">Catalog coverage</p>
                    <p className="mt-3 text-5xl font-[var(--font-display)] tracking-[-0.04em]">
                        {catalogCoverage}
                        <span className="ml-2 font-sans text-sm text-[color:var(--plearn-ink-3)]">% of analyzed items catalogued</span>
                    </p>
                    <p className="mt-4 text-sm text-[color:var(--plearn-ink-3)]">
                        {gapItems.length} repeated items from recent workspaces still are not in the catalog.
                    </p>
                </div>

                <div className="plearn-panel p-6">
                    <p className="text-sm text-[color:var(--plearn-ink-3)]">Knowledge graph</p>
                    <p className="mt-3 text-5xl font-[var(--font-display)] tracking-[-0.04em]">
                        {graphData.nodes.length}
                        <span className="ml-2 font-sans text-sm text-[color:var(--plearn-ink-3)]">nodes in view</span>
                    </p>
                    <p className="mt-4 text-sm text-[color:var(--plearn-ink-3)]">
                        {graphData.edges.length} links blending co-occurrence, pattern families, and semantic similarity.
                    </p>
                </div>
            </section>

            {gapItems.length > 0 ? (
                <section className="plearn-panel p-6">
                    <div className="plearn-divider-heading mb-4">
                        <span className="name">Catalog gaps</span>
                        <span className="count">seen recently, not saved</span>
                    </div>
                    <div className="space-y-2">
                        {gapItems.map(([text, info]) => (
                            <div
                                key={text}
                                className="grid gap-3 border-t border-dashed border-[color:var(--border)] py-3 first:border-t-0 first:pt-0 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                            >
                                <div>
                                    <p className="text-[1.15rem] font-[var(--font-display)] tracking-[-0.02em]">{text}</p>
                                    <p className="text-xs text-[color:var(--plearn-ink-3)]">{info.translation}</p>
                                </div>
                                <span className="text-sm text-[color:var(--plearn-ink-3)]">{info.count} seen</span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[color:var(--plearn-bg-3)]">
                                    <div
                                        className="h-full bg-[color:var(--plearn-amber)]"
                                        style={{ width: `${Math.min(info.count / 5, 1) * 100}%` }}
                                    />
                                </div>
                                <span className="text-primary text-sm">Add next</span>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            <GraphShell data={graphData} />
        </div>
    );
}
