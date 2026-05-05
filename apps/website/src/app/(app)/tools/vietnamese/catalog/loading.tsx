import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export default function CatalogLoadingPage() {
    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <Skeleton className="h-12 w-36" />
                    <Skeleton className="mt-2 h-5 w-2/3" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                        <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <div>
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-1 h-4 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Card key={i} className="h-full">
                            <CardHeader className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-8 rounded-full" />
                                </div>
                                <Skeleton className="h-9 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                                <Skeleton className="h-3 w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
