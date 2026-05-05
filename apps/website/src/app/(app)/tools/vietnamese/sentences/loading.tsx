import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export default function SentencesLoadingPage() {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <Skeleton className="h-12 w-44" />
                    <Skeleton className="mt-2 h-5 w-2/3" />
                </CardHeader>
                <CardContent>
                    <div className="border-border bg-card max-w-2xl space-y-3 rounded-2xl border p-4">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <div>
                    <Skeleton className="h-8 w-52" />
                    <Skeleton className="mt-1 h-4 w-40" />
                </div>
                <div className="grid gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="border-l-primary/30 border-l-4">
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-7 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
