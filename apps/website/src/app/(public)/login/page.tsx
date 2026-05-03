import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default async function LoginPage() {
    const session = await getSession();

    if (session?.user) {
        redirect("/");
    }

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
            <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50" />
            <Card className="relative w-full max-w-md overflow-hidden shadow-lg backdrop-blur-md">
                <CardHeader className="border-border bg-accent border-b">
                    <p className="text-muted-foreground font-mono text-xs tracking-[0.28em] uppercase">Private Learning Stack</p>
                    <CardTitle className="text-4xl font-[var(--font-display)] tracking-[-0.05em]">Plearn</CardTitle>
                    <CardDescription>Enter your owner credentials to access the learning tools and Vietnamese workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    );
}
