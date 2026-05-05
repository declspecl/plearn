"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

export function CatalogSearchForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
    const [semantic, setSemantic] = useState(searchParams.get("semantic") ?? "");

    const keywordDirty = keyword !== (searchParams.get("q") ?? "");
    const semanticDirty = semantic !== (searchParams.get("semantic") ?? "");
    const keywordLoading = keywordDirty || isPending;
    const semanticLoading = semanticDirty || isPending;

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (keyword) {
                params.set("q", keyword);
            } else {
                params.delete("q");
            }
            startTransition(() => {
                router.push(`?${params.toString()}`);
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (semantic) {
                params.set("semantic", semantic);
            } else {
                params.delete("semantic");
            }
            startTransition(() => {
                router.push(`?${params.toString()}`);
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [semantic]);

    return (
        <div className="flex flex-col gap-4">
            <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
                <label className="text-muted-foreground block text-sm font-medium">Keyword Search</label>
                <div className="relative">
                    <input
                        className="border-input bg-background w-full rounded-xl border px-4 py-3 pr-10 outline-none"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Search by phrase, translation, or notes"
                    />
                    {keywordLoading && <Spinner className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
                </div>
                <Button render={<Link href="/tools/vietnamese/catalog" />} type="button" variant="secondary" onClick={() => setKeyword("")}>
                    Reset
                </Button>
            </div>
            <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
                <label className="text-muted-foreground block text-sm font-medium">Semantic Search</label>
                <div className="relative">
                    <input
                        className="border-input bg-background w-full rounded-xl border px-4 py-3 pr-10 outline-none"
                        value={semantic}
                        onChange={(e) => setSemantic(e.target.value)}
                        placeholder="Find similar words by meaning or purpose"
                    />
                    {semanticLoading && <Spinner className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
                </div>
            </div>
        </div>
    );
}
