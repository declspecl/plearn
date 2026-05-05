import { AnnotatedVietnameseText } from "@/components/learning/annotated-vietnamese-text";
import { LearnableBadge } from "@/components/learning/learnable-badge";
import { LearnableHoverText } from "@/components/learning/learnable-hover-text";
import { getServices } from "@/lib/server/clients";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { createLearnableId } from "@plearn/core/learning/model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { performance } from "node:perf_hooks";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface LearnableDetailPageProps {
    readonly params: Promise<{
        learnableId: string;
    }>;
}

export default async function LearnableDetailPage({ params }: LearnableDetailPageProps) {
    const startedAt = performance.now();
    const { learnableId } = await params;
    const caller = await createTRPCCaller();
    const services = getServices();
    const [learnable, related, backlinks, occurrences] = await Promise.all([
        caller.learning.getLearnable({ learnableId }),
        caller.learning.getRelatedLearnables({ learnableId }),
        caller.learning.getLearnableBacklinks({ learnableId }),
        services.learnableCatalogService.listOccurrences(createLearnableId(learnableId)),
    ]);

    if (!learnable) {
        notFound();
    }

    const componentRelations = related.filter((r) => r.relationType === "contains_component");
    const otherRelated = related.filter((r) => r.relationType !== "contains_component");

    const allRelatedIds = [...related.map((r) => r.toLearnableId), ...backlinks.map((b) => b.fromLearnableId)];
    const relatedLearnablePromises = await Promise.all(
        [...new Set(allRelatedIds)].map((id) => services.learnableCatalogService.getLearnable(id)),
    );
    const relatedLearnables = relatedLearnablePromises.filter(Boolean) as NonNullable<(typeof relatedLearnablePromises)[number]>[];
    const relatedLearnableById = new Map(relatedLearnables.map((entry) => [entry.id, entry] as const));

    const view = (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <LearnableBadge type={learnable.type} />
                        <Badge variant="secondary">{learnable.occurrenceCount} occurrences</Badge>
                    </div>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">
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
                    <CardDescription className="text-lg">{learnable.translation}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm font-medium">Study Notes</p>
                        <p className="text-base leading-7">{learnable.usageNotes}</p>
                        {learnable.patternTemplate ? (
                            <div className="border-border bg-card rounded-2xl border p-4 text-base">
                                <LearnableHoverText
                                    hint={{
                                        text: learnable.patternTemplate,
                                        translation: learnable.translation,
                                        type: learnable.type,
                                        notes: learnable.usageNotes,
                                        formula: learnable.patternTemplate,
                                        exampleHints: learnable.examples.slice(0, 2),
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>
                    <div className="border-border bg-card space-y-4 rounded-[1.75rem] border p-5">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Aliases</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {learnable.aliases.length > 0 ? (
                                    learnable.aliases.map((alias) => <Badge key={alias}>{alias}</Badge>)
                                ) : (
                                    <span>None</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Part Of Speech</p>
                            <p className="text-muted-foreground mt-2 text-sm">{learnable.partOfSpeech ?? "Not specified"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <section className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Examples</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {learnable.examples.map((example) => (
                            <div key={example.id} className="border-border bg-muted rounded-2xl border px-4 py-3">
                                <p className="text-foreground font-medium">
                                    <AnnotatedVietnameseText text={example.exampleText} />
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">{example.translation}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Occurrence Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {occurrences.map((occurrence) => (
                            <div key={occurrence.id} className="border-border bg-muted rounded-2xl border px-4 py-3">
                                <Link
                                    className="text-foreground font-medium underline-offset-4 hover:underline"
                                    href={`/tools/vietnamese/sentences/${occurrence.workspaceId}`}
                                >
                                    <AnnotatedVietnameseText text={occurrence.sourceSentenceText} />
                                </Link>
                                <p className="text-muted-foreground mt-1 text-sm">{occurrence.rationale ?? occurrence.sourceSpanText}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {componentRelations.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Components</CardTitle>
                        <CardDescription>Individual parts that make up this expression.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {componentRelations.map((relation) => {
                            const target = relatedLearnableById.get(relation.toLearnableId);
                            if (!target) return null;

                            return (
                                <Link
                                    key={relation.id}
                                    className="border-border bg-muted hover:bg-muted/70 block rounded-2xl border px-4 py-3 transition-colors"
                                    href={`/tools/vietnamese/catalog/${target.id}`}
                                >
                                    <LearnableBadge type={target.type} />
                                    <p className="text-foreground mt-2 font-medium">{target.canonicalText}</p>
                                    <p className="text-muted-foreground mt-1 text-sm">{target.translation}</p>
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : null}

            {backlinks.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Also Seen In</CardTitle>
                        <CardDescription>Larger expressions that contain this word or phrase.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {backlinks.map((backlink) => {
                            const source = relatedLearnableById.get(backlink.fromLearnableId);
                            if (!source) return null;

                            return (
                                <Link
                                    key={backlink.id}
                                    className="border-border bg-muted hover:bg-muted/70 block rounded-2xl border px-4 py-3 transition-colors"
                                    href={`/tools/vietnamese/catalog/${source.id}`}
                                >
                                    <LearnableBadge type={source.type} />
                                    <p className="text-foreground mt-2 font-medium">{source.canonicalText}</p>
                                    <p className="text-muted-foreground mt-1 text-sm">{source.translation}</p>
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : null}

            {otherRelated.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Related Learnables</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {otherRelated.map((relation) => {
                            const target = relatedLearnableById.get(relation.toLearnableId);

                            if (!target) {
                                return null;
                            }

                            return (
                                <Link
                                    key={relation.id}
                                    className="border-border bg-muted hover:bg-muted/70 block rounded-2xl border px-4 py-3 transition-colors"
                                    href={`/tools/vietnamese/catalog/${target.id}`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <LearnableBadge type={target.type} />
                                        <span className="text-muted-foreground text-xs font-medium">
                                            {relation.relationType.replaceAll("_", " ")} · {Math.round(relation.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-foreground mt-2 font-medium">{target.canonicalText}</p>
                                    <p className="text-muted-foreground mt-1 text-sm">{target.translation}</p>
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );

    console.info("[PERF][PAGE] vietnamese.learnableDetail", {
        learnableId,
        elapsedMs: Math.round(performance.now() - startedAt),
    });

    return view;
}
