import { Skeleton } from "~/components/ui/skeleton";

export default function SentencesLoadingPage() {
    return (
        <div className="plearn-page">
            <header className="mb-8 max-w-3xl">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="mt-3 h-12 w-40 rounded-lg" />
                <Skeleton className="mt-3 h-4 w-72 rounded-full" />
            </header>

            <div className="mb-8 max-w-2xl">
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] p-4">
                    <Skeleton className="h-4 w-28 rounded-full" />
                    <Skeleton className="mt-3 h-11 w-full rounded-lg" />
                </div>
            </div>

            <section className="space-y-7">
                {Array.from({ length: 3 }).map((_, groupIndex) => (
                    <div key={groupIndex}>
                        <div className="plearn-divider-heading mb-3">
                            <Skeleton className="h-4 w-24 rounded-full" />
                            <Skeleton className="h-3 w-8 rounded-full" />
                        </div>
                        <div className="space-y-1">
                            {Array.from({ length: 2 }).map((_, itemIndex) => (
                                <div
                                    key={itemIndex}
                                    className="grid gap-3 border-b border-[color:var(--plearn-line-soft)] px-2 py-4 md:grid-cols-[80px_1fr_auto_auto] md:items-center"
                                >
                                    <Skeleton className="h-4 w-14 rounded-full" />
                                    <div>
                                        <Skeleton className="h-6 w-[70%] rounded-full" />
                                        <Skeleton className="mt-2 h-4 w-[48%] rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-28 rounded-full" />
                                    <Skeleton className="hidden h-4 w-24 rounded-full md:block" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
