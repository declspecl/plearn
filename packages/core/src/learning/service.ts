import type {
    ComponentProposal,
    ExplanationComponentProposal,
    ExplanationWordProposal,
    Language,
    LanguageId,
    Learnable,
    LearnableId,
    LearnableMatch,
    LearnableType,
    RelatedLearnableType,
    SentenceAnalysis,
    SentenceExplanation,
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

/** Snapshot a plain object as JSON-serializable `Record` for persistence (no `as unknown`). */
function jsonCloneAsRecord(value: object): Readonly<Record<string, unknown>> {
    return structuredClone(value) as Readonly<Record<string, unknown>>;
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
    if (typeof proposedJson.formula === "string") {
        return proposedJson.formula;
    }
    if (typeof proposedJson.patternTemplate === "string") {
        return proposedJson.patternTemplate;
    }

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

function clampConfidence(value: number) {
    return Math.max(0, Math.min(1, value));
}

function normalizePatternKey(value?: string): string | undefined {
    if (!value?.trim()) {
        return undefined;
    }

    return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function cosineSimilarity(left: readonly number[], right: readonly number[]) {
    if (left.length === 0 || left.length !== right.length) {
        return 0;
    }

    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (const [index, element] of left.entries()) {
        const leftValue = element ?? 0;
        const rightValue = right[index] ?? 0;
        dot += leftValue * rightValue;
        leftNorm += leftValue * leftValue;
        rightNorm += rightValue * rightValue;
    }

    if (leftNorm === 0 || rightNorm === 0) {
        return 0;
    }

    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
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
        proposedJson: jsonCloneAsRecord(c),
    }));

    const componentTexts = new Set(analysis.components.map((c) => normalizeLearnableText(c.text)));

    const wordItems: FlattenedItem[] = analysis.words
        .filter((w) => !componentTexts.has(normalizeLearnableText(w.text)))
        .map((w: WordProposal) => ({
            proposedType: w.learnableType,
            proposedText: w.text,
            proposedTranslation: w.meaning,
            proposedNotes: w.notes ?? "",
            proposedJson: jsonCloneAsRecord(w),
        }));

    return [...componentItems, ...wordItems];
}

