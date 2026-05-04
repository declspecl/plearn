"use client";

import type { GraphNode } from "./graph-types";
import { LearnableBadge } from "@/components/learning/learnable-badge";
import { api } from "@plearn/trpc/client/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "~/components/ui/sheet";

export function GraphSidebar({
    node,
    onClose,
    onExploreNeighbors,
}: {
    readonly node?: GraphNode;
    readonly onClose: () => void;
    readonly onExploreNeighbors: (nodeId: string) => void;
}) {
    const learnableQuery = api.learning.getLearnable.useQuery(
        { learnableId: node?.id ?? "" },
        { enabled: node !== undefined, staleTime: 60_000 },
    );
    const learnable = learnableQuery.data;

    return (
        <Sheet onOpenChange={(open) => !open && onClose()} open={node !== undefined}>
            <SheetContent className="bg-[#fffdf8]" side="right" variant="inset">
                <SheetHeader className="gap-3">
                    {node ? <LearnableBadge type={node.type} /> : null}
                    <SheetTitle className="text-3xl font-[var(--font-display)] tracking-[-0.05em]">
                        {learnable?.canonicalText ?? node?.canonicalText ?? "Learnable"}
                    </SheetTitle>
                    <SheetDescription className="text-base text-slate-600">
                        {learnable?.translation ?? node?.translation ?? "Loading detail"}
                    </SheetDescription>
                </SheetHeader>
                <SheetPanel className="space-y-6">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Occurrences</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {learnable?.occurrenceCount ?? node?.occurrenceCount ?? 0}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Usage Notes</p>
                        <p className="text-sm leading-6 text-slate-700">
                            {learnableQuery.isLoading ? "Loading full notes…" : (learnable?.usageNotes ?? "No notes yet.")}
                        </p>
                    </div>

                    {learnable?.aliases.length ? (
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Aliases</p>
                            <div className="flex flex-wrap gap-2">
                                {learnable.aliases.map((alias) => (
                                    <span
                                        key={alias}
                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                                    >
                                        {alias}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Examples</p>
                        <div className="space-y-3">
                            {(learnable?.examples ?? []).slice(0, 4).map((example) => (
                                <div key={example.id} className="rounded-[1.4rem] border border-slate-200 bg-white/80 p-4">
                                    <p className="text-sm font-medium text-slate-900">{example.exampleText}</p>
                                    <p className="mt-1 text-sm text-slate-600">{example.translation}</p>
                                </div>
                            ))}
                            {!learnableQuery.isLoading && (learnable?.examples.length ?? 0) === 0 ? (
                                <p className="text-sm text-slate-500">No examples saved for this learnable yet.</p>
                            ) : null}
                        </div>
                    </div>

                    {node ? (
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => onExploreNeighbors(node.id)} variant="outline">
                                Explore Neighbors
                            </Button>
                            <Button render={<Link href={`/tools/vietnamese/catalog/${node.id}`} />} variant="default">
                                View In Catalog
                            </Button>
                        </div>
                    ) : null}
                </SheetPanel>
            </SheetContent>
        </Sheet>
    );
}
