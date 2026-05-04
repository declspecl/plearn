import type {
    ComponentProposal,
    Language,
    Learnable,
    LearnableId,
    LearnableMatch,
    LearnableType,
    RelatedLearnableType,
    SentenceAnalysis,
    SentenceWorkspace,
    SentenceWorkspaceId,
    WordProposal,
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
import { performance } from "node:perf_hooks";

function normalizeLearnableText(value: string): string {
    return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function logPerf(message: string, metadata: Readonly<Record<string, unknown>>) {
    console.info(`[PERF] ${message}`, metadata);
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

function extractPatternTemplate(proposedJson: Readonly<Record<string, unknown>>): string | undefined {
    if (typeof proposedJson.formula === "string") return proposedJson.formula;
    if (typeof proposedJson.patternTemplate === "string") return proposedJson.patternTemplate;
    return undefined;
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

interface FlattenedItem {
    readonly proposedType: LearnableType;
    readonly proposedText: string;
    readonly proposedTranslation: string;
    readonly proposedNotes: string;
    readonly proposedJson: Readonly<Record<string, unknown>>;
}

export interface LearnableGraphNode {
    readonly id: LearnableId;
    readonly type: LearnableType;
    readonly canonicalText: string;
    readonly translation: string;
    readonly occurrenceCount: number;
    readonly difficulty?: number;
}

export interface LearnableGraphEdge {
    readonly id: string;
    readonly fromId: LearnableId;
    readonly toId: LearnableId;
    readonly relationType: RelatedLearnableType;
    readonly confidence: number;
}

export interface LearnableGraph {
    readonly nodes: readonly LearnableGraphNode[];
    readonly edges: readonly LearnableGraphEdge[];
}

function flattenAnalysis(analysis: SentenceAnalysis): readonly FlattenedItem[] {
    const componentItems: FlattenedItem[] = analysis.components.map((c: ComponentProposal) => ({
        proposedType: c.learnableType,
        proposedText: c.text,
        proposedTranslation: c.meaning,
        proposedNotes: c.formula + (c.notes ? `\n${c.notes}` : ""),
        proposedJson: c as unknown as Readonly<Record<string, unknown>>,
    }));

    const componentTexts = new Set(analysis.components.map((c) => normalizeLearnableText(c.text)));

    const wordItems: FlattenedItem[] = analysis.words
        .filter((w) => !componentTexts.has(normalizeLearnableText(w.text)))
        .map((w: WordProposal) => ({
            proposedType: w.learnableType,
            proposedText: w.text,
            proposedTranslation: w.meaning,
            proposedNotes: w.notes ?? "",
            proposedJson: w as unknown as Readonly<Record<string, unknown>>,
        }));

    return [...componentItems, ...wordItems];
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
        const startedAt = performance.now();
        const createWorkspaceStartedAt = performance.now();
        const workspace = await this.workspaces.createWorkspace({
            languageCode: input.languageCode,
            sourceText: input.sourceText,
            sourceLanguageCode: "en",
            createdByUserId: input.createdByUserId,
        });
        logPerf("analysis.createWorkspace", {
            workspaceId: workspace.id,
            elapsedMs: Math.round(performance.now() - createWorkspaceStartedAt),
        });

        try {
            const aiStartedAt = performance.now();
            const analyzed = await this.analyzer.analyzeSentence({
                languageCode: input.languageCode,
                sourceText: input.sourceText,
            });
            logPerf("analysis.ai.generateObject", {
                workspaceId: workspace.id,
                provider: analyzed.modelProvider,
                modelId: analyzed.modelId,
                elapsedMs: Math.round(performance.now() - aiStartedAt),
            });

            const flattened = flattenAnalysis(analyzed.analysis);
            const items = flattened.map((item, index) => ({
                ...item,
                position: index,
            }));

            const recordAnalysisStartedAt = performance.now();
            const saved = await this.workspaces.recordAnalysis({
                workspaceId: workspace.id,
                status: "analyzed",
                analysisModelProvider: analyzed.modelProvider,
                analysisModelId: analyzed.modelId,
                analysisPromptVersion: analyzed.promptVersion,
                rawAnalysisJson: analyzed.analysis as unknown as Readonly<Record<string, unknown>>,
                summary: `${analyzed.analysis.sentence.text} — ${analyzed.analysis.sentence.meaning}`,
                items,
            });
            logPerf("analysis.recordAnalysis", {
                workspaceId: workspace.id,
                itemCount: items.length,
                elapsedMs: Math.round(performance.now() - recordAnalysisStartedAt),
            });

            logPerf("analysis.total", {
                workspaceId: workspace.id,
                itemCount: items.length,
                provider: analyzed.modelProvider,
                modelId: analyzed.modelId,
                elapsedMs: Math.round(performance.now() - startedAt),
            });

            return saved;
        } catch (error) {
            await this.workspaces.markFailed(workspace.id, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async getWorkspace(workspaceId: SentenceWorkspaceId, _languageCode: string): Promise<SentenceWorkspace | undefined> {
        const workspace = await this.workspaces.findWorkspaceById(workspaceId);

        if (!workspace) {
            return undefined;
        }

        return workspace;
    }

    public async computeWorkspaceSuggestions(
        workspaceId: SentenceWorkspaceId,
        languageCode: string,
    ): Promise<SentenceWorkspace | undefined> {
        const startedAt = performance.now();
        const workspace = await this.workspaces.findWorkspaceById(workspaceId);
        if (!workspace) {
            return undefined;
        }

        if (workspace.items.every((item) => item.suggestionsStatus === "ready")) {
            return workspace;
        }

        const batchSuggestions = await this.search.findLexicalMatchesBatch({
            languageCode,
            items: workspace.items.map((item) => ({
                workspaceItemId: item.id,
                type: item.proposedType,
                query: item.proposedText,
                limit: 3,
            })),
        });

        const items = await Promise.all(
            workspace.items.map(async (item) => {
                await this.workspaces.setWorkspaceItemSuggestionStatus({
                    workspaceItemId: item.id,
                    status: "loading",
                });
                const suggestions = batchSuggestions[item.id] ?? [];

                await this.workspaces.setWorkspaceItemSuggestions({
                    workspaceItemId: item.id,
                    duplicateSuggestions: suggestions,
                    status: "ready",
                });

                return {
                    ...item,
                    duplicateSuggestions: suggestions,
                    suggestionsStatus: "ready" as const,
                    duplicateSuggestionsError: undefined,
                    duplicateSuggestionsLastComputedAt: new Date(),
                    mergeTargetLearnableId:
                        item.mergeTargetLearnableId ?? suggestions.find((suggestion) => suggestion.confidence >= 0.85)?.learnable.id,
                    reviewAction:
                        item.reviewAction === "pending"
                            ? suggestions.some((suggestion) => suggestion.confidence >= 0.85)
                                ? "merge_existing"
                                : "create_new"
                            : item.reviewAction,
                } satisfies WorkspaceItem;
            }),
        );

        logPerf("analysis.attachSuggestions", {
            workspaceId,
            itemCount: items.length,
            elapsedMs: Math.round(performance.now() - startedAt),
        });

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
        private readonly embedder: LearningEmbedder,
    ) {}

    public async updateWorkspaceReview(input: UpdateWorkspaceReviewInput & { readonly languageCode: string }): Promise<SentenceWorkspace> {
        const updated = await this.workspaces.updateReview(input);
        await Promise.all(
            updated.items.map((item) =>
                this.workspaces.setWorkspaceItemSuggestionStatus({
                    workspaceItemId: item.id,
                    status: "idle",
                }),
            ),
        );
        const refreshed = await this.workspaces.findWorkspaceById(updated.id);
        return refreshed ?? updated;
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
                    patternTemplate: extractPatternTemplate(item.proposedJson) ?? current.patternTemplate,
                    searchDocument: buildSearchDocument({
                        canonicalText: current.canonicalText,
                        translation: item.proposedTranslation,
                        usageNotes: item.proposedNotes,
                        patternTemplate: extractPatternTemplate(item.proposedJson),
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
                    patternTemplate: extractPatternTemplate(item.proposedJson),
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
                    patternTemplate: extractPatternTemplate(item.proposedJson),
                    difficulty:
                        typeof item.proposedJson.difficulty === "number"
                            ? Math.max(0, Math.min(1, item.proposedJson.difficulty))
                            : undefined,
                    searchDocument: buildSearchDocument({
                        canonicalText: item.proposedText,
                        translation: item.proposedTranslation,
                        usageNotes: item.proposedNotes,
                        patternTemplate: extractPatternTemplate(item.proposedJson),
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

    public listSentenceWorkspaces(
        createdByUserId: string,
        languageCode?: string,
        options?: { readonly query?: string; readonly limit?: number; readonly offset?: number },
    ): Promise<readonly SentenceWorkspace[]> {
        return this.workspaces.listWorkspaces(createdByUserId, languageCode, {
            includeItems: false,
            query: options?.query,
            limit: options?.limit ?? 200,
            offset: options?.offset ?? 0,
        });
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

    public async getLearnableGraph(
        languageCode: string,
        filters?: {
            readonly types?: readonly LearnableType[];
            readonly limit?: number;
            readonly minOccurrenceCount?: number;
        },
    ): Promise<LearnableGraph> {
        const language = await this.learnables.findLanguageByCode(languageCode);

        if (!language) {
            return { nodes: [], edges: [] };
        }

        return this.buildLearnableGraph(language, filters);
    }

    public async lookupByText(languageCode: string, text: string): Promise<Learnable | null> {
        const language = await this.learnables.findLanguageByCode(languageCode);
        if (!language) return null;

        const normalizedText = normalizeLearnableText(text);
        const matches = await this.learnables.findAllByNormalizedText({ languageId: language.id, normalizedText });
        if (matches.length > 0) return matches[0]!;

        return (await this.learnables.findAliasMatch({ languageId: language.id, normalizedText })) ?? null;
    }

    private async buildLearnableGraph(
        language: Language,
        filters?: {
            readonly types?: readonly LearnableType[];
            readonly limit?: number;
            readonly minOccurrenceCount?: number;
        },
    ): Promise<LearnableGraph> {
        const learnables = await this.learnables.listLearnables({
            languageCode: language.code,
            types: filters?.types,
            archived: false,
            minOccurrenceCount: filters?.minOccurrenceCount,
            limit: Math.min(filters?.limit ?? 300, 300),
            sort: "frequency",
        });
        const nodes = learnables.map(
            (learnable) =>
                ({
                    id: learnable.id,
                    type: learnable.type,
                    canonicalText: learnable.canonicalText,
                    translation: learnable.translation,
                    occurrenceCount: learnable.occurrenceCount,
                    difficulty: learnable.difficulty,
                }) satisfies LearnableGraphNode,
        );
        const nodeIds = new Set(nodes.map((node) => node.id));
        const edges = await this.learnables.listAllRelatedLearnables(language.id);

        return {
            nodes,
            edges: edges
                .filter((edge) => nodeIds.has(edge.fromLearnableId) && nodeIds.has(edge.toLearnableId))
                .map(
                    (edge) =>
                        ({
                            id: edge.id,
                            fromId: edge.fromLearnableId,
                            toId: edge.toLearnableId,
                            relationType: edge.relationType,
                            confidence: edge.confidence,
                        }) satisfies LearnableGraphEdge,
                ),
        };
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