function flattenExplanation(explanation: SentenceExplanation): readonly FlattenedItem[] {
    const componentItems: FlattenedItem[] = explanation.components.map((c: ExplanationComponentProposal) => ({
        proposedType: c.learnableType,
        proposedText: c.text,
        proposedTranslation: c.meaning,
        proposedNotes: c.formula + (c.notes ? `\n${c.notes}` : ""),
        proposedJson: jsonCloneAsRecord(c),
    }));

    const componentTexts = new Set(explanation.components.map((c) => normalizeLearnableText(c.text)));

    const wordItems: FlattenedItem[] = explanation.words
        .filter((w) => !componentTexts.has(normalizeLearnableText(w.text)))
        .map((w: ExplanationWordProposal) => ({
            proposedType: w.learnableType,
            proposedText: w.text,
            proposedTranslation: w.meaning,
            proposedNotes: w.notes ?? "",
            proposedJson: jsonCloneAsRecord(w),
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
        readonly clarifications?: readonly { readonly question: string; readonly answer: string }[];
    }): Promise<
        | {
              readonly status: "clarification_needed";
              readonly clarification: {
                  readonly question: string;
                  readonly options: readonly { readonly id: string; readonly label: string; readonly isRecommended: boolean }[];
              };
          }
        | {
              readonly status: "analyzed";
              readonly workspace: SentenceWorkspace;
          }
    > {
        const startedAt = performance.now();

        const aiStartedAt = performance.now();
        const analyzed = await this.analyzer.analyzeSentence({
            languageCode: input.languageCode,
            sourceText: input.sourceText,
            clarifications: input.clarifications,
        });

        if (analyzed.status === "clarification_needed") {
            logPerf("analysis.ai.clarification_needed", {
                provider: analyzed.modelProvider,
                modelId: analyzed.modelId,
                elapsedMs: Math.round(performance.now() - aiStartedAt),
            });

            return {
                status: "clarification_needed",
                clarification: analyzed.clarification,
            };
        }

        logPerf("analysis.ai.generateObject", {
            provider: analyzed.modelProvider,
            modelId: analyzed.modelId,
            elapsedMs: Math.round(performance.now() - aiStartedAt),
        });

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
                rawAnalysisJson: jsonCloneAsRecord(analyzed.analysis),
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

            return { status: "analyzed", workspace: saved };
        } catch (error) {
            await this.workspaces.markFailed(workspace.id, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    public async getWorkspace(workspaceId: SentenceWorkspaceId): Promise<SentenceWorkspace | undefined> {
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

    public async explainVietnameseSentence(input: { readonly vietnameseText: string; readonly createdByUserId: string }): Promise<{
        readonly status: "explained";
        readonly workspace: SentenceWorkspace;
    }> {
        const startedAt = performance.now();

        const aiStartedAt = performance.now();
        const result = await this.analyzer.explainVietnameseSentence({
            vietnameseText: input.vietnameseText,
        });

        logPerf("explain.ai.generateObject", {
            provider: result.modelProvider,
            modelId: result.modelId,
            elapsedMs: Math.round(performance.now() - aiStartedAt),
        });

        const createWorkspaceStartedAt = performance.now();
        const workspace = await this.workspaces.createWorkspace({
            languageCode: "vi",
            sourceText: input.vietnameseText,
            sourceLanguageCode: "vi",
            createdByUserId: input.createdByUserId,
        });
        logPerf("explain.createWorkspace", {
            workspaceId: workspace.id,
            elapsedMs: Math.round(performance.now() - createWorkspaceStartedAt),
        });

        try {
            const flattened = flattenExplanation(result.explanation);
            const items = flattened.map((item, index) => ({
                ...item,
                position: index,
            }));

            const recordAnalysisStartedAt = performance.now();
            const saved = await this.workspaces.recordAnalysis({
                workspaceId: workspace.id,
                status: "analyzed",
                analysisModelProvider: result.modelProvider,
                analysisModelId: result.modelId,
                analysisPromptVersion: result.promptVersion,
                rawAnalysisJson: jsonCloneAsRecord(result.explanation),
                summary: `${result.explanation.sentence.text} — ${result.explanation.sentence.naturalGloss}`,
                items,
            });
            logPerf("explain.recordAnalysis", {
                workspaceId: workspace.id,
                itemCount: items.length,
                elapsedMs: Math.round(performance.now() - recordAnalysisStartedAt),
            });

            logPerf("explain.total", {
                workspaceId: workspace.id,
                itemCount: items.length,
                provider: result.modelProvider,
                modelId: result.modelId,
                elapsedMs: Math.round(performance.now() - startedAt),
            });

            return { status: "explained", workspace: saved };
        } catch (error) {
            await this.workspaces.markFailed(workspace.id, error instanceof Error ? error.message : String(error));
            throw error;
        }
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
                const mergedAlias = normalizedText === current.normalizedText ? "" : item.proposedText;
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
                        aliases: [...new Set([...current.aliases, mergedAlias])].filter(Boolean),
                        examples: exampleHints,
                    }),
                    aliases: [...new Set([...current.aliases, mergedAlias])].filter(Boolean),
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
        await this.upsertDerivedRelations(workspace, savedLearnables);

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

    private async upsertDerivedRelations(workspace: SentenceWorkspace, savedLearnables: readonly Learnable[]) {
        const learnableByNormalizedText = new Map(savedLearnables.map((learnable) => [learnable.normalizedText, learnable]));
        const relations = new Map<
            string,
            {
                readonly fromLearnableId: LearnableId;
                readonly toLearnableId: LearnableId;
                readonly relationType: RelatedLearnableType;
                confidence: number;
            }
        >();

        const addRelation = (
            leftId: LearnableId,
            rightId: LearnableId,
            relationType: RelatedLearnableType,
            confidence: number,
            bidirectional = true,
        ) => {
            if (leftId === rightId) {
                return;
            }

            const upsert = (fromLearnableId: LearnableId, toLearnableId: LearnableId) => {
                const key = `${relationType}:${fromLearnableId}:${toLearnableId}`;
                const existing = relations.get(key);

                if (existing) {
                    existing.confidence = Math.max(existing.confidence, confidence);

                    return;
                }

                relations.set(key, {
                    fromLearnableId,
                    toLearnableId,
                    relationType,
                    confidence,
                });
            };

            upsert(leftId, rightId);
            if (bidirectional) {
                upsert(rightId, leftId);
            }
        };

        for (let index = 0; index < savedLearnables.length; index += 1) {
            for (let innerIndex = index + 1; innerIndex < savedLearnables.length; innerIndex += 1) {
                addRelation(savedLearnables[index]!.id, savedLearnables[innerIndex]!.id, "related_phrase", 0.62);
            }
        }

        const groupedByPattern = new Map<string, Learnable[]>();
        for (const learnable of savedLearnables) {
            const patternKey = normalizePatternKey(learnable.patternTemplate);
            if (!patternKey) {
                continue;
            }

            const current = groupedByPattern.get(patternKey) ?? [];
            current.push(learnable);
            groupedByPattern.set(patternKey, current);
        }

        for (const group of groupedByPattern.values()) {
            for (let index = 0; index < group.length; index += 1) {
                for (let innerIndex = index + 1; innerIndex < group.length; innerIndex += 1) {
                    addRelation(group[index]!.id, group[innerIndex]!.id, "same_pattern_family", 0.9);
                }
            }
        }

        const activeItems = workspace.items.filter((item) => item.reviewAction !== "reject");
        for (const item of activeItems) {
            if (item.proposedType !== "grammar_pattern" && item.proposedType !== "phrase") {
                continue;
            }

            const containerText = normalizeLearnableText(item.proposedText);
            const containerLearnable = learnableByNormalizedText.get(containerText);
            if (!containerLearnable) {
                continue;
            }

            for (const candidate of activeItems) {
                if (candidate.id === item.id) {
                    continue;
                }

                const candidateText = normalizeLearnableText(candidate.proposedText);
                const candidateLearnable = learnableByNormalizedText.get(candidateText);
                if (!candidateLearnable) {
                    continue;
                }

                if (containerText.includes(candidateText)) {
                    addRelation(containerLearnable.id, candidateLearnable.id, "related_phrase", 0.78);
                }
            }
        }

        await this.learnables.upsertRelatedLearnables(
            [...relations.values()].map((relation) => ({
                fromLearnableId: relation.fromLearnableId,
                toLearnableId: relation.toLearnableId,
                relationType: relation.relationType,
                confidence: clampConfidence(relation.confidence),
            })),
        );

        await this.computeComponentRelations(workspace.languageId, savedLearnables);
    }

    private async computeComponentRelations(languageId: LanguageId, learnables: readonly Learnable[]) {
        const componentRelations: {
            fromLearnableId: LearnableId;
            toLearnableId: LearnableId;
            relationType: RelatedLearnableType;
            confidence: number;
        }[] = [];

        for (const learnable of learnables) {
            const words = learnable.normalizedText.trim().split(/\s+/);
            if (words.length < 2) continue;

            const subphrases: string[] = [];
            for (let start = 0; start < words.length; start++) {
                for (let len = 1; len <= words.length - start; len++) {
                    if (start === 0 && len === words.length) continue;
                    subphrases.push(words.slice(start, start + len).join(" "));
                }
            }

            const unique = [...new Set(subphrases)];
            const matches = await this.learnables.findAllByNormalizedTexts({ languageId, normalizedTexts: unique });

            for (const match of matches) {
                if (match.id === learnable.id) continue;
                componentRelations.push({
                    fromLearnableId: learnable.id,
                    toLearnableId: match.id,
                    relationType: "contains_component",
                    confidence: 1,
                });
            }
        }

        if (componentRelations.length > 0) {
            await this.learnables.upsertRelatedLearnables(componentRelations);
        }
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

    public listLearnableBacklinks(learnableId: LearnableId) {
        return this.learnables.listLearnableBacklinks(learnableId);
    }

    public async annotateText(languageCode: string, text: string): Promise<readonly Learnable[]> {
        const language = await this.learnables.findLanguageByCode(languageCode);
        if (!language) return [];

        const words = normalizeLearnableText(text).split(/\s+/).filter(Boolean);
        const subphrases: string[] = [];
        for (let start = 0; start < words.length; start++) {
            for (let len = 1; len <= words.length - start; len++) {
                subphrases.push(words.slice(start, start + len).join(" "));
            }
        }

        const unique = [...new Set(subphrases)];

        return this.learnables.findAllByNormalizedTextsOrAliases({ languageId: language.id, normalizedTexts: unique });
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
        const [explicitEdges, occurrences] = await Promise.all([
            this.learnables.listAllRelatedLearnables(language.id),
            this.occurrences.listOccurrencesForLanguage(language.id),
        ]);
        const edgeMap = new Map<string, LearnableGraphEdge>();
        const setEdge = (edge: LearnableGraphEdge) => {
            const key = `${edge.relationType}:${edge.fromId}:${edge.toId}`;
            const current = edgeMap.get(key);

            if (!current || current.confidence < edge.confidence) {
                edgeMap.set(key, edge);
            }
        };

        for (const edge of explicitEdges) {
            if (!nodeIds.has(edge.fromLearnableId) || !nodeIds.has(edge.toLearnableId)) {
                continue;
            }

            setEdge({
                id: edge.id,
                fromId: edge.fromLearnableId,
                toId: edge.toLearnableId,
                relationType: edge.relationType,
                confidence: edge.confidence,
            });
        }

        const occurrenceBuckets = new Map<string, Set<LearnableId>>();
        for (const occurrence of occurrences) {
            if (!nodeIds.has(occurrence.learnableId)) {
                continue;
            }

            const bucket = occurrenceBuckets.get(occurrence.workspaceId) ?? new Set<LearnableId>();
            bucket.add(occurrence.learnableId);
            occurrenceBuckets.set(occurrence.workspaceId, bucket);
        }

        const cooccurrenceCounts = new Map<string, { leftId: LearnableId; rightId: LearnableId; count: number }>();
        for (const bucket of occurrenceBuckets.values()) {
            const ids = [...bucket];
            for (let index = 0; index < ids.length; index += 1) {
                for (let innerIndex = index + 1; innerIndex < ids.length; innerIndex += 1) {
                    const leftId = ids[index]!;
                    const rightId = ids[innerIndex]!;
                    const forwardKey = `related_phrase:${leftId}:${rightId}`;
                    const backwardKey = `related_phrase:${rightId}:${leftId}`;
                    const forward = cooccurrenceCounts.get(forwardKey) ?? { leftId, rightId, count: 0 };
                    const backward = cooccurrenceCounts.get(backwardKey) ?? { leftId: rightId, rightId: leftId, count: 0 };
                    forward.count += 1;
                    backward.count += 1;
                    cooccurrenceCounts.set(forwardKey, forward);
                    cooccurrenceCounts.set(backwardKey, backward);
                }
            }
        }

        for (const pair of cooccurrenceCounts.values()) {
            setEdge({
                id: `cooccurrence:${pair.leftId}:${pair.rightId}`,
                fromId: pair.leftId,
                toId: pair.rightId,
                relationType: "related_phrase",
                confidence: clampConfidence(0.34 + pair.count * 0.18),
            });
        }

        const patternBuckets = new Map<string, LearnableGraphNode[]>();
        for (const learnable of learnables) {
            const patternKey = normalizePatternKey(learnable.patternTemplate);
            if (!patternKey || !nodeIds.has(learnable.id)) {
                continue;
            }

            const current = patternBuckets.get(patternKey) ?? [];
            current.push({
                id: learnable.id,
                type: learnable.type,
                canonicalText: learnable.canonicalText,
                translation: learnable.translation,
                occurrenceCount: learnable.occurrenceCount,
                difficulty: learnable.difficulty,
            });
            patternBuckets.set(patternKey, current);
        }

        for (const group of patternBuckets.values()) {
            for (let index = 0; index < group.length; index += 1) {
                for (let innerIndex = index + 1; innerIndex < group.length; innerIndex += 1) {
                    const left = group[index]!;
                    const right = group[innerIndex]!;
                    setEdge({
                        id: `pattern:${left.id}:${right.id}`,
                        fromId: left.id,
                        toId: right.id,
                        relationType: "same_pattern_family",
                        confidence: 0.9,
                    });
                    setEdge({
                        id: `pattern:${right.id}:${left.id}`,
                        fromId: right.id,
                        toId: left.id,
                        relationType: "same_pattern_family",
                        confidence: 0.9,
                    });
                }
            }
        }

        const degrees = new Map<string, number>();
        for (const edge of edgeMap.values()) {
            degrees.set(edge.fromId, (degrees.get(edge.fromId) ?? 0) + 1);
            degrees.set(edge.toId, (degrees.get(edge.toId) ?? 0) + 1);
        }

        const learnablesById = new Map(learnables.map((learnable) => [learnable.id, learnable]));
        for (const learnable of learnables) {
            if ((degrees.get(learnable.id) ?? 0) > 0 || !learnable.embedding?.length) {
                continue;
            }

            const semanticNeighbors = learnables
                .filter((candidate) => candidate.id !== learnable.id && candidate.embedding?.length === learnable.embedding?.length)
                .map((candidate) => ({
                    id: candidate.id,
                    similarity: cosineSimilarity(learnable.embedding ?? [], candidate.embedding ?? []),
                }))
                .filter((candidate) => candidate.similarity >= 0.72)
                .sort((left, right) => right.similarity - left.similarity)
                .slice(0, 2);

            for (const neighbor of semanticNeighbors) {
                if (!learnablesById.has(neighbor.id)) {
                    continue;
                }

                setEdge({
                    id: `semantic:${learnable.id}:${neighbor.id}`,
                    fromId: learnable.id,
                    toId: neighbor.id,
                    relationType: "similar_meaning",
                    confidence: clampConfidence(neighbor.similarity),
                });
            }
        }

        return {
            nodes,
            edges: [...edgeMap.values()],
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
