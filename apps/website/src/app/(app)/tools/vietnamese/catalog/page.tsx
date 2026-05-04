import { LearnableBadge } from "@/components/learning/learnable-badge";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { performance } from "node:perf_hooks";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface CatalogPageProps {
    readonly searchParams: Promise<{
        q?: string;
        semantic?: string;
        type?: string;
        sort?: "frequency" | "newest" | "last_seen" | "alphabetical";
    }>;
}

export default async function VietnameseCatalogPage({ searchParams }: CatalogPageProps) {
    const startedAt = performance.now();
    const params = await searchParams;
    const caller = await createTRPCCaller();
    const type =
        params.type && ["grammar_pattern", "vocabulary", "utility_word", "phrase"].includes(params.type) ? [params.type] : undefined;

    const [learnables, semanticMatches] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            query: params.q,
            types: type as any,
            sort: params.sort ?? "frequency",
            limit: 50,
        }),
        params.semantic
            ? caller.learning.semanticSearchLearnables({
                  languageCode: "vi",
                  query: params.semantic,
                  types: type as any,
                  limit: 12,
              })
            : Promise.resolve([]),
    ]);

    const view = (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">Catalog</CardTitle>
                    <CardDescription className="max-w-3xl text-base leading-7">
                        Search your Vietnamese compendium by exact wording, English gloss, usage notes, or semantic neighborhood.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                    <form className="border-border bg-card space-y-3 rounded-2xl border p-4" method="get">
                        <label className="text-muted-foreground block text-sm font-medium">Keyword Search</label>
                        <input
                            className="border-input bg-background w-full rounded-xl border px-4 py-3 outline-none"
                            defaultValue={params.q}
                            name="q"
                            placeholder="Search by phrase, translation, or notes"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">Search</Button>
                            <Button render={<Link href="/tools/vietnamese/catalog" />} type="button" variant="secondary">
                                Reset
                            </Button>
                        </div>
                    </form>
                    <form className="border-border bg-card space-y-3 rounded-2xl border p-4" method="get">
                        <label className="text-muted-foreground block text-sm font-medium">Semantic Search</label>
                        <input
                            className="border-input bg-background w-full rounded-xl border px-4 py-3 outline-none"
                            defaultValue={params.semantic}
                            name="semantic"
                            placeholder="Find similar words by meaning or purpose"
                        />
                        <Button type="submit" variant="secondary">
                            Find Similar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {semanticMatches.length > 0 ? (
                <section className="space-y-4">
                    <div>
                        <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Semantic Matches</p>
                        <p className="text-muted-foreground text-sm">Vector similarity over the canonical learning records.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {semanticMatches.map((match) => (
                            <Link key={match.learnable.id} href={`/tools/vietnamese/catalog/${match.learnable.id}`}>
                                <Card className="hover:border-ring h-full transition hover:-translate-y-0.5">
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <LearnableBadge type={match.learnable.type} />
                                            <span className="text-muted-foreground text-xs">{Math.round(match.confidence * 100)}%</span>
                                        </div>
                                        <CardTitle>{match.learnable.canonicalText}</CardTitle>
                                        <CardDescription>{match.learnable.translation}</CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}

            <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Lexical Search</p>
                        <p className="text-muted-foreground text-sm">{learnables.length} results returned from the current filter set.</p>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {learnables.map((learnable) => (
                        <Link key={learnable.id} href={`/tools/vietnamese/catalog/${learnable.id}`}>
                            <Card className="hover:border-ring h-full transition hover:-translate-y-0.5">
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <LearnableBadge type={learnable.type} />
                                        </div>
                                        <Badge variant="secondary">{learnable.occurrenceCount}x</Badge>
                                    </div>
                                    <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">
                                        {learnable.canonicalText}
                                    </CardTitle>
                                    <CardDescription>{learnable.translation}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-muted-foreground space-y-3 text-sm">
                                    <p className="line-clamp-3">{learnable.usageNotes}</p>
                                    {learnable.patternTemplate ? (
                                        <div className="border-border bg-muted rounded-xl border px-3 py-2 font-mono text-xs">
                                            {learnable.patternTemplate}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );

    console.info("[PERF][PAGE] vietnamese.catalog", { elapsedMs: Math.round(performance.now() - startedAt) });
    return view;
}
