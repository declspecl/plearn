import { AppNavigation } from "./app-navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";

interface AppSidebarContentProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export function AppSidebarContent({ user }: AppSidebarContentProps) {
    return (
        <>
            <div className="flex flex-col gap-8 p-6">
                <div className="space-y-1">
                    <Link className="text-3xl font-[var(--font-display)] tracking-[-0.05em]" href="/">
                        Plearn
                    </Link>
                    <p className="text-muted-foreground font-mono text-[11px]">Personal Learning Systems</p>
                </div>

                <AppNavigation />
            </div>

            <div className="border-border border-t p-6">
                <div className="flex flex-col gap-4">
                    <div className="text-muted-foreground text-sm">
                        <p className="text-foreground font-medium">{user.name}</p>
                        <p className="truncate">{user.email}</p>
                    </div>
                    <SignOutButton />
                </div>
            </div>
        </>
    );
}
