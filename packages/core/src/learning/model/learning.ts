import { createEntityId, type EntityId } from "../../shared/model/id";

export type LanguageId = EntityId<"Language">;
export type LearnableId = EntityId<"Learnable">;
export type SentenceWorkspaceId = EntityId<"SentenceWorkspace">;
export type WorkspaceItemId = EntityId<"WorkspaceItem">;
export type OccurrenceId = EntityId<"Occurrence">;
export type RelatedLearnableId = EntityId<"RelatedLearnable">;

export function createLanguageId(id: string): LanguageId {
    return createEntityId<"Language">(id);
}

export function createLearnableId(id: string): LearnableId {
    return createEntityId<"Learnable">(id);
}

export function createSentenceWorkspaceId(id: string): SentenceWorkspaceId {
    return createEntityId<"SentenceWorkspace">(id);
}

export function createWorkspaceItemId(id: string): WorkspaceItemId {
    return createEntityId<"WorkspaceItem">(id);
}

export function createOccurrenceId(id: string): OccurrenceId {
    return createEntityId<"Occurrence">(id);
}

export function createRelatedLearnableId(id: string): RelatedLearnableId {
    return createEntityId<"RelatedLearnable">(id);
}

export const learnableTypes = ["grammar_pattern", "vocabulary", "utility_word", "phrase"] as const;
export type LearnableType = (typeof learnableTypes)[number];

export const workspaceStatuses = ["draft", "analyzed", "reviewed", "saved", "failed"] as const;
export type WorkspaceStatus = (typeof workspaceStatuses)[number];

export const reviewActions = ["pending", "create_new", "merge_existing", "reject"] as const;
export type ReviewAction = (typeof reviewActions)[number];
export const suggestionStatuses = ["idle", "loading", "ready", "failed"] as const;
export type SuggestionStatus = (typeof suggestionStatuses)[number];

export const exampleSources = ["ai", "sentence_observed", "manual"] as const;
export type ExampleSource = (typeof exampleSources)[number];

export const relatedLearnableTypes = ["similar_meaning", "same_pattern_family", "often_confused", "related_phrase"] as const;
export type RelatedLearnableType = (typeof relatedLearnableTypes)[number];

export interface Language {
    readonly id: LanguageId;
    readonly code: string;
    readonly name: string;
}

export interface LearnableExample {
    readonly id: string;
    readonly learnableId: LearnableId;
    readonly exampleText: string;
    readonly translation: string;
    readonly source: ExampleSource;
    readonly createdAt: Date;
}

export interface Learnable {
    readonly id: LearnableId;
    readonly languageId: LanguageId;
    readonly type: LearnableType;
    readonly canonicalText: string;
    readonly normalizedText: string;
    readonly translation: string;
    readonly partOfSpeech?: string;
    readonly usageNotes: string;
    readonly patternTemplate?: string;
    readonly difficulty?: number;
    readonly searchDocument: string;
    readonly embedding?: number[];
    readonly embeddingSourceText?: string;
    readonly occurrenceCount: number;
    readonly firstSeenAt: Date;
    readonly lastSeenAt: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly archivedAt?: Date;
    readonly aliases: readonly string[];
    readonly examples: readonly LearnableExample[];
}

export interface Occurrence {
    readonly id: OccurrenceId;
    readonly learnableId: LearnableId;
    readonly workspaceId: SentenceWorkspaceId;
    readonly sourceSpanText: string;
    readonly sourceSentenceText: string;
    readonly rationale?: string;
    readonly createdAt: Date;
}

export interface SentenceTranslation {
    readonly text: string;
    readonly meaning: string;
}

export interface ComponentProposal {
    readonly text: string;
    readonly meaning: string;
    readonly formula: string;
    readonly learnableType: "grammar_pattern" | "phrase";
    readonly notes?: string;
    readonly exampleHints: readonly {
        readonly exampleText: string;
        readonly translation: string;
    }[];
}

export interface WordProposal {
    readonly text: string;
    readonly meaning: string;
    readonly partOfSpeech?: string;
    readonly learnableType: "vocabulary" | "utility_word";
    readonly notes?: string;
    readonly exampleHints: readonly {
        readonly exampleText: string;
        readonly translation: string;
    }[];
}

export interface SentenceAnalysis {
    readonly sentence: SentenceTranslation;
    readonly components: readonly ComponentProposal[];
    readonly words: readonly WordProposal[];
}

export interface WorkspaceItem {
    readonly id: WorkspaceItemId;
    readonly workspaceId: SentenceWorkspaceId;
    readonly proposedType: LearnableType;
    readonly proposedText: string;
    readonly proposedTranslation: string;
    readonly proposedNotes: string;
    readonly proposedJson: Readonly<Record<string, unknown>>;
    readonly reviewAction: ReviewAction;
    readonly mergeTargetLearnableId?: LearnableId;
    readonly position: number;
    readonly duplicateSuggestions: readonly LearnableMatch[];
    readonly suggestionsStatus: SuggestionStatus;
    readonly duplicateSuggestionsLastComputedAt?: Date;
    readonly duplicateSuggestionsError?: string;
}

export interface SentenceWorkspace {
    readonly id: SentenceWorkspaceId;
    readonly languageId: LanguageId;
    readonly sourceText: string;
    readonly sourceLanguageCode: string;
    readonly status: WorkspaceStatus;
    readonly analysisModelProvider?: string;
    readonly analysisModelId?: string;
    readonly analysisPromptVersion?: string;
    readonly rawAnalysisJson?: Readonly<Record<string, unknown>>;
    readonly reviewedAnalysisJson?: Readonly<Record<string, unknown>>;
    readonly errorMessage?: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly createdByUserId: string;
    readonly summary?: string;
    readonly items: readonly WorkspaceItem[];
}

export interface RelatedLearnable {
    readonly id: RelatedLearnableId;
    readonly fromLearnableId: LearnableId;
    readonly toLearnableId: LearnableId;
    readonly relationType: RelatedLearnableType;
    readonly confidence: number;
}

export interface LearnableMatch {
    readonly learnable: Learnable;
    readonly confidence: number;
    readonly reason: "exact" | "alias" | "lexical" | "semantic";
}

export interface CreateLearnableInput {
    readonly languageId: LanguageId;
    readonly type: LearnableType;
    readonly canonicalText: string;
    readonly normalizedText: string;
    readonly translation: string;
    readonly partOfSpeech?: string;
    readonly usageNotes: string;
    readonly patternTemplate?: string;
    readonly difficulty?: number;
    readonly searchDocument: string;
    readonly embedding?: number[];
    readonly embeddingSourceText?: string;
    readonly aliases: readonly string[];
    readonly examples: readonly {
        readonly exampleText: string;
        readonly translation: string;
        readonly source: ExampleSource;
    }[];
    readonly firstSeenAt: Date;
    readonly lastSeenAt: Date;
}

export interface UpdateLearnableInput {
    readonly translation?: string;
    readonly partOfSpeech?: string;
    readonly usageNotes?: string;
    readonly patternTemplate?: string;
    readonly difficulty?: number;
    readonly searchDocument?: string;
    readonly embedding?: number[];
    readonly embeddingSourceText?: string;
    readonly aliases?: readonly string[];
    readonly examples?: readonly {
        readonly exampleText: string;
        readonly translation: string;
        readonly source: ExampleSource;
    }[];
    readonly lastSeenAt?: Date;
    readonly occurrenceCount?: number;
}
