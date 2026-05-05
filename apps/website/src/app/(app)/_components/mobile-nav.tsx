"use client";

import { AppSidebarContent } from "./app-sidebar-content";
import { SiteLogo } from "@/components/brand/site-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPopup, SheetTrigger } from "@/components/ui/sheet";
import { List } from "@phosphor-icons/react";

interface MobileNavProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export function MobileNav({ user }: MobileNavProps) {
    return (
        <header className="border-border bg-card/50 sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md md:hidden">
            <div className="flex items-center gap-3">
                <Sheet>
                    <SheetTrigger render={<Button variant="ghost" size="icon" className="-ml-2" />}>
                        <List weight="bold" className="size-5" />
                    </SheetTrigger>
                    <SheetPopup side="left" className="flex w-64 flex-col justify-between p-0" showCloseButton={false}>
                        <AppSidebarContent user={user} />
                    </SheetPopup>
                </Sheet>
                <SiteLogo variant="sm" priority />
            </div>
        </header>
    );
}
