"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "~/components/ui/spinner";

export function CatalogSearchForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const currentMode = searchParams.get("mode") === "meaning" ? "meaning" : "match";
    const currentQuery = searchParams.get("q") ?? searchParams.get("semantic") ?? "";
    const [mode, setMode] = useState<"match" | "meaning">(currentMode);
    const [query, setQuery] = useState(currentQuery);
    const isLoading = isPending || query !== currentQuery || mode !== currentMode;

    useEffect(() => {
        setMode(currentMode);
        setQuery(currentQuery);
    }, [currentMode, currentQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (query) {
                params.set("q", query);
            } else {
                params.delete("q");
            }
            params.delete("semantic");
            params.set("mode", mode);
            const nextQueryString = params.toString();
            if (nextQueryString === searchParams.toString()) {
                return;
            }
            startTransition(() => {
                router.replace(`?${nextQueryString}`, { scroll: false });
            });
        }, 400);

        return () => clearTimeout(timer);
    }, [mode, query, router, searchParams]);

    return (
        <div className="plearn-panel flex items-stretch overflow-hidden">
            <div className="relative flex-1">
                <input
                    className="w-full bg-transparent px-4 py-4 pr-10 text-sm outline-none placeholder:text-[color:var(--plearn-ink-4)]"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search words, phrases, or meanings…"
                />
                {isLoading ? <Spinner className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" /> : null}
            </div>
            <div className="flex border-l border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] p-1">
                <button
                    className={
                        mode === "match"
                            ? "rounded-md bg-[color:var(--background)] px-3 py-2 text-sm"
                            : "px-3 py-2 text-sm text-[color:var(--plearn-ink-3)]"
                    }
                    onClick={() => setMode("match")}
                    type="button"
                >
                    Match
                </button>
                <button
                    className={
                        mode === "meaning"
                            ? "rounded-md bg-[color:var(--background)] px-3 py-2 text-sm"
                            : "px-3 py-2 text-sm text-[color:var(--plearn-ink-3)]"
                    }
                    onClick={() => setMode("meaning")}
                    type="button"
                >
                    Meaning
                </button>
            </div>
            {query ? (
                <Link
                    className="hidden items-center border-l border-[color:var(--border)] px-4 text-sm text-[color:var(--plearn-ink-3)] md:flex"
                    href="/tools/vietnamese/catalog"
                    onClick={() => setQuery("")}
                >
                    Reset
                </Link>
            ) : null}
        </div>
    );
}
