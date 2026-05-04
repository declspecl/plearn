import { AppNavigation } from "./_components/app-navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/server/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
    const session = await requireSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
            <aside className="border-border bg-card/50 flex w-64 shrink-0 flex-col justify-between border-r backdrop-blur-md">
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
                            <p className="text-foreground font-medium">{session.user.name}</p>
                            <p className="truncate">{session.user.email}</p>
                        </div>
                        <SignOutButton />
                    </div>
                </div>
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
