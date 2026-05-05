"use client";

import { getAuthClient } from "@/lib/client/auth";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "~/components/ui/button";

export function SignOutButton() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    async function handleSignOut() {
        setIsPending(true);

        try {
            await getAuthClient().signOut();
            startTransition(() => {
                router.replace("/login");
                router.refresh();
            });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Button className="rounded-full px-3" disabled={isPending} onClick={handleSignOut} size="sm" variant="secondary">
            {isPending ? "Leaving..." : "Sign out"}
        </Button>
    );
}
