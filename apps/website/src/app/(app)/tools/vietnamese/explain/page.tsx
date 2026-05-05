import { ExplanationViewer } from "@/components/learning/explanation-viewer";

export default function VietnameseExplainPage() {
    return (
        <div className="plearn-page">
            <header className="mb-6 flex items-baseline gap-3">
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Explain Vietnamese</h1>
                <span
                    className="flex size-[18px] items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] text-[color:var(--plearn-ink-3)]"
                    title="Paste a Vietnamese sentence you encountered. The engine will decompose it, explain the grammar, and cross-reference your catalog."
                >
                    i
                </span>
            </header>

            <ExplanationViewer />
        </div>
    );
}
