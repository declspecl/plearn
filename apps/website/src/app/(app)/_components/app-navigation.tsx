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
    const isJapaneseActive = pathname.startsWith("/tools/japanese");
    const reviewStatus = api.srs.getReviewStatus.useQuery(
        { languageCode: "vi" },
        {
            staleTime: 60_000,
        },
    );
    const japaneseReviewStatus = api.srs.getReviewStatus.useQuery({ languageCode: "ja" }, { staleTime: 60_000 });
    const dueCount = reviewStatus.data?.dueCount ?? 0;
    const japaneseDueCount = japaneseReviewStatus.data?.dueCount ?? 0;

    const globalLinks = [{ href: "/", label: "Tool deck", icon: House }];
    const languageLinks = [
        { href: "/tools/vietnamese", label: "Hub", match: pathname === "/tools/vietnamese", icon: House },
        {
            href: "/tools/vietnamese/review",
            label: "Review",
            match: pathname.startsWith("/tools/vietnamese/review"),
            icon: Cards,
            badge: dueCount,
        },
        { href: "/tools/vietnamese/practice", label: "Practice", match: pathname.startsWith("/tools/vietnamese/practice"), icon: Barbell },
        {
            href: "/tools/vietnamese/analyze",
            label: "Analyze",
            match: pathname.startsWith("/tools/vietnamese/analyze"),
            icon: ListMagnifyingGlass,
        },
        {
            href: "/tools/vietnamese/explain",
            label: "Explain",
            match: pathname.startsWith("/tools/vietnamese/explain"),
            icon: BookOpenText,
        },
        { href: "/tools/vietnamese/chat", label: "Chat", match: pathname.startsWith("/tools/vietnamese/chat"), icon: ChatsCircle },
        { href: "/tools/vietnamese/catalog", label: "Catalog", match: pathname.startsWith("/tools/vietnamese/catalog"), icon: Stack },
        {
            href: "/tools/vietnamese/sentences",
            label: "History",
            match: pathname.startsWith("/tools/vietnamese/sentences"),
            icon: ListMagnifyingGlass,
        },
        {
            href: "/tools/vietnamese/insights",
            label: "Insights",
            match: pathname.startsWith("/tools/vietnamese/insights"),
            icon: ChartLineUp,
        },
    ];
    const japaneseLinks = [
        { href: "/tools/japanese", label: "Hub", match: pathname === "/tools/japanese", icon: House },
        {
            href: "/tools/japanese/review",
            label: "Review",
            match: pathname.startsWith("/tools/japanese/review"),
            icon: Cards,
            badge: japaneseDueCount,
        },
        { href: "/tools/japanese/practice", label: "Practice", match: pathname.startsWith("/tools/japanese/practice"), icon: Barbell },
        {
            href: "/tools/japanese/analyze",
            label: "Analyze",
            match: pathname.startsWith("/tools/japanese/analyze"),
            icon: ListMagnifyingGlass,
        },
        { href: "/tools/japanese/explain", label: "Explain", match: pathname.startsWith("/tools/japanese/explain"), icon: BookOpenText },
        { href: "/tools/japanese/chat", label: "Chat", match: pathname.startsWith("/tools/japanese/chat"), icon: ChatsCircle },
        { href: "/tools/japanese/catalog", label: "Catalog", match: pathname.startsWith("/tools/japanese/catalog"), icon: Stack },
        {
            href: "/tools/japanese/sentences",
            label: "History",
            match: pathname.startsWith("/tools/japanese/sentences"),
            icon: ListMagnifyingGlass,
        },
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
                    <p className="text-xs text-[color:var(--plearn-ink-4)]">Languages</p>
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
                <div className="px-3 py-1">
                    <div className="flex items-center gap-3 text-sm text-[color:var(--plearn-ink-3)]">
                        <span className="text-primary/90 flex size-7 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)]">
                            <Translate className="size-3.5" weight="duotone" />
                        </span>
                        Japanese
                    </div>
                </div>
                <div className="ml-5 space-y-1 border-l border-[color:var(--plearn-line-soft)] pl-3">
                    {japaneseLinks.map(({ href, label, match, icon: Icon, badge }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                                match
                                    ? "text-foreground bg-[color:var(--plearn-bg-2)]"
                                    : isJapaneseActive
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
