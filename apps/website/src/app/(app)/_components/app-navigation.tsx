"use client";

import {
    Barbell,
    BookOpenText,
    Cards,
    ChartLineUp,
    ChatsCircle,
    House,
    ListMagnifyingGlass,
    Stack,
    Translate,
} from "@phosphor-icons/react";
import { api } from "@plearn/trpc/client/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

export function AppNavigation() {
    const pathname = usePathname();
    const isVietnameseActive = pathname.startsWith("/tools/vietnamese");
    const reviewStatus = api.srs.getReviewStatus.useQuery(undefined, {
        staleTime: 60_000,
    });
    const dueCount = reviewStatus.data?.dueCount ?? 0;

    const globalLinks = [{ href: "/", label: "Tool deck", icon: House }];
    const languageLinks = [
        { href: "/tools/vietnamese", label: "Hub", match: pathname === "/tools/vietnamese", icon: House },
        { href: "/tools/vietnamese/review", label: "Review", match: pathname.includes("/review"), icon: Cards, badge: dueCount },
        { href: "/tools/vietnamese/practice", label: "Practice", match: pathname.includes("/practice"), icon: Barbell },
        { href: "/tools/vietnamese/analyze", label: "Analyze", match: pathname.includes("/analyze"), icon: ListMagnifyingGlass },
        { href: "/tools/vietnamese/explain", label: "Explain", match: pathname.includes("/explain"), icon: BookOpenText },
        { href: "/tools/vietnamese/chat", label: "Chat", match: pathname.includes("/chat"), icon: ChatsCircle },
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
                    {languageLinks.map(({ href, label, match, icon: Icon, badge }) => (
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
                            <span className="min-w-0 flex-1">{label}</span>
                            {badge && badge > 0 ? (
                                <span className="bg-primary/90 text-primary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none">
                                    {badge}
                                </span>
                            ) : null}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
