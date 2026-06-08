import { AnnotatedLearningText } from "@/components/learning/annotated-vietnamese-text";
import { relativeTime } from "@/lib/format";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import Link from "next/link";

export default async function JapaneseToolPage() {
    const caller = await createTRPCCaller();
    const [learnables, workspaces] = await Promise.all([
        caller.learning.listLearnables({
            languageCode: "ja",
            limit: 100,
            sort: "frequency",
        }),
        caller.learning.listSentenceWorkspaces({
            languageCode: "ja",
            limit: 6,
        }),
    ]);

    const latestWorkspace = workspaces[0];

    return (
        <div className="plearn-page">
            <header className="max-w-4xl space-y-3">
                <p className="plearn-eyebrow">Japanese · Hub</p>
                <p className="text-[2rem] leading-[1.35] font-[var(--font-display)] tracking-[-0.02em] text-balance md:text-[2.3rem]">
                    {latestWorkspace?.summary ?? "Your latest Japanese sentence will live here once you decompose it."}
                </p>
                {latestWorkspace ? (
                    <p className="text-sm text-[color:var(--plearn-ink-4)]">
                        Last decomposition · {relativeTime(latestWorkspace.createdAt.toISOString())} ·{" "}
                        <Link href={`/tools/japanese/sentences/${latestWorkspace.id}`} className="text-primary no-underline">
                            revisit →
                        </Link>
                    </p>
                ) : null}
            </header>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { href: "/tools/japanese/analyze", label: "Analyze", detail: "Turn English thoughts into Japanese learning units." },
                    { href: "/tools/japanese/explain", label: "Explain", detail: "Break down Japanese you encountered." },
                    { href: "/tools/japanese/review", label: "Review", detail: "Run spaced repetition for saved items." },
                    { href: "/tools/japanese/catalog", label: "Catalog", detail: `${learnables.length} saved entries.` },
                ].map((item) => (
                    <Link key={item.href} href={item.href} className="plearn-panel hover:border-primary/60 p-5 transition-colors">
                        <p className="text-[1.35rem] font-[var(--font-display)] tracking-[-0.02em]">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--plearn-ink-3)]">{item.detail}</p>
                    </Link>
                ))}
            </section>

            {workspaces.length > 0 ? (
                <section className="mt-9 space-y-3">
                    <div className="plearn-divider-heading">
                        <span className="name">Recent Japanese work</span>
                        <span className="count">{workspaces.length}</span>
                    </div>
                    <div className="space-y-2">
                        {workspaces.map((workspace) => (
                            <Link
                                key={workspace.id}
                                href={`/tools/japanese/sentences/${workspace.id}`}
                                className="plearn-panel hover:border-primary/60 grid gap-3 px-4 py-3 transition-colors md:grid-cols-[90px_1fr_auto] md:items-center"
                            >
                                <span className="text-sm text-[color:var(--plearn-ink-4)]">
                                    {relativeTime(workspace.createdAt.toISOString())}
                                </span>
                                <span className="text-base font-[var(--font-display)]">
                                    <AnnotatedLearningText text={workspace.sourceText} languageCode="ja" />
                                </span>
                                <span className="justify-self-start rounded-full border border-[color:var(--border)] px-3 py-1 text-sm text-[color:var(--plearn-ink-3)] md:justify-self-end">
                                    Decomposition
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
