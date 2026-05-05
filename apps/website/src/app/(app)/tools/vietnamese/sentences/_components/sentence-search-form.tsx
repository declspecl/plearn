"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
    }, [keyword, router, searchParams]);

    return (
        <div className="plearn-panel max-w-2xl p-3">
            <div className="relative">
                <input
                    className="w-full bg-transparent px-2 py-2 pr-10 text-sm outline-none placeholder:text-[color:var(--plearn-ink-4)]"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Search by Vietnamese sentence or English summary..."
                />
                {isLoading ? <Spinner className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" /> : null}
            </div>
            {keyword ? (
                <Link
                    className="block px-2 pt-2 text-sm text-[color:var(--plearn-ink-3)]"
                    href="/tools/vietnamese/sentences"
                    onClick={() => setKeyword("")}
                >
                    Clear filter
                </Link>
            ) : null}
        </div>
    );
}
