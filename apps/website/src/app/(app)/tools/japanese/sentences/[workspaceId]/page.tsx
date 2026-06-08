import { WorkspaceEditor } from "@/components/learning/workspace-editor";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { notFound } from "next/navigation";

interface JapaneseSentenceWorkspaceDetailPageProps {
    readonly params: Promise<{
        workspaceId: string;
    }>;
}

export default async function JapaneseSentenceWorkspaceDetailPage({ params }: JapaneseSentenceWorkspaceDetailPageProps) {
    const { workspaceId } = await params;
    const caller = await createTRPCCaller();
    const workspace = await caller.learning.getWorkspace({
        workspaceId,
        languageCode: "ja",
    });

    if (!workspace) {
        notFound();
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-10">
            <WorkspaceEditor
                languageCode="ja"
                languageName="Japanese"
                languageSlug="japanese"
                initialWorkspace={{
                    id: workspace.id,
                    sourceText: workspace.sourceText,
                    summary: workspace.summary,
                    status: workspace.status,
                    items: workspace.items.map((item) => ({
                        id: item.id,
                        proposedType: item.proposedType,
                        proposedText: item.proposedText,
                        proposedTranslation: item.proposedTranslation,
                        proposedNotes: item.proposedNotes,
                        proposedJson: item.proposedJson,
                        reviewAction: item.reviewAction,
                        mergeTargetLearnableId: item.mergeTargetLearnableId,
                        suggestionsStatus: item.suggestionsStatus,
                        duplicateSuggestionsLastComputedAt: item.duplicateSuggestionsLastComputedAt?.toString(),
                        duplicateSuggestionsError: item.duplicateSuggestionsError,
                        duplicateSuggestions: item.duplicateSuggestions.map((suggestion) => ({
                            learnable: {
                                id: suggestion.learnable.id,
                                canonicalText: suggestion.learnable.canonicalText,
                                translation: suggestion.learnable.translation,
                                occurrenceCount: suggestion.learnable.occurrenceCount,
                            },
                            confidence: suggestion.confidence,
                            reason: suggestion.reason,
                        })),
                    })),
                }}
            />
        </div>
    );
}
