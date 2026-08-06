"use client";

import { AppSidebarContent } from "./app-sidebar-content";
import { SiteLogo } from "@/components/brand/site-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPopup, SheetTrigger } from "@/components/ui/sheet";
import { DEFAULT_LANGUAGE, languageFromPathname } from "@/lib/languages";
import { ChartLineUp, House, List, ListMagnifyingGlass, Stack, Train } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

interface MobileNavProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export function MobileNav({ user }: MobileNavProps) {
    const pathname = usePathname();
    const routeLanguage = languageFromPathname(pathname);
    const showTabs = Boolean(routeLanguage);
    const baseHref = `/tools/${routeLanguage?.slug ?? DEFAULT_LANGUAGE.slug}`;
    const tabs =
        routeLanguage?.code === "ja"
            ? [
                  { href: baseHref, label: "Hub", icon: House, active: pathname === baseHref },
                  { href: `${baseHref}/transit`, label: "Transit", icon: Train, active: pathname.startsWith(`${baseHref}/transit`) },
                  {
                      href: `${baseHref}/analyze`,
                      label: "Analyze",
                      icon: ListMagnifyingGlass,
                      active: pathname.startsWith(`${baseHref}/analyze`),
                  },
                  {
                      href: `${baseHref}/sentences`,
                      label: "History",
                      icon: ListMagnifyingGlass,
                      active: pathname.startsWith(`${baseHref}/sentences`),
                  },
                  { href: `${baseHref}/review`, label: "Review", icon: ChartLineUp, active: pathname.startsWith(`${baseHref}/review`) },
              ]
            : [
                  { href: baseHref, label: "Hub", icon: House, active: pathname === baseHref },
                  {
                      href: `${baseHref}/analyze`,
                      label: "Analyze",
                      icon: ListMagnifyingGlass,
                      active: pathname.startsWith(`${baseHref}/analyze`),
                  },
                  { href: `${baseHref}/catalog`, label: "Catalog", icon: Stack, active: pathname.startsWith(`${baseHref}/catalog`) },
                  {
                      href: `${baseHref}/sentences`,
                      label: "History",
                      icon: ListMagnifyingGlass,
                      active: pathname.startsWith(`${baseHref}/sentences`),
                  },
                  { href: `${baseHref}/review`, label: "Review", icon: ChartLineUp, active: pathname.startsWith(`${baseHref}/review`) },
              ];

    return (
        <>
            <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--plearn-line-soft)] bg-black/20 px-4 backdrop-blur-md md:hidden">
                <div className="flex items-center gap-3">
                    <Sheet>
                        <SheetTrigger render={<Button variant="ghost" size="icon" className="-ml-2" />}>
                            <List weight="bold" className="size-5" />
                        </SheetTrigger>
                        <SheetPopup
                            side="left"
                            className="flex w-64 flex-col justify-between border-r border-[color:var(--plearn-line-soft)] bg-[color:var(--background)] p-0"
                            showCloseButton={false}
                        >
                            <AppSidebarContent user={user} />
                        </SheetPopup>
                    </Sheet>
                    <SiteLogo variant="sm" priority />
                </div>
            </header>

            {showTabs ? (
                <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-[color:var(--plearn-line-soft)] bg-[color:color-mix(in_oklch,var(--background)_95%,black)] md:hidden">
                    {tabs.map(({ href, label, icon: Icon, active }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-1 flex-col items-center gap-1 px-2 py-3 text-[10px]",
                                active ? "text-foreground" : "text-[color:var(--plearn-ink-4)]",
                            )}
                        >
                            <Icon weight={active ? "fill" : "duotone"} className="size-4" />
                            {label}
                        </Link>
                    ))}
                </nav>
            ) : null}
        </>
    );
}
