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
        <div className="bg-background text-foreground flex h-full min-h-full w-full flex-col overflow-hidden">
            <header className="border-border bg-card/70 border-b backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    <div className="space-y-1">
                        <Link className="text-3xl font-[var(--font-display)] tracking-[-0.05em]" href="/">
                            Plearn
                        </Link>
                        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.26em] uppercase">Personal Learning Systems</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-muted-foreground text-right text-sm">
                            <p className="text-foreground font-medium">{session.user.name}</p>
                            <p>{session.user.email}</p>
                        </div>
                        <SignOutButton />
                    </div>
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
