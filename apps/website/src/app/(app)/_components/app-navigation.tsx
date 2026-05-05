"use client";

import { BookOpenText, ChartLineUp, House, ListMagnifyingGlass, Stack, Translate } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

export function AppNavigation() {
    const pathname = usePathname();
    const isVietnameseActive = pathname.startsWith("/tools/vietnamese");

    const globalLinks = [{ href: "/", label: "Tool deck", icon: House }];
    const languageLinks = [
        { href: "/tools/vietnamese", label: "Hub", match: pathname === "/tools/vietnamese", icon: House },
        { href: "/tools/vietnamese/analyze", label: "Analyze", match: pathname.includes("/analyze"), icon: ListMagnifyingGlass },
        { href: "/tools/vietnamese/explain", label: "Explain", match: pathname.includes("/explain"), icon: BookOpenText },
        { href: "/tools/vietnamese/catalog", label: "Catalog", match: pathname.includes("/catalog"), icon: Stack },
        { href: "/tools/vietnamese/sentences", label: "History", match: pathname.includes("/sentences"), icon: ListMagnifyingGlass },
        { href: "/tools/vietnamese/insights", label: "Insights", match: pathname.includes("/insights"), icon: ChartLineUp },
    ];

    return (
        <nav className="flex flex-col gap-4">
            <div className="space-y-1">
                {globalLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                            pathname === href
                                ? "text-foreground bg-[color:var(--plearn-bg-2)]"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                    >
                        <Icon weight={pathname === href ? "fill" : "duotone"} className="size-4" />
                        {label}
                    </Link>
                ))}
            </div>

            <div className="space-y-2">
                <div className="px-3">
                    <p className="text-xs text-[color:var(--plearn-ink-4)]">Language</p>
                </div>
                <div className="px-3 py-1">
                    <div className="flex items-center gap-3 text-sm text-[color:var(--plearn-ink-3)]">
                        <span className="text-primary/90 flex size-7 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)]">
                            <Translate className="size-3.5" weight="duotone" />
                        </span>
                        Vietnamese
                    </div>
                </div>
                <div className="ml-5 space-y-1 border-l border-[color:var(--plearn-line-soft)] pl-3">
                    {languageLinks.map(({ href, label, match, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                                match
                                    ? "text-foreground bg-[color:var(--plearn-bg-2)]"
                                    : isVietnameseActive
                                      ? "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                        >
                            <Icon weight={match ? "fill" : "duotone"} className="size-4" />
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
