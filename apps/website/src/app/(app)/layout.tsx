export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
    return (
        <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
