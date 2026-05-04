import { GraphShell } from "@/components/learning/graph/graph-shell";
import { createTRPCCaller } from "@/lib/server/trpc-caller";

export default async function VietnameseInsightsPage() {
    const caller = await createTRPCCaller();
    const graphData = await caller.learning.getLearnableGraph({
        languageCode: "vi",
        limit: 300,
    });

    return (
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <header className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div className="space-y-3">
                    <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.26em] uppercase">Vietnamese Graph View</p>
                    <h1 className="text-foreground text-5xl font-[var(--font-display)] tracking-[-0.06em] sm:text-6xl">
                        The catalog as connective tissue.
                    </h1>
                    <p className="text-muted-foreground max-w-3xl text-base leading-7">
                        Traverse vocabulary, grammar patterns, phrases, and utility words as one living map. Edges blend explicit relations,
                        shared sentence co-occurrence, repeated pattern families, and semantic similarity; node size tracks how often each
                        learnable has surfaced.
                    </p>
                </div>
                <div className="bg-card/80 border-border rounded-[2rem] border p-6 backdrop-blur">
                    <p className="text-muted-foreground text-sm leading-6">
                        Click any node to open the full record, inspect examples, and move through neighboring concepts without dropping
                        back to list view.
                    </p>
                </div>
            </header>

            <GraphShell data={graphData} />
        </div>
    );
}
