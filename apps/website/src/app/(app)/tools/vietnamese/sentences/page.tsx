import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default async function SentenceHistoryPage() {
    const caller = await createTRPCCaller();
    const workspaces = await caller.learning.listSentenceWorkspaces({
        languageCode: "vi",
    });

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <CardTitle className="text-5xl font-[var(--font-display)] tracking-[-0.06em]">Sentence History</CardTitle>
                    <CardDescription>Every saved or in-progress sentence workspace remains inspectable and searchable.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4">
                {workspaces.map((workspace) => (
                    <Link key={workspace.id} href={`/tools/vietnamese/sentences/${workspace.id}`}>
                        <Card className="hover:border-ring transition hover:-translate-y-0.5">
                            <CardHeader>
                                <CardTitle className="text-xl">{workspace.sourceText}</CardTitle>
                                <CardDescription>{workspace.summary ?? workspace.status}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-muted-foreground text-sm">
                                {workspace.items.length} extracted learnables
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
