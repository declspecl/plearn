import { ArtisanWorkbenchBanner } from "./_components/artisan-workbench-banner";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { ArrowRight, ChartLineUp, ListMagnifyingGlass, Stack } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default async function VietnameseToolPage() {
    const caller = await createTRPCCaller();
    const [learnables, workspaces] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            limit: 3,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "vi",
        }),
    ]);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:gap-12 md:px-8 md:py-12">
            {/* The Open-Air Header */}
            <header className="space-y-4">
                <h1 className="text-foreground text-4xl leading-tight font-[var(--font-display)] tracking-[-0.05em] md:text-5xl">
                    The Translator&apos;s Workbench
                </h1>
                <div className="text-muted-foreground flex items-center gap-3 font-mono text-xs">
                    <span>Catalog: {learnables.length} Items</span>
                    <span className="bg-border h-1 w-1 rounded-full" />
                    <span>Active Workspaces: {workspaces.length}</span>
                </div>
            </header>

            {/* Primary CTA */}
            <ArtisanWorkbenchBanner />

            {/* The Module Grid */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                {/* The Lexicon (Catalog) */}
                <Link
                    href="/tools/vietnamese/catalog"
                    className="group border-border bg-card hover:border-primary/30 relative flex flex-col gap-6 rounded-[2rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-8"
                >
                    <div className="bg-accent text-foreground group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 items-center justify-center rounded-2xl transition-colors">
                        <Stack weight="duotone" className="size-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">The Lexicon</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Your semantic catalog of vocabulary, grammar, and phrases extracted from inner monologues.
                        </p>
                    </div>
                    <div className="border-border border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">View Catalog</span>
                            <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </Link>

                {/* The Ledger (History) */}
                <Link
                    href="/tools/vietnamese/sentences"
                    className="group border-border bg-card hover:border-primary/30 relative flex flex-col gap-6 rounded-[2rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-8"
                >
                    <div className="bg-accent text-foreground group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 items-center justify-center rounded-2xl transition-colors">
                        <ListMagnifyingGlass weight="duotone" className="size-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">The Ledger</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            A chronological archive of your sentence workspaces and structural decompositions.
                        </p>
                    </div>
                    <div className="border-border border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">View History</span>
                            <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </Link>

                {/* The Pulse (Insights) */}
                <Link
                    href="/tools/vietnamese/insights"
                    className="group border-border bg-card hover:border-primary/30 relative flex flex-col gap-6 rounded-[2rem] border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-8"
                >
                    <div className="bg-accent text-foreground group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 items-center justify-center rounded-2xl transition-colors">
                        <ChartLineUp weight="duotone" className="size-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">The Pulse</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            System analytics, frequency charts, and trajectory of your learning progress.
                        </p>
                    </div>
                    <div className="border-border border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">View Insights</span>
                            <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </Link>
            </section>
        </div>
    );
}
