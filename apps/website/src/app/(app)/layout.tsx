export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <main className="flex-1">{children}</main>
        </div>
    );
}
