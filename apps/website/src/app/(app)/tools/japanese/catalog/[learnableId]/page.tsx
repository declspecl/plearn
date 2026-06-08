import { AnnotatedLearningText } from "@/components/learning/annotated-vietnamese-text";
import { LearnableBadge } from "@/components/learning/learnable-badge";
import { getServices } from "@/lib/server/clients";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { createLearnableId } from "@plearn/core/learning/model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface JapaneseLearnableDetailPageProps {
    readonly params: Promise<{
        learnableId: string;
    }>;
}

export default async function JapaneseLearnableDetailPage({ params }: JapaneseLearnableDetailPageProps) {
    const { learnableId } = await params;
    const caller = await createTRPCCaller();
    const services = getServices();
    const [learnable, occurrences] = await Promise.all([
        caller.learning.getLearnable({ learnableId }),
        services.learnableCatalogService.listOccurrences(createLearnableId(learnableId)),
    ]);

    if (!learnable || String(learnable.languageId) !== "ja") {
        notFound();
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <LearnableBadge type={learnable.type} />
                        <Badge variant="secondary">{learnable.occurrenceCount} occurrences</Badge>
                    </div>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">{learnable.canonicalText}</CardTitle>
                    {typeof learnable.languageMetadata.reading === "string" ? (
                        <CardDescription className="text-base">{learnable.languageMetadata.reading}</CardDescription>
                    ) : null}
                    <CardDescription className="text-lg">{learnable.translation}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm font-medium">Study Notes</p>
                        <p className="text-base leading-7">{learnable.usageNotes}</p>
                        {learnable.patternTemplate ? (
                            <div className="border-border bg-card rounded-2xl border p-4 text-base">{learnable.patternTemplate}</div>
                        ) : null}
                    </div>
                    <div className="border-border bg-card space-y-4 rounded-[1.75rem] border p-5">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Part Of Speech</p>
                            <p className="text-muted-foreground mt-2 text-sm">{learnable.partOfSpeech ?? "Not specified"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Forms</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {typeof learnable.languageMetadata.baseForm === "string" ? (
                                    <Badge>{learnable.languageMetadata.baseForm}</Badge>
                                ) : null}
                                {typeof learnable.languageMetadata.romanization === "string" ? (
                                    <Badge>{learnable.languageMetadata.romanization}</Badge>
                                ) : null}
                                {learnable.aliases.map((alias) => (
                                    <Badge key={alias}>{alias}</Badge>
                                ))}
                            </div>
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
                                    <AnnotatedLearningText text={example.exampleText} languageCode="ja" />
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
                                    href={`/tools/japanese/sentences/${occurrence.workspaceId}`}
                                >
                                    <AnnotatedLearningText text={occurrence.sourceSentenceText} languageCode="ja" />
                                </Link>
                                <p className="text-muted-foreground mt-1 text-sm">{occurrence.rationale ?? occurrence.sourceSpanText}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
