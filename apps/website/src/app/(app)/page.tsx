import { ArtisanVietnameseLandmark } from "./_components/artisan-vietnamese-landmark";
import { ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function HomePage() {
    return (
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 px-4 py-8 md:gap-12 md:px-8 md:py-16">
            <header className="max-w-2xl space-y-4">
                <h1 className="text-foreground text-4xl leading-tight font-[var(--font-display)] tracking-[-0.05em] text-balance md:text-5xl">
                    Welcome to the Tool Desk.
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
                    This is your personal space for focused learning systems. Select a tool from the gallery below to begin your session.
                </p>
            </header>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                {/* Vietnamese Tool Card */}
                <Link
                    href="/tools/vietnamese"
                    className="group border-border bg-card hover:border-primary/30 hover:shadow-primary/5 relative flex flex-col gap-6 rounded-[2rem] border p-6 shadow-sm transition-all duration-500 hover:shadow-md xl:col-span-2"
                >
                    <ArtisanVietnameseLandmark />

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-foreground text-3xl font-[var(--font-display)] tracking-[-0.04em]">Vietnamese</h2>
                            <div className="bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-1">
                                <ArrowRight className="size-5" weight="bold" />
                            </div>
                        </div>
                        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                            An auth-gated learning hub. Translate your inner monologue, extract vocabulary, and build a reusable compendium
                            of natural sentence structures.
                        </p>
                    </div>
                </Link>

                {/* Placeholder for Future Tool */}
                <div className="border-border bg-accent/30 hover:bg-accent/50 flex min-h-[300px] cursor-default flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed p-8 text-center transition-colors">
                    <div className="bg-background text-muted-foreground rounded-full p-4 shadow-sm">
                        <Plus className="size-6" weight="duotone" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-foreground font-medium">New Tool Module</p>
                        <p className="text-muted-foreground text-sm">System expansion pending</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
