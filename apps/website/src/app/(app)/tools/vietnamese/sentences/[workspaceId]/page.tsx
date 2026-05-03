import { WorkspaceEditor } from "@/components/learning/workspace-editor";
import { createTRPCCaller } from "@/lib/server/trpc-caller";
import { notFound } from "next/navigation";

interface SentenceWorkspaceDetailPageProps {
    readonly params: Promise<{
        workspaceId: string;
    }>;
}

export default async function SentenceWorkspaceDetailPage({ params }: SentenceWorkspaceDetailPageProps) {
    const { workspaceId } = await params;
    const caller = await createTRPCCaller();
    const workspace = await caller.learning.getWorkspace({
        workspaceId,
        languageCode: "vi",
    });

    if (!workspace) {
        notFound();
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
            <WorkspaceEditor
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
