import { AppSidebarContent } from "./_components/app-sidebar-content";
import { MobileNav } from "./_components/mobile-nav";
import { requireSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
    const session = await requireSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="plearn-shell bg-background text-foreground flex h-screen w-full flex-col overflow-hidden md:flex-row">
            <MobileNav user={session.user} />
            <aside className="hidden w-[220px] shrink-0 border-r border-[color:var(--plearn-line-soft)] bg-black/18 md:flex md:flex-col md:justify-between">
                <AppSidebarContent user={session.user} />
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        </div>
    );
}
