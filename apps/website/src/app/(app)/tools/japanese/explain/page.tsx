import { LanguageExplanationViewer } from "@/components/learning/explanation-viewer";

export default function JapaneseExplainPage() {
    return (
        <div className="plearn-page">
            <header className="mb-6 flex items-baseline gap-3">
                <h1 className="text-[2.35rem] font-[var(--font-display)] tracking-[-0.03em]">Explain Japanese</h1>
                <span
                    className="flex size-[18px] items-center justify-center rounded-full border border-[color:var(--border)] text-[10px] text-[color:var(--plearn-ink-3)]"
                    title="Paste a Japanese sentence you encountered. The engine will decompose it, explain the grammar, and cross-reference your catalog."
                >
                    i
                </span>
            </header>

            <LanguageExplanationViewer languageCode="ja" languageName="Japanese" languageSlug="japanese" />
        </div>
    );
}
