import type {
    CreateLearnableInput,
    Language,
    Learnable,
    LearnableId,
    LearnableMatch,
    LearnableType,
    Occurrence,
    RelatedLearnable,
    ReviewAction,
    RelatedLearnableType,
    SentenceAnalysis,
    SentenceWorkspace,
    SentenceWorkspaceId,
    UpdateLearnableInput,
    SuggestionStatus,
    WorkspaceItem,
    WorkspaceItemId,
    WorkspaceStatus,
} from "./model";

export interface CreateWorkspaceInput {
    readonly languageCode: string;
    readonly sourceText: string;
    readonly sourceLanguageCode: string;
    readonly createdByUserId: string;
}

export interface RecordWorkspaceAnalysisInput {
    readonly workspaceId: SentenceWorkspaceId;
    readonly status: WorkspaceStatus;
    readonly analysisModelProvider: string;
    readonly analysisModelId: string;
    readonly analysisPromptVersion: string;
    readonly rawAnalysisJson: Readonly<Record<string, unknown>>;
    readonly summary: string;
    readonly items: readonly {
        readonly proposedType: LearnableType;
        readonly proposedText: string;
        readonly proposedTranslation: string;
        readonly proposedNotes: string;
        readonly proposedJson: Readonly<Record<string, unknown>>;
        readonly position: number;
    }[];
}

export interface UpdateWorkspaceReviewInput {
    readonly workspaceId: SentenceWorkspaceId;
    readonly reviewedAnalysisJson: Readonly<Record<string, unknown>>;
    readonly items: readonly {
        readonly id: WorkspaceItemId;
        readonly proposedText: string;
        readonly proposedTranslation: string;
        readonly proposedNotes: string;
        readonly proposedJson: Readonly<Record<string, unknown>>;
        readonly reviewAction: ReviewAction;
        readonly mergeTargetLearnableId?: LearnableId;
    }[];
}

export interface WorkspaceSaveItem {
    readonly item: WorkspaceItem;
    readonly normalizedText: string;
}

export interface LearnableListFilters {
    readonly languageCode?: string;
    readonly types?: readonly LearnableType[];
    readonly query?: string;
    readonly archived?: boolean;
    readonly minOccurrenceCount?: number;
    readonly maxOccurrenceCount?: number;
    readonly hasExamples?: boolean;
    readonly limit?: number;
    readonly offset?: number;
    readonly sort?: "frequency" | "newest" | "last_seen" | "alphabetical";
}

export interface SemanticSearchInput {
    readonly languageCode: string;
    readonly query: string;
    readonly embedding: number[];
    readonly types?: readonly LearnableType[];
    readonly limit?: number;
}

export interface LearningAnalyzer {
    analyzeSentence(input: {
        languageCode: string;
        sourceText: string;
        clarifications?: readonly { question: string; answer: string }[];
    }): Promise<
        | {
              readonly status: "clarification_needed";
              readonly clarification: {
                  readonly question: string;
                  readonly options: readonly { readonly id: string; readonly label: string; readonly isRecommended: boolean }[];
              };
              readonly modelProvider: string;
              readonly modelId: string;
              readonly promptVersion: string;
          }
        | {
              readonly status: "analyzed";
              readonly analysis: SentenceAnalysis;
              readonly modelProvider: string;
              readonly modelId: string;
              readonly promptVersion: string;
          }
    >;
}

export interface LearningEmbedder {
    buildEmbeddingSourceText(input: {
        readonly type: LearnableType;
        readonly canonicalText: string;
        readonly translation: string;
        readonly usageNotes: string;
        readonly patternTemplate?: string;
    }): string;
    embed(text: string): Promise<number[]>;
}

