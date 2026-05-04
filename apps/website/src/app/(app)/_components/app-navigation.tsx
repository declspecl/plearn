"use client";

import { CaretDown, ChartLineUp, House, ListMagnifyingGlass, Stack, Translate } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "~/lib/utils";

export function AppNavigation() {
    const pathname = usePathname();
    const isVietnameseActive = pathname.startsWith("/tools/vietnamese");
    const [vietnameseOpen, setVietnameseOpen] = useState(isVietnameseActive);

    return (
        <nav className="flex flex-col gap-2">
            <Link
                href="/"
                className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
            >
                <House weight={pathname === "/" ? "fill" : "duotone"} className="size-5" />
                Tool Desk
            </Link>

            <div className="flex flex-col gap-1">
                <button
                    onClick={() => setVietnameseOpen(!vietnameseOpen)}
                    className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        isVietnameseActive && !vietnameseOpen
                            ? "bg-primary/5 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Translate weight="duotone" className="size-5" />
                        Vietnamese
                    </div>
                    <CaretDown
                        weight="bold"
                        className={cn("size-3.5 transition-transform duration-200", vietnameseOpen ? "rotate-180" : "")}
                    />
                </button>

                <div
                    className={cn(
                        "grid transition-all duration-300 ease-in-out",
                        vietnameseOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                >
                    <div className="overflow-hidden">
                        <div className="border-border/50 mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
                            <Link
                                href="/tools/vietnamese"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    pathname === "/tools/vietnamese"
                                        ? "bg-accent text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <House weight="duotone" className="size-4" />
                                Hub
                            </Link>
                            <Link
                                href="/tools/vietnamese/analyze"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    pathname.includes("/analyze")
                                        ? "bg-accent text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <ListMagnifyingGlass weight="duotone" className="size-4" />
                                Analyze
                            </Link>
                            <Link
                                href="/tools/vietnamese/catalog"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    pathname.includes("/catalog")
                                        ? "bg-accent text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <Stack weight="duotone" className="size-4" />
                                Catalog
                            </Link>
                            <Link
                                href="/tools/vietnamese/sentences"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    pathname.includes("/sentences")
                                        ? "bg-accent text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <ListMagnifyingGlass weight="duotone" className="size-4" />
                                History
                            </Link>
                            <Link
                                href="/tools/vietnamese/insights"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    pathname.includes("/insights")
                                        ? "bg-accent text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                                )}
                            >
                                <ChartLineUp weight="duotone" className="size-4" />
                                Insights
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
