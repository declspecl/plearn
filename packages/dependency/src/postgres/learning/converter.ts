import {
    createLanguageId,
    createLearnableId,
    createOccurrenceId,
    createRelatedLearnableId,
    createSentenceWorkspaceId,
    createWorkspaceItemId,
    type ExampleSource,
    type Language,
    type Learnable,
    type LearnableExample,
    type LearnableMatch,
    type Occurrence,
    type RelatedLearnable,
    type SentenceWorkspace,
    type WorkspaceItem,
} from "@plearn/core/learning/model";
import type {
    learningLanguages,
    learningLearnableExamples,
    learningLearnables,
    learningOccurrences,
    learningRelatedLearnables,
    learningSentenceWorkspaces,
    learningWorkspaceItems,
} from "@plearn/db/schema";

type LanguageRow = typeof learningLanguages.$inferSelect;
type LearnableRow = typeof learningLearnables.$inferSelect;
type LearnableExampleRow = typeof learningLearnableExamples.$inferSelect;
type OccurrenceRow = typeof learningOccurrences.$inferSelect;
type RelatedLearnableRow = typeof learningRelatedLearnables.$inferSelect;
type SentenceWorkspaceRow = typeof learningSentenceWorkspaces.$inferSelect;
type WorkspaceItemRow = typeof learningWorkspaceItems.$inferSelect;

export class LearningConverter {
    public convertLanguage(row: LanguageRow): Language {
        return {
            id: createLanguageId(row.id),
            code: row.code,
            name: row.name,
        };
    }

    public convertLearnable(row: LearnableRow, aliases: readonly string[] = [], examples: readonly LearnableExample[] = []): Learnable {
        return {
            id: createLearnableId(row.id),
            languageId: createLanguageId(row.languageId),
            type: row.type,
            canonicalText: row.canonicalText,
            normalizedText: row.normalizedText,
            translation: row.translation,
            partOfSpeech: row.partOfSpeech ?? undefined,
            usageNotes: row.usageNotes,
            patternTemplate: row.patternTemplate ?? undefined,
            difficulty: row.difficulty ?? undefined,
            searchDocument: row.searchDocument,
            embedding: row.embedding ?? undefined,
            embeddingSourceText: row.embeddingSourceText ?? undefined,
            languageMetadata: (row.languageMetadataJson as Readonly<Record<string, unknown>> | null) ?? {},
            occurrenceCount: row.occurrenceCount,
            firstSeenAt: row.firstSeenAt,
            lastSeenAt: row.lastSeenAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            archivedAt: row.archivedAt ?? undefined,
            aliases,
            examples,
        };
    }

    public convertLearnableExample(row: LearnableExampleRow): LearnableExample {
        return {
            id: row.id,
            learnableId: createLearnableId(row.learnableId),
            exampleText: row.exampleText,
            translation: row.translation,
            source: row.source as ExampleSource,
            createdAt: row.createdAt,
        };
    }

    public convertOccurrence(row: OccurrenceRow): Occurrence {
        return {
            id: createOccurrenceId(row.id),
            learnableId: createLearnableId(row.learnableId),
            workspaceId: createSentenceWorkspaceId(row.workspaceId),
            sourceSpanText: row.sourceSpanText,
            sourceSentenceText: row.sourceSentenceText,
            rationale: row.rationale ?? undefined,
            createdAt: row.createdAt,
        };
    }

    public convertWorkspace(row: SentenceWorkspaceRow, items: readonly WorkspaceItem[] = []): SentenceWorkspace {
        return {
            id: createSentenceWorkspaceId(row.id),
            languageId: createLanguageId(row.languageId),
            sourceText: row.sourceText,
            sourceLanguageCode: row.sourceLanguageCode,
            status: row.status,
            analysisModelProvider: row.analysisModelProvider ?? undefined,
            analysisModelId: row.analysisModelId ?? undefined,
            analysisPromptVersion: row.analysisPromptVersion ?? undefined,
            summary: row.summary ?? undefined,
            rawAnalysisJson: (row.rawAnalysisJson as Readonly<Record<string, unknown>> | null) ?? undefined,
            reviewedAnalysisJson: (row.reviewedAnalysisJson as Readonly<Record<string, unknown>> | null) ?? undefined,
            errorMessage: row.errorMessage ?? undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdByUserId: row.createdByUserId,
            items,
        };
    }

    public convertWorkspaceItem(row: WorkspaceItemRow, duplicateSuggestions: readonly LearnableMatch[] = []): WorkspaceItem {
        const cachedSuggestions =
            Array.isArray(row.duplicateSuggestionsJson) && row.duplicateSuggestionsJson.length > 0
                ? (row.duplicateSuggestionsJson as readonly LearnableMatch[])
                : duplicateSuggestions;

        return {
            id: createWorkspaceItemId(row.id),
            workspaceId: createSentenceWorkspaceId(row.workspaceId),
            proposedType: row.proposedType,
            proposedText: row.proposedText,
            proposedTranslation: row.proposedTranslation,
            proposedNotes: row.proposedNotes,
            proposedJson: row.proposedJson as Readonly<Record<string, unknown>>,
            reviewAction: row.reviewAction,
            mergeTargetLearnableId: row.mergeTargetLearnableId ? createLearnableId(row.mergeTargetLearnableId) : undefined,
            position: row.position,
            duplicateSuggestions: cachedSuggestions,
            suggestionsStatus: row.duplicateSuggestionsStatus,
            duplicateSuggestionsLastComputedAt: row.duplicateSuggestionsComputedAt ?? undefined,
            duplicateSuggestionsError: row.duplicateSuggestionsError ?? undefined,
        };
    }

    public convertRelatedLearnable(row: RelatedLearnableRow): RelatedLearnable {
        return {
            id: createRelatedLearnableId(row.id),
            fromLearnableId: createLearnableId(row.fromLearnableId),
            toLearnableId: createLearnableId(row.toLearnableId),
            relationType: row.relationType,
            confidence: row.confidence,
        };
    }
}
