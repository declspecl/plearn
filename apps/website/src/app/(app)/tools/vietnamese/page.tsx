import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default async function VietnameseToolPage() {
    const caller = await createTRPCCaller();
    const [learnables, workspaces] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            limit: 5,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "vi",
        }),
    ]);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-border bg-accent">
                    <CardHeader>
                        <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">Vietnamese Workspace</CardTitle>
                        <CardDescription className="max-w-2xl text-base leading-7">
                            This tool is tuned for translating the English voice in your head into reusable Vietnamese patterns. Each saved
                            sentence contributes to a growing semantic catalog rather than disappearing after one session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        <Button render={<Link href="/tools/vietnamese/analyze" />}>Analyze Sentence</Button>
                        <Button render={<Link href="/tools/vietnamese/catalog" />} variant="secondary">
                            Open Catalog
                        </Button>
                        <Button render={<Link href="/tools/vietnamese/sentences" />} variant="secondary">
                            Sentence History
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardDescription>Catalog Size</CardDescription>
                            <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.04em]">{learnables.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Sentence Workspaces</CardDescription>
                            <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.04em]">{workspaces.length}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Most Frequent Learnables</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {learnables.map((learnable) => (
                            <Link
                                key={learnable.id}
                                className="border-border bg-muted flex items-center justify-between rounded-2xl border px-4 py-3"
                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                            >
                                <div>
                                    <p className="font-medium">{learnable.canonicalText}</p>
                                    <p className="text-muted-foreground text-sm">{learnable.translation}</p>
                                </div>
                                <span className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
                                    {learnable.occurrenceCount}x
                                </span>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Recent Sentences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {workspaces.slice(0, 5).map((workspace) => (
                            <Link
                                key={workspace.id}
                                className="border-border bg-muted block rounded-2xl border px-4 py-3"
                                href={`/tools/vietnamese/sentences/${workspace.id}`}
                            >
                                <p className="text-foreground line-clamp-2 font-medium">{workspace.sourceText}</p>
                                <p className="text-muted-foreground mt-1 text-sm">{workspace.summary ?? workspace.status}</p>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
