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
        <div className="bg-background text-foreground flex h-screen w-full flex-col overflow-hidden md:flex-row">
            <MobileNav user={session.user} />
            <aside className="border-border bg-card/50 hidden w-64 shrink-0 flex-col justify-between border-r backdrop-blur-md md:flex">
                <AppSidebarContent user={session.user} />
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
