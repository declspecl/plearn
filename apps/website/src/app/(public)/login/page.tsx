import { LoginForm } from "@/components/auth/login-form";
import { SiteLogo } from "@/components/brand/site-logo";
import { getSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";

export default async function LoginPage() {
    const session = await getSession();

    if (session?.user) {
        redirect("/");
    }

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
            <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50" />
            <Card className="relative w-full max-w-md overflow-hidden shadow-lg backdrop-blur-md">
                <CardHeader className="border-border bg-accent space-y-4 border-b">
                    <p className="text-muted-foreground font-mono text-sm">Private Learning Stack</p>
                    <SiteLogo variant="lg" className="self-start" priority />
                    <CardDescription>Enter your owner credentials to access the learning tools and Vietnamese workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    );
}
