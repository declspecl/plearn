"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

export function SentenceSearchForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");

    const isLoading = keyword !== (searchParams.get("q") ?? "") || isPending;

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

    return (
        <div className="border-border bg-card max-w-2xl space-y-3 rounded-2xl border p-4">
            <label className="text-muted-foreground block text-sm font-medium">Keyword Search</label>
            <div className="relative">
                <input
                    className="border-input bg-background focus:border-primary/50 focus:ring-primary/20 w-full rounded-xl border px-4 py-3 pr-10 transition-all outline-none focus:ring-1"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search by Vietnamese sentence or English summary..."
                />
                {isLoading && <Spinner className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
            </div>
            {keyword ? (
                <Button
                    render={<Link href="/tools/vietnamese/sentences" />}
                    type="button"
                    variant="secondary"
                    onClick={() => setKeyword("")}
                >
                    Clear Filter
                </Button>
            ) : null}
        </div>
    );
}
