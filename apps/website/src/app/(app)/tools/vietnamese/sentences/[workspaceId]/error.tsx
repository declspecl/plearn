"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

interface WorkspaceErrorPageProps {
    readonly error: Error & { digest?: string };
    readonly reset: () => void;
}

export default function WorkspaceErrorPage({ error, reset }: WorkspaceErrorPageProps) {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <Card className="border-border bg-accent">
                <CardHeader>
                    <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.06em]">Failed to load workspace</CardTitle>
                    <CardDescription className="max-w-2xl text-base leading-7">
                        This workspace could not be loaded. This is likely a temporary issue — try refreshing, or go back to the ledger.
                        {error.digest ? (
                            <span className="text-muted-foreground mt-2 block font-mono text-xs">Error ID: {error.digest}</span>
                        ) : null}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={reset}>Try again</Button>
                    <Button render={<Link href="/tools/vietnamese/sentences" />} variant="secondary">
                        Back to Ledger
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
