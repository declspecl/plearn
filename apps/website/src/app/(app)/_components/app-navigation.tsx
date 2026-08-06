"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    DEFAULT_LANGUAGE,
    LANGUAGES,
    TOOLS,
    type LanguageConfig,
    type ToolKey,
    languageBySlug,
    languageFromPathname,
    toolHref,
    toolSegmentFromPathname,
} from "@/lib/languages";
import {
    Barbell,
    BookOpenText,
    Cards,
    ChartLineUp,
    CaretUpDown,
    ChatsCircle,
    Check,
    House,
    ListMagnifyingGlass,
    Stack,
    Train,
} from "@phosphor-icons/react";
import { api } from "@plearn/trpc/client/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

const STORAGE_KEY = "plearn:active-language";

const TOOL_ICONS: Record<ToolKey, React.ComponentType<{ className?: string; weight?: "fill" | "duotone" }>> = {
    hub: House,
    review: Cards,
    practice: Barbell,
    analyze: ListMagnifyingGlass,
    explain: BookOpenText,
    transit: Train,
    chat: ChatsCircle,
    catalog: Stack,
    history: ListMagnifyingGlass,
    insights: ChartLineUp,
};

export function AppNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const routeLanguage = languageFromPathname(pathname);
    const routeSlug = routeLanguage?.slug ?? null;

    // The sidebar shows exactly one language at a time. On a `/tools/{lang}`
    // route that's the route's language; on the tool deck (or anywhere else) we
    // fall back to the last language the user worked in.
    const [selectedSlug, setSelectedSlug] = useState(routeSlug ?? DEFAULT_LANGUAGE.slug);

    // Keep selection in sync with the route and remember it for next time.
    useEffect(() => {
        if (routeSlug) {
            setSelectedSlug(routeSlug);
            globalThis.localStorage.setItem(STORAGE_KEY, routeSlug);
        }
    }, [routeSlug]);

    // On first mount off the language routes, restore the last-used language.
    useEffect(() => {
        if (routeSlug) {
            return;
        }

        const stored = globalThis.localStorage.getItem(STORAGE_KEY);

        if (stored && languageBySlug(stored)) {
            setSelectedSlug(stored);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restore only on first mount
    }, []);

    const activeLanguage = languageBySlug(selectedSlug) ?? DEFAULT_LANGUAGE;

    const reviewStatus = api.srs.getReviewStatus.useQuery({ languageCode: activeLanguage.code }, { staleTime: 60_000 });
    const dueCount = reviewStatus.data?.dueCount ?? 0;

    function switchLanguage(language: LanguageConfig) {
        setSelectedSlug(language.slug);
        globalThis.localStorage.setItem(STORAGE_KEY, language.slug);

        // Carry the user to the same tool in the new language when it exists,
        // otherwise drop them on that language's hub.
        const segment = routeLanguage ? toolSegmentFromPathname(pathname) : "";
        const matchedTool = language.tools.find((key) => TOOLS[key].segment === segment);

        router.push(toolHref(language.slug, matchedTool ? TOOLS[matchedTool].segment : ""));
    }

    return (
        <nav className="flex flex-col gap-4">
            <div className="space-y-1">
                <Link
                    href="/"
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                        pathname === "/"
                            ? "text-foreground bg-[color:var(--plearn-bg-2)]"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                >
                    <House weight={pathname === "/" ? "fill" : "duotone"} className="size-4" />
                    Tool deck
                </Link>
            </div>

            <div className="space-y-2">
                <div className="px-3">
                    <p className="text-xs text-[color:var(--plearn-ink-4)]">Language</p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                            "hover:bg-accent hover:text-foreground text-[color:var(--plearn-ink-3)]",
                        )}
                    >
                        <span className="flex size-7 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] text-sm leading-none">
                            {activeLanguage.flag}
                        </span>
                        <span className="min-w-0 flex-1 text-left">{activeLanguage.label}</span>
                        <CaretUpDown className="size-4 text-[color:var(--plearn-ink-4)]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px]">
                        {LANGUAGES.map((language) => (
                            <DropdownMenuItem
                                key={language.slug}
                                onClick={() => switchLanguage(language)}
                                className="flex items-center gap-2"
                            >
                                <span className="text-base leading-none">{language.flag}</span>
                                <span className="flex-1">{language.label}</span>
                                {language.slug === activeLanguage.slug ? <Check className="size-4" weight="bold" /> : null}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="ml-5 space-y-1 border-l border-[color:var(--plearn-line-soft)] pl-3">
                    {activeLanguage.tools.map((key) => {
                        const tool = TOOLS[key];
                        const href = toolHref(activeLanguage.slug, tool.segment);
                        const match = tool.segment === "" ? pathname === href : pathname.startsWith(href);
                        const Icon = TOOL_ICONS[key];
                        const badge = key === "review" ? dueCount : 0;

                        return (
                            <Link
                                key={key}
                                href={href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                                    match
                                        ? "text-foreground bg-[color:var(--plearn-bg-2)]"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                            >
                                <Icon weight={match ? "fill" : "duotone"} className="size-4" />
                                <span className="min-w-0 flex-1">{tool.label}</span>
                                {badge > 0 ? (
                                    <span className="bg-primary/90 text-primary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none">
                                        {badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
