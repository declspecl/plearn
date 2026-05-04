import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { performance } from "node:perf_hooks";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

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

    const view = (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">The Ledger</CardTitle>
                    <CardDescription className="max-w-2xl text-base leading-7">
                        Your chronological archive of sentence workspaces. Every saved or in-progress sentence remains inspectable and
                        searchable.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="border-border bg-card max-w-2xl space-y-3 rounded-2xl border p-4" method="get">
                        <label className="text-muted-foreground block text-sm font-medium">Keyword Search</label>
                        <input
                            className="border-input bg-background focus:border-primary/50 focus:ring-primary/20 w-full rounded-xl border px-4 py-3 transition-all outline-none focus:ring-1"
                            defaultValue={params.q}
                            name="q"
                            placeholder="Search by Vietnamese sentence or English summary..."
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">Search</Button>
                            {params.q ? (
                                <Button render={<Link href="/tools/vietnamese/sentences" />} type="button" variant="secondary">
                                    Clear Filter
                                </Button>
                            ) : null}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Recent Workspaces</p>
                        <p className="text-muted-foreground text-sm">{workspaces.length} sentences matched.</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    {workspaces.map((workspace) => (
                        <Link key={workspace.id} href={`/tools/vietnamese/sentences/${workspace.id}`}>
                            <Card className="hover:border-ring border-l-primary/30 hover:border-l-primary border-l-4 transition hover:-translate-y-0.5">
                                <CardHeader>
                                    <CardTitle className="text-2xl font-[var(--font-display)] tracking-[-0.03em]">
                                        {workspace.sourceText}
                                    </CardTitle>
                                    <CardDescription className="text-base">{workspace.summary ?? workspace.status}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-muted-foreground font-mono text-sm">
                                    Workspace {workspace.id.slice(0, 8)}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );

    console.info("[PERF][PAGE] vietnamese.sentences", { elapsedMs: Math.round(performance.now() - startedAt) });
    return view;
}
