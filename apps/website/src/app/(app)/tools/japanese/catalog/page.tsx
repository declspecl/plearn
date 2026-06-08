import { LearnableBadge } from "@/components/learning/learnable-badge";
import { LearnableHoverText } from "@/components/learning/learnable-hover-text";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { learnableTypes, type LearnableType } from "@plearn/core/learning/model";
import Link from "next/link";

interface JapaneseCatalogPageProps {
    readonly searchParams: Promise<{
        q?: string;
        type?: string;
        sort?: "frequency" | "newest" | "last_seen" | "alphabetical";
    }>;
}

export default async function JapaneseCatalogPage({ searchParams }: JapaneseCatalogPageProps) {
    const params = await searchParams;
    const caller = await createTRPCCaller();
    const type: LearnableType[] | undefined =
        params.type && (learnableTypes as readonly string[]).includes(params.type) ? [params.type as LearnableType] : undefined;
    const learnables = await caller.learning.listLearnables({
        languageCode: "ja",
        query: params.q,
        types: type,
        sort: params.sort ?? "frequency",
        limit: 100,
    });

    return (
        <div className="plearn-page">
            <header className="mb-7 max-w-3xl">
                <p className="plearn-eyebrow">Japanese</p>
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Catalog</h1>
                <p className="mt-2 text-sm text-[color:var(--plearn-ink-3)]">
                    Search your Japanese catalog by exact wording, reading, notes, or English meaning.
                </p>
            </header>

            <form className="mb-8 flex max-w-2xl gap-2">
                <input
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder="Search Japanese, reading, or English..."
                    className="text-foreground min-h-11 flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] px-3 text-sm outline-none"
                />
                <button className="text-primary rounded-md border border-[color:var(--border)] px-4 text-sm" type="submit">
                    Search
                </button>
            </form>

            <section className="space-y-3">
                <div className="plearn-divider-heading">
                    <span className="name">Your catalog</span>
                    <span className="count">{learnables.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {learnables.map((learnable) => (
                        <Link
                            key={learnable.id}
                            href={`/tools/japanese/catalog/${learnable.id}`}
                            className="plearn-panel hover:border-primary/60 relative p-4 transition-colors"
                        >
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <LearnableBadge type={learnable.type} className="hidden sm:inline-flex" />
                                <span className="text-sm text-[color:var(--plearn-ink-4)]">{learnable.occurrenceCount}×</span>
                            </div>
                            <p className="text-[1.55rem] font-[var(--font-display)] tracking-[-0.02em]">
                                <LearnableHoverText
                                    languageCode="ja"
                                    hint={{
                                        text: learnable.canonicalText,
                                        translation: learnable.translation,
                                        type: learnable.type,
                                        notes: learnable.usageNotes,
                                        formula: learnable.patternTemplate,
                                        reading:
                                            typeof learnable.languageMetadata.reading === "string"
                                                ? learnable.languageMetadata.reading
                                                : undefined,
                                        baseForm:
                                            typeof learnable.languageMetadata.baseForm === "string"
                                                ? learnable.languageMetadata.baseForm
                                                : undefined,
                                        romanization:
                                            typeof learnable.languageMetadata.romanization === "string"
                                                ? learnable.languageMetadata.romanization
                                                : undefined,
                                        exampleHints: learnable.examples.slice(0, 2),
                                    }}
                                />
                            </p>
                            {typeof learnable.languageMetadata.reading === "string" ? (
                                <p className="mt-1 text-xs text-[color:var(--plearn-ink-4)]">{learnable.languageMetadata.reading}</p>
                            ) : null}
                            <p className="mt-1 pr-10 text-sm text-[color:var(--plearn-ink-3)]">{learnable.translation}</p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