export interface SentenceWorkspaceRepository {
    createWorkspace(input: CreateWorkspaceInput): Promise<SentenceWorkspace>;
    recordAnalysis(input: RecordWorkspaceAnalysisInput): Promise<SentenceWorkspace>;
    updateReview(input: UpdateWorkspaceReviewInput): Promise<SentenceWorkspace>;
    markFailed(workspaceId: SentenceWorkspaceId, errorMessage: string): Promise<void>;
    markSaved(workspaceId: SentenceWorkspaceId, reviewedAnalysisJson: Readonly<Record<string, unknown>>): Promise<SentenceWorkspace>;
    findWorkspaceById(workspaceId: SentenceWorkspaceId): Promise<SentenceWorkspace | undefined>;
    listWorkspaces(
        createdByUserId: string,
        languageCode?: string,
        options?: { readonly query?: string; readonly limit?: number; readonly offset?: number; readonly includeItems?: boolean },
    ): Promise<readonly SentenceWorkspace[]>;
    setWorkspaceItemSuggestions(input: {
        readonly workspaceItemId: WorkspaceItemId;
        readonly duplicateSuggestions: readonly LearnableMatch[];
        readonly status: SuggestionStatus;
        readonly error?: string;
    }): Promise<void>;
    setWorkspaceItemSuggestionStatus(input: {
        readonly workspaceItemId: WorkspaceItemId;
        readonly status: SuggestionStatus;
        readonly error?: string;
    }): Promise<void>;
}

export interface LearnableRepository {
    findLanguageByCode(code: string): Promise<Language | undefined>;
    listLearnables(filters: LearnableListFilters): Promise<readonly Learnable[]>;
    findLearnableById(id: LearnableId): Promise<Learnable | undefined>;
    findExactMatch(input: { languageId: Language["id"]; type: LearnableType; normalizedText: string }): Promise<Learnable | undefined>;
    findAllByNormalizedText(input: { languageId: Language["id"]; normalizedText: string }): Promise<readonly Learnable[]>;
    findAliasMatch(input: { languageId: Language["id"]; normalizedText: string }): Promise<Learnable | undefined>;
    createLearnable(input: CreateLearnableInput): Promise<Learnable>;
    updateLearnable(id: LearnableId, input: UpdateLearnableInput): Promise<Learnable>;
    touchLearnable(id: LearnableId, now: Date): Promise<Learnable>;
    listRelatedLearnables(id: LearnableId): Promise<readonly RelatedLearnable[]>;
    listLearnableBacklinks(id: LearnableId): Promise<readonly RelatedLearnable[]>;
    listAllRelatedLearnables(languageId: Language["id"]): Promise<readonly RelatedLearnable[]>;
    findAllByNormalizedTexts(input: { languageId: Language["id"]; normalizedTexts: readonly string[] }): Promise<readonly Learnable[]>;
    findAllByNormalizedTextsOrAliases(input: {
        languageId: Language["id"];
        normalizedTexts: readonly string[];
    }): Promise<readonly Learnable[]>;
    upsertRelatedLearnables(
        relations: readonly {
            readonly fromLearnableId: LearnableId;
            readonly toLearnableId: LearnableId;
            readonly relationType: RelatedLearnableType;
            readonly confidence: number;
        }[],
    ): Promise<void>;
}

export interface OccurrenceRepository {
    createOccurrence(input: {
        readonly learnableId: LearnableId;
        readonly workspaceId: SentenceWorkspaceId;
        readonly sourceSpanText: string;
        readonly sourceSentenceText: string;
        readonly rationale?: string;
    }): Promise<Occurrence>;
    listOccurrencesForLearnable(learnableId: LearnableId): Promise<readonly Occurrence[]>;
    listOccurrencesForLanguage(languageId: Language["id"]): Promise<readonly Occurrence[]>;
}

export interface LearningSearchRepository {
    findLexicalMatches(input: {
        readonly languageCode: string;
        readonly type: LearnableType;
        readonly query: string;
        readonly limit?: number;
    }): Promise<readonly LearnableMatch[]>;
    findSemanticMatches(input: SemanticSearchInput): Promise<readonly LearnableMatch[]>;
    findLexicalMatchesBatch(input: {
        readonly languageCode: string;
        readonly items: readonly {
            readonly workspaceItemId: WorkspaceItemId;
            readonly type: LearnableType;
            readonly query: string;
            readonly limit?: number;
        }[];
    }): Promise<Readonly<Record<string, readonly LearnableMatch[]>>>;
}
