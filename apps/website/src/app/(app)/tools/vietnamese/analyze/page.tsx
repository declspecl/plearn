import { WorkspaceEditor } from "@/components/learning/workspace-editor";

export default function VietnameseAnalyzePage() {
    return (
        <div className="plearn-page">
            <header className="mb-6 flex items-baseline gap-3">
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Sentence Decomposition</h1>
                <span
                    className="flex size-[18px] items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] text-[color:var(--plearn-ink-3)]"
                    title="Drop an English sentence below. The engine will translate it, parse vocabulary and grammar, and cross-reference your catalog."
                >
                    i
                </span>
            </header>

            <WorkspaceEditor />
        </div>
    );
}
