import type {
    Learnable,
    LearnableId,
    LearnableMatch,
    LearnableProposal,
    SentenceWorkspace,
    SentenceWorkspaceId,
    WorkspaceItem,
} from "./model";
import type {
    LearningAnalyzer,
    LearningEmbedder,
    LearningSearchRepository,
    LearnableListFilters,
    LearnableRepository,
    OccurrenceRepository,
    SentenceWorkspaceRepository,
    SemanticSearchInput,
    UpdateWorkspaceReviewInput,
} from "./repository";

function normalizeLearnableText(value: string): string {
    return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function buildSearchDocument(proposal: {
    readonly canonicalText: string;
    readonly translation: string;
    readonly usageNotes: string;
    readonly patternTemplate?: string;
    readonly aliases?: readonly string[];
    readonly examples?: readonly { readonly exampleText: string; readonly translation: string }[];
}): string {
    return [
        proposal.canonicalText,
        proposal.translation,
        proposal.usageNotes,
        proposal.patternTemplate,
        ...(proposal.aliases ?? []),
        ...(proposal.examples ?? []).flatMap((example) => [example.exampleText, example.translation]),
    ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join("\n");
}

function toWorkspaceReviewJson(workspace: SentenceWorkspace): Readonly<Record<string, unknown>> {
    return {
        summary: workspace.summary,
        items: workspace.items.map((item) => ({
            id: item.id,
            type: item.proposedType,
            text: item.proposedText,
            translation: item.proposedTranslation,
            notes: item.proposedNotes,
            reviewAction: item.reviewAction,
            mergeTargetLearnableId: item.mergeTargetLearnableId,
            proposedJson: item.proposedJson,
        })),
    };
}

function flattenAnalysis(analysis: {
    readonly grammarPatterns: readonly LearnableProposal[];
    readonly vocabulary: readonly LearnableProposal[];
    readonly utilityWords: readonly LearnableProposal[];
    readonly phrases: readonly LearnableProposal[];
}): readonly LearnableProposal[] {
    return [...analysis.grammarPatterns, ...analysis.vocabulary, ...analysis.utilityWords, ...analysis.phrases];
}

export class SentenceAnalysisService {
    public constructor(
        private readonly workspaces: SentenceWorkspaceRepository,
        private readonly search: LearningSearchRepository,
        private readonly analyzer: LearningAnalyzer,
    ) {}

    public async analyzeSentence(input: {
        readonly languageCode: string;
        readonly sourceText: string;
        readonly createdByUserId: string;
    }): Promise<SentenceWorkspace> {
        const workspace = await this.workspaces.createWorkspace({
            languageCode: input.languageCode,
            sourceText: input.sourceText,
            sourceLanguageCode: "en",
            createdByUserId: input.createdByUserId,
        });

        try {
            const analyzed = await this.analyzer.analyzeSentence({
                languageCode: input.languageCode,
                sourceText: input.sourceText,
            });

            const flattened = flattenAnalysis(analyzed.analysis);
            const items = flattened.map((proposal, index) => ({
                proposedType: proposal.type,
                proposedText: proposal.text,
                proposedTranslation: proposal.translation,
                proposedNotes: proposal.notes,
                proposedJson: proposal as unknown as Readonly<Record<string, unknown>>,
                position: index,
            }));

            const saved = await this.workspaces.recordAnalysis({
                workspaceId: workspace.id,
                status: "analyzed",
                analysisModelProvider: analyzed.modelProvider,
                analysisModelId: analyzed.modelId,
                analysisPromptVersion: analyzed.promptVersion,
                rawAnalysisJson: analyzed.analysis as unknown as Readonly<Record<string, unknown>>,
                summary: analyzed.analysis.summary,
                items,
            });

            return this.attachSuggestions(saved, input.languageCode);
        } catch (error) {
            await this.workspaces.markFailed(workspace.id, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async getWorkspace(workspaceId: SentenceWorkspaceId, languageCode: string): Promise<SentenceWorkspace | undefined> {
        const workspace = await this.workspaces.findWorkspaceById(workspaceId);

        if (!workspace) {
            return undefined;
        }

        return this.attachSuggestions(workspace, languageCode);
    }

    private async attachSuggestions(workspace: SentenceWorkspace, languageCode: string): Promise<SentenceWorkspace> {
        const items = await Promise.all(
            workspace.items.map(async (item) => {
                const suggestions = await this.search.findLexicalMatches({
                    languageCode,
                    type: item.proposedType,
                    query: item.proposedText,
                    limit: 3,
                });

                return {
                    ...item,
                    duplicateSuggestions: suggestions,
                    mergeTargetLearnableId:
                        item.mergeTargetLearnableId ?? suggestions.find((suggestion) => suggestion.confidence >= 0.85)?.learnable.id,
                    reviewAction:
                        item.reviewAction === "pending" && suggestions.some((suggestion) => suggestion.confidence >= 0.85)
                            ? "merge_existing"
                            : item.reviewAction,
                } satisfies WorkspaceItem;
            }),
        );

        return {
            ...workspace,
            items,
        };
    }
}

export class WorkspaceReviewService {
    public constructor(
        private readonly workspaces: SentenceWorkspaceRepository,
        private readonly learnables: LearnableRepository,
        private readonly occurrences: OccurrenceRepository,
        private readonly search: LearningSearchRepository,
        private readonly embedder: LearningEmbedder,
    ) {}

    public async updateWorkspaceReview(input: UpdateWorkspaceReviewInput & { readonly languageCode: string }): Promise<SentenceWorkspace> {
        const updated = await this.workspaces.updateReview(input);
        const items = await Promise.all(
            updated.items.map(async (item) => ({
                ...item,
                duplicateSuggestions: await this.search.findLexicalMatches({
                    languageCode: input.languageCode,
                    type: item.proposedType,
                    query: item.proposedText,
                    limit: 3,
                }),
            })),
        );

        return {
            ...updated,
            items,
        };
    }

    public async saveWorkspace(workspaceId: SentenceWorkspaceId): Promise<{
        readonly workspace: SentenceWorkspace;
        readonly savedLearnables: readonly Learnable[];
    }> {
        const workspace = await this.workspaces.findWorkspaceById(workspaceId);

        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }

        const savedLearnables: Learnable[] = [];

        for (const item of workspace.items) {
            if (item.reviewAction === "reject") {
                continue;
            }

            const normalizedText = normalizeLearnableText(item.proposedText);
            const current = await this.resolveLearnable(workspace, item, normalizedText);
            const exampleHints =
                Array.isArray(item.proposedJson.exampleHints) && item.proposedJson.exampleHints.every((hint) => typeof hint === "object")
                    ? (item.proposedJson.exampleHints as Array<{ exampleText: string; translation: string }>)
                    : [];

            let learnable: Learnable;

            if (current) {
                learnable = await this.learnables.updateLearnable(current.id, {
                    translation: current.translation || item.proposedTranslation,
                    partOfSpeech:
                        typeof item.proposedJson.partOfSpeech === "string" ? item.proposedJson.partOfSpeech : current.partOfSpeech,
                    usageNotes: item.proposedNotes,
                    patternTemplate:
                        typeof item.proposedJson.patternTemplate === "string" ? item.proposedJson.patternTemplate : current.patternTemplate,
                    searchDocument: buildSearchDocument({
                        canonicalText: current.canonicalText,
                        translation: item.proposedTranslation,
                        usageNotes: item.proposedNotes,
                        patternTemplate:
                            typeof item.proposedJson.patternTemplate === "string" ? item.proposedJson.patternTemplate : undefined,
                        aliases: Array.from(
                            new Set([...current.aliases, normalizedText !== current.normalizedText ? item.proposedText : ""]),
                        ).filter(Boolean),
                        examples: exampleHints,
                    }),
                    aliases: Array.from(
                        new Set([...current.aliases, normalizedText !== current.normalizedText ? item.proposedText : ""]),
                    ).filter(Boolean),
                    examples: [
                        ...current.examples.map((example) => ({
                            exampleText: example.exampleText,
                            translation: example.translation,
                            source: example.source,
                        })),
                        ...exampleHints.map((example) => ({
                            ...example,
                            source: "ai" as const,
                        })),
                    ],
                    lastSeenAt: new Date(),
                    occurrenceCount: current.occurrenceCount + 1,
                });
            } else {
                const embeddingSourceText = this.embedder.buildEmbeddingSourceText({
                    type: item.proposedType,
                    canonicalText: item.proposedText,
                    translation: item.proposedTranslation,
                    usageNotes: item.proposedNotes,
                    patternTemplate: typeof item.proposedJson.patternTemplate === "string" ? item.proposedJson.patternTemplate : undefined,
                });

                const embedding = await this.embedder.embed(embeddingSourceText);

                learnable = await this.learnables.createLearnable({
                    languageId: workspace.languageId,
                    type: item.proposedType,
                    canonicalText: item.proposedText,
                    normalizedText,
                    translation: item.proposedTranslation,
                    partOfSpeech: typeof item.proposedJson.partOfSpeech === "string" ? item.proposedJson.partOfSpeech : undefined,
                    usageNotes: item.proposedNotes,
                    patternTemplate: typeof item.proposedJson.patternTemplate === "string" ? item.proposedJson.patternTemplate : undefined,
                    difficulty:
                        typeof item.proposedJson.difficulty === "number"
                            ? Math.max(0, Math.min(1, item.proposedJson.difficulty))
                            : undefined,
                    searchDocument: buildSearchDocument({
                        canonicalText: item.proposedText,
                        translation: item.proposedTranslation,
                        usageNotes: item.proposedNotes,
                        patternTemplate:
                            typeof item.proposedJson.patternTemplate === "string" ? item.proposedJson.patternTemplate : undefined,
                        aliases: Array.isArray(item.proposedJson.aliases)
                            ? item.proposedJson.aliases.filter((alias): alias is string => typeof alias === "string")
                            : [],
                        examples: exampleHints,
                    }),
                    embedding,
                    embeddingSourceText,
                    aliases: Array.isArray(item.proposedJson.aliases)
                        ? item.proposedJson.aliases.filter((alias): alias is string => typeof alias === "string")
                        : [],
                    examples: exampleHints.map((example) => ({
                        ...example,
                        source: "ai" as const,
                    })),
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date(),
                });
            }

            await this.occurrences.createOccurrence({
                learnableId: learnable.id,
                workspaceId: workspace.id,
                sourceSpanText: item.proposedText,
                sourceSentenceText: workspace.sourceText,
                rationale: typeof item.proposedJson.rationale === "string" ? item.proposedJson.rationale : undefined,
            });

            savedLearnables.push(learnable);
        }

        const savedWorkspace = await this.workspaces.markSaved(workspace.id, toWorkspaceReviewJson(workspace));

        return {
            workspace: savedWorkspace,
            savedLearnables,
        };
    }

    private async resolveLearnable(
        workspace: SentenceWorkspace,
        item: WorkspaceItem,
        normalizedText: string,
    ): Promise<Learnable | undefined> {
        if (item.reviewAction === "merge_existing" && item.mergeTargetLearnableId) {
            return this.learnables.findLearnableById(item.mergeTargetLearnableId);
        }

        const exact = await this.learnables.findExactMatch({
            languageId: workspace.languageId,
            type: item.proposedType,
            normalizedText,
        });

        if (exact) {
            return exact;
        }

        const alias = await this.learnables.findAliasMatch({
            languageId: workspace.languageId,
            normalizedText,
        });

        if (alias) {
            return alias;
        }

        return undefined;
    }
}

export class LearnableCatalogService {
    public constructor(
        private readonly learnables: LearnableRepository,
        private readonly workspaces: SentenceWorkspaceRepository,
        private readonly occurrences: OccurrenceRepository,
    ) {}

    public listLearnables(filters: LearnableListFilters): Promise<readonly Learnable[]> {
        return this.learnables.listLearnables(filters);
    }

    public getLearnable(learnableId: LearnableId): Promise<Learnable | undefined> {
        return this.learnables.findLearnableById(learnableId);
    }

    public listSentenceWorkspaces(createdByUserId: string, languageCode?: string): Promise<readonly SentenceWorkspace[]> {
        return this.workspaces.listWorkspaces(createdByUserId, languageCode);
    }

    public async getWorkspace(workspaceId: SentenceWorkspaceId): Promise<SentenceWorkspace | undefined> {
        return this.workspaces.findWorkspaceById(workspaceId);
    }

    public listOccurrences(learnableId: LearnableId) {
        return this.occurrences.listOccurrencesForLearnable(learnableId);
    }

    public listRelatedLearnables(learnableId: LearnableId) {
        return this.learnables.listRelatedLearnables(learnableId);
    }
}

export class SemanticSearchService {
    public constructor(
        private readonly searchRepository: LearningSearchRepository,
        private readonly embedder: LearningEmbedder,
    ) {}

    public async search(input: Omit<SemanticSearchInput, "embedding">): Promise<readonly LearnableMatch[]> {
        const embedding = await this.embedder.embed(input.query);

        return this.searchRepository.findSemanticMatches({
            ...input,
            embedding,
        });
    }
}

export { buildSearchDocument, normalizeLearnableText };
