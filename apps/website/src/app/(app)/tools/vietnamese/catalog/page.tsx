import { CatalogSearchForm } from "./_components/catalog-search-form";
import { LearnableBadge } from "@/components/learning/learnable-badge";
import { LearnableHoverText } from "@/components/learning/learnable-hover-text";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { learnableTypes, type LearnableType } from "@plearn/core/learning/model";
import Link from "next/link";
import { performance } from "node:perf_hooks";
import { Badge } from "~/components/ui/badge";

interface CatalogPageProps {
    readonly searchParams: Promise<{
        q?: string;
        semantic?: string;
        mode?: "match" | "meaning";
        type?: string;
        sort?: "frequency" | "newest" | "last_seen" | "alphabetical";
    }>;
}

export default async function VietnameseCatalogPage({ searchParams }: CatalogPageProps) {
    const startedAt = performance.now();
    const params = await searchParams;
    const caller = await createTRPCCaller();
    const mode = params.mode === "meaning" ? "meaning" : "match";
    const query = params.q ?? params.semantic;
    const type: LearnableType[] | undefined =
        params.type && (learnableTypes as readonly string[]).includes(params.type) ? [params.type as LearnableType] : undefined;

    const [learnables, semanticMatches] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            query: mode === "match" ? query : undefined,
            types: type,
            sort: params.sort ?? "frequency",
            limit: 50,
        }),
        mode === "meaning" && query
            ? caller.learning.semanticSearchLearnables({
                  languageCode: "vi",
                  query,
                  types: type,
                  limit: 12,
              })
            : Promise.resolve([]),
    ]);

    const displayedLearnables = mode === "meaning" ? semanticMatches.map((match) => match.learnable) : learnables;
    const groups: Array<{ key: LearnableType; title: string }> = [
        { key: "grammar_pattern", title: "Grammar patterns" },
        { key: "phrase", title: "Phrases" },
        { key: "vocabulary", title: "Vocabulary" },
        { key: "utility_word", title: "Utility" },
    ];

    const confidenceById = new Map(semanticMatches.map((match) => [match.learnable.id, match.confidence]));

    console.info("[PERF][PAGE] vietnamese.catalog", { elapsedMs: Math.round(performance.now() - startedAt) });

    return (
        <div className="plearn-page">
            <header className="mb-7 max-w-3xl">
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Catalog</h1>
                <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">
                    Search your Vietnamese compendium by exact wording or semantic meaning.
                </p>
            </header>

            <CatalogSearchForm />

            <section className="mt-9">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="text-[1.4rem] font-[var(--font-display)] tracking-[-0.02em]">
                        Your catalog
                        <span className="ml-3 text-sm text-[color:var(--plearn-ink-4)]">{displayedLearnables.length} entries</span>
                    </div>
                    <div className="text-sm text-[color:var(--plearn-ink-3)]">Sort: {params.sort ?? "frequency"}</div>
                </div>

                <div className="space-y-9">
                    {groups.map((group) => {
                        const items = displayedLearnables.filter((learnable) => learnable.type === group.key);
                        if (items.length === 0) return null;

                        return (
                            <section key={group.key}>
                                <div className="plearn-divider-heading mb-4">
                                    <span className="name">{group.title}</span>
                                    <span className="count">{items.length}</span>
                                </div>

                                {group.key === "grammar_pattern" ? (
                                    <div className="space-y-3">
                                        {items.map((learnable) => (
                                            <Link
                                                key={learnable.id}
                                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                                                className="plearn-panel hover:border-primary/60 grid gap-4 px-5 py-4 transition-colors md:grid-cols-[1fr_auto] md:items-baseline"
                                            >
                                                <div>
                                                    <p className="text-foreground text-[1.65rem] leading-[1.3] tracking-[-0.02em]">
                                                        <LearnableHoverText
                                                            hint={{
                                                                text: learnable.patternTemplate ?? learnable.canonicalText,
                                                                translation: learnable.translation,
                                                                type: learnable.type,
                                                                notes: learnable.usageNotes,
                                                                formula: learnable.patternTemplate,
                                                                exampleHints: learnable.examples.slice(0, 2),
                                                            }}
                                                        />
                                                    </p>
                                                    {learnable.patternTemplate && learnable.patternTemplate !== learnable.canonicalText ? (
                                                        <p className="mt-2 text-sm text-[color:var(--plearn-ink-4)]">
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
                                                        </p>
                                                    ) : null}
                                                    <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">{learnable.translation}</p>
                                                </div>
                                                <span className="text-sm text-[color:var(--plearn-ink-4)]">
                                                    {learnable.occurrenceCount}×
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : group.key === "phrase" ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {items.map((learnable) => (
                                            <Link
                                                key={learnable.id}
                                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                                                className="plearn-panel hover:border-primary/60 relative p-5 transition-colors"
                                            >
                                                <p className="text-[1.45rem] leading-[1.25] font-[var(--font-display)] tracking-[-0.02em]">
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
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--plearn-ink-3)]">{learnable.translation}</p>
                                                <p className="mt-3 border-t border-dashed border-[color:var(--border)] pt-3 text-sm leading-6 text-[color:var(--plearn-ink-4)]">
                                                    {learnable.usageNotes}
                                                </p>
                                                <span className="absolute right-4 bottom-4 text-sm text-[color:var(--plearn-ink-4)]">
                                                    {learnable.occurrenceCount}×
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {items.map((learnable) => (
                                            <Link
                                                key={learnable.id}
                                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                                                className="plearn-panel hover:border-primary/60 relative p-4 transition-colors"
                                            >
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <LearnableBadge type={learnable.type} className="hidden sm:inline-flex" />
                                                    {mode === "meaning" ? (
                                                        <Badge variant="secondary">
                                                            {Math.round((confidenceById.get(learnable.id) ?? 0) * 100)}%
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-[1.55rem] font-[var(--font-display)] tracking-[-0.02em]">
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
                                                </p>
                                                <p className="mt-1 pr-10 text-sm text-[color:var(--plearn-ink-3)]">
                                                    {learnable.translation}
                                                </p>
                                                <span className="absolute right-4 bottom-4 text-sm text-[color:var(--plearn-ink-4)]">
                                                    {learnable.occurrenceCount}×
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
