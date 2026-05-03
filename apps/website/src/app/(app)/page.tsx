import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

export default async function HomePage() {
    const caller = await createTRPCCaller();
    const [learnables, workspaces] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "vi",
            limit: 100,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "vi",
        }),
    ]);

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
            <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <Card className="border-border bg-accent overflow-hidden shadow-lg">
                    <CardHeader className="gap-4 pb-8">
                        <Badge variant="outline" className="w-fit">
                            Auth-Gated Learning Hub
                        </Badge>
                        <CardTitle className="text-foreground max-w-3xl text-5xl leading-none font-[var(--font-display)] tracking-[-0.06em] text-balance">
                            Build a private compendium of patterns, phrases, and Vietnamese intuition.
                        </CardTitle>
                        <CardDescription className="max-w-2xl text-base leading-7">
                            Plearn is now organized as a private tool deck. The first system turns your English inner monologue into
                            reusable Vietnamese learnables, ranks them by actual usage, and keeps a searchable memory of every sentence you
                            fed into it.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="border-border bg-card/35 flex flex-wrap items-center gap-3 border-t">
                        <Button render={<Link href="/tools/vietnamese/analyze" />}>Open Vietnamese Tool</Button>
                        <Button render={<Link href="/tools/vietnamese/catalog" />} variant="secondary">
                            Browse Catalog
                        </Button>
                    </CardFooter>
                </Card>

                <div className="grid gap-4">
                    {[
                        { label: "Learnables", value: learnables.length },
                        { label: "Sentence Workspaces", value: workspaces.length },
                        { label: "Top Type", value: learnables[0]?.type ?? "none yet" },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardHeader>
                                <CardDescription>{stat.label}</CardDescription>
                                <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.04em]">{stat.value}</CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Tool Deck</CardTitle>
                        <CardDescription>
                            Central routing for your personal learning systems. Vietnamese is the first live module.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-border bg-accent rounded-[1.5rem] border p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <Badge variant="secondary">Live</Badge>
                                    <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Vietnamese</p>
                                    <p className="text-muted-foreground max-w-lg text-sm leading-6">
                                        Sentence decomposition, review-first catalog capture, lexical search, and vector similarity.
                                    </p>
                                </div>
                                <div className="text-muted-foreground grid gap-2 text-right text-xs tracking-[0.2em] uppercase">
                                    <span>Analyze</span>
                                    <span>Catalog</span>
                                    <span>History</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-3">
                        <Button render={<Link href="/tools/vietnamese" />} size="sm">
                            Overview
                        </Button>
                        <Button render={<Link href="/tools/vietnamese/sentences" />} size="sm" variant="secondary">
                            Sentence History
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.04em]">Recent Catalog Pulse</CardTitle>
                        <CardDescription>
                            Highest-frequency learnables are the most reusable parts of your actual thought stream.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {learnables.slice(0, 5).map((learnable) => (
                            <Link
                                key={learnable.id}
                                className="border-border bg-muted hover:border-ring hover:bg-card flex items-center justify-between rounded-2xl border px-4 py-3 transition"
                                href={`/tools/vietnamese/catalog/${learnable.id}`}
                            >
                                <div>
                                    <p className="text-foreground font-medium">{learnable.canonicalText}</p>
                                    <p className="text-muted-foreground text-sm">{learnable.translation}</p>
                                </div>
                                <div className="text-muted-foreground text-right text-xs tracking-[0.18em] uppercase">
                                    <p>{learnable.type.replaceAll("_", " ")}</p>
                                    <p>{learnable.occurrenceCount}x</p>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
