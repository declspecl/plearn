import { CatalogSearchForm } from "./_components/catalog-search-form";
import { LearnableBadge } from "@/components/learning/learnable-badge";
import { LearnableHoverText } from "@/components/learning/learnable-hover-text";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { learnableTypes, type LearnableType } from "@plearn/core/learning/model";
import Link from "next/link";
import { performance } from "node:perf_hooks";
import { Badge } from "~/components/ui/badge";
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
    const type: LearnableType[] | undefined =
        params.type && (learnableTypes as readonly string[]).includes(params.type) ? [params.type as LearnableType] : undefined;

    const [learnables, semanticMatches] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            query: params.q,
            types: type,
            sort: params.sort ?? "frequency",
            limit: 50,
        }),
        params.semantic
            ? caller.learning.semanticSearchLearnables({
                  languageCode: "vi",
                  query: params.semantic,
                  types: type,
                  limit: 12,
              })
            : Promise.resolve([]),
    ]);

    const view = (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.06em] md:text-5xl">Catalog</CardTitle>
                    <CardDescription className="max-w-3xl text-base leading-7">
                        Search your Vietnamese compendium by exact wording, English gloss, usage notes, or semantic neighborhood.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CatalogSearchForm />
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
                                        <CardTitle>
                                            <LearnableHoverText
                                                hint={{
                                                    text: match.learnable.canonicalText,
                                                    translation: match.learnable.translation,
                                                    type: match.learnable.type,
                                                    notes: match.learnable.usageNotes,
                                                    formula: match.learnable.patternTemplate,
                                                    exampleHints: match.learnable.examples.slice(0, 2),
                                                }}
                                            />
                                        </CardTitle>
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
                                        <LearnableHoverText
                                            hint={{
                                                text: learnable.canonicalText,
                                                translation: learnable.translation,
                                                type: learnable.type,
                                                notes: learnable.usageNotes,
                                                formula: learnable.patternTemplate,
                                                exampleHints: learnable.examples.slice(0, 2),
                                            }}
                                        />
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
