import { LearnableBadge } from "@/components/learning/learnable-badge";
import { getServices } from "@/lib/server/clients";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface LearnableDetailPageProps {
    readonly params: Promise<{
        learnableId: string;
    }>;
}

export default async function LearnableDetailPage({ params }: LearnableDetailPageProps) {
    const { learnableId } = await params;
    const caller = await createTRPCCaller();
    const services = getServices();
    const [learnable, related, occurrences] = await Promise.all([
        caller.learning.getLearnable({ learnableId }),
        caller.learning.getRelatedLearnables({ learnableId }),
        services.learnableCatalogService.listOccurrences(learnableId as any),
    ]);

    if (!learnable) {
        notFound();
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <LearnableBadge type={learnable.type} />
                        <Badge variant="secondary">{learnable.occurrenceCount} occurrences</Badge>
                    </div>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">{learnable.canonicalText}</CardTitle>
                    <CardDescription className="text-lg">{learnable.translation}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm font-medium">Study Notes</p>
                        <p className="text-base leading-7">{learnable.usageNotes}</p>
                        {learnable.patternTemplate ? (
                            <div className="border-border bg-card rounded-2xl border p-4 font-mono text-sm">
                                {learnable.patternTemplate}
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
                                <p className="text-foreground font-medium">{example.exampleText}</p>
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
                                    {occurrence.sourceSentenceText}
                                </Link>
                                <p className="text-muted-foreground mt-1 text-sm">{occurrence.rationale ?? occurrence.sourceSpanText}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {related.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Related Learnables</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {related.map((relation) => (
                            <div
                                key={relation.id}
                                className="border-border bg-muted text-muted-foreground rounded-2xl border px-4 py-3 text-sm"
                            >
                                {relation.relationType} · confidence {Math.round(relation.confidence * 100)}%
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
