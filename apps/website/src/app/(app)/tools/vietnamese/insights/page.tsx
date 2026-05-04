export default function VietnameseInsightsPage() {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
            <header className="space-y-2">
                <h1 className="text-foreground text-4xl font-[var(--font-display)] tracking-[-0.05em]">Insights & Pulse</h1>
                <p className="text-muted-foreground text-lg">System analytics and learning trajectory.</p>
            </header>

            <div className="border-border bg-accent/30 flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-dashed text-center">
                <p className="text-muted-foreground font-mono text-sm">Telemetry pending</p>
            </div>
        </div>
    );
}
