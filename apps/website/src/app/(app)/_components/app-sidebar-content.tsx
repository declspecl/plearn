import { AppNavigation } from "./app-navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteLogo } from "@/components/brand/site-logo";

interface AppSidebarContentProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export function AppSidebarContent({ user }: AppSidebarContentProps) {
    const initials =
        user.name
            ?.split(" ")
            .map((chunk) => chunk[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() ?? "PL";

    return (
        <>
            <div className="flex flex-col gap-6 px-3 py-4">
                <div className="border-b border-[color:var(--plearn-line-soft)] px-3 pb-4">
                    <div className="flex items-center gap-3">
                        <SiteLogo variant="md" priority />
                        <span className="text-foreground text-[1.5rem] font-[var(--font-display)] tracking-[-0.03em]">Plearn</span>
                    </div>
                </div>

                <AppNavigation />
            </div>

            <div className="border-t border-[color:var(--plearn-line-soft)] p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] text-sm">
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm">{user.name}</p>
                        <p className="truncate text-xs text-[color:var(--plearn-ink-4)]">{user.email}</p>
                    </div>
                    <SignOutButton />
                </div>
            </div>
        </>
    );
}
