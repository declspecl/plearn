import { GraphShell } from "@/components/learning/graph/graph-shell";
import { createTRPCCaller } from "@/lib/server/trpc-caller";

export default async function VietnameseInsightsPage() {
    const caller = await createTRPCCaller();
    const graphData = await caller.learning.getLearnableGraph({
        languageCode: "vi",
        limit: 300,
    });

    return (
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 py-10">
            <header className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div className="space-y-3">
                    <p className="text-[11px] font-semibold tracking-[0.26em] text-slate-500 uppercase">Vietnamese Graph View</p>
                    <h1 className="text-foreground text-5xl font-[var(--font-display)] tracking-[-0.06em] sm:text-6xl">
                        The catalog as connective tissue.
                    </h1>
                    <p className="max-w-3xl text-base leading-7 text-slate-600">
                        Traverse vocabulary, grammar patterns, phrases, and utility words as one living map. Edges reflect explicit study
                        relationships; node size tracks how often each learnable has surfaced.
                    </p>
                </div>
                <div className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(59,130,246,0.08),rgba(16,185,129,0.08))] p-6">
                    <p className="text-sm leading-6 text-slate-700">
                        Click any node to open the full record, inspect examples, and move through neighboring concepts without dropping
                        back to list view.
                    </p>
                </div>
            </header>

            <GraphShell data={graphData} />
        </div>
    );
}
