import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireSession } from "@/lib/server/session";
import { House, Translate } from "@phosphor-icons/react/dist/ssr";
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
                        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.26em] uppercase">Personal Learning Systems</p>
                    </div>

                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/"
                            className="hover:bg-accent hover:text-accent-foreground text-muted-foreground flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                        >
                            <House weight="duotone" className="size-5" />
                            Tool Desk
                        </Link>
                        <Link
                            href="/tools/vietnamese"
                            className="hover:bg-accent hover:text-accent-foreground text-muted-foreground flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                        >
                            <Translate weight="duotone" className="size-5" />
                            Vietnamese
                        </Link>
                    </nav>
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
