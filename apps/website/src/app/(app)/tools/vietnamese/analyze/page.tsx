import { WorkspaceEditor } from "@/components/learning/workspace-editor";

export default function VietnameseAnalyzePage() {
    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10">
            <header className="max-w-3xl space-y-4">
                <h1 className="text-foreground text-5xl leading-tight font-[var(--font-display)] tracking-[-0.05em]">
                    Sentence Decomposition
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                    Drop an English sentence below. The engine will translate your thought, parse the Vietnamese vocabulary and grammatical
                    structures, and cross-reference them against your existing compendium.
                </p>
            </header>

            <div className="bg-card border-border relative w-full overflow-hidden rounded-[2rem] border p-6 shadow-sm md:p-8">
                {/* Ambient glow effects to make it feel like a "workbench" */}
                <div className="bg-primary/5 pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full blur-[100px]" />
                <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]" />

                <div className="relative z-10">
                    <WorkspaceEditor />
                </div>
            </div>
        </div>
    );
}
