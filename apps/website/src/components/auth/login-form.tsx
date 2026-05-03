"use client";

import { getAuthClient } from "@/lib/client/auth";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsPending(true);
        setError(null);

        try {
            const authClient = getAuthClient();
            const result = await authClient.signIn.email({
                email,
                password,
                callbackURL: "/",
            });

            if (result.error) {
                setError(result.error.message ?? "Unable to sign in.");
                return;
            }

            startTransition(() => {
                router.replace("/");
                router.refresh();
            });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                    <Input
                        id="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </FieldContent>
            </Field>
            <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldContent>
                    <Input
                        id="password"
                        autoComplete="current-password"
                        required
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </FieldContent>
            </Field>
            {error ? <FieldDescription className="text-destructive">{error}</FieldDescription> : null}
            <Button className="w-full" disabled={isPending} type="submit">
                {isPending ? "Signing In..." : "Enter Plearn"}
            </Button>
        </form>
    );
}
