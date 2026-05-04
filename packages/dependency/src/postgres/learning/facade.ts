import { LearningConverter } from "./converter";
import type { CreateLearnableInput, LearnableMatch, UpdateLearnableInput } from "@plearn/core/learning/model";
import type {
    CreateWorkspaceInput,
    LearnableListFilters,
    LearnableRepository,
    LearningSearchRepository,
    OccurrenceRepository,
    RecordWorkspaceAnalysisInput,
    SemanticSearchInput,
    SentenceWorkspaceRepository,
    UpdateWorkspaceReviewInput,
} from "@plearn/core/learning/repository";
import type { DatabaseInstance } from "@plearn/db/client";
import {
    learningLanguages,
    learningLearnableAliases,
    learningLearnableExamples,
    learningLearnables,
    learningOccurrences,
    learningRelatedLearnables,
    learningSentenceWorkspaces,
    learningWorkspaceItems,
} from "@plearn/db/schema";
import { and, asc, cosineDistance, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

function toArray<T>(value: readonly T[] | undefined): T[] {
    return value ? [...value] : [];
}

function logQueryTiming(method: string, start: number) {
    const elapsed = Math.round(performance.now() - start);
    if (elapsed > 300) {
        console.warn(`[PERF][DB][HIGH] ${method}`, { elapsedMs: elapsed });
    } else if (elapsed > 100) {
        console.warn(`[PERF][DB][SLOW] ${method}`, { elapsedMs: elapsed });
    } else {
        console.info(`[PERF][DB] ${method}`, { elapsedMs: elapsed });
    }
}

function normalizeQuery(value: string): string {
    return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

export class LearningFacade implements SentenceWorkspaceRepository, LearnableRepository, OccurrenceRepository, LearningSearchRepository {
    public constructor(
        private readonly database: DatabaseInstance,
        private readonly converter: LearningConverter,
    ) {}

    public async createWorkspace(input: CreateWorkspaceInput) {
        const language = await this.findLanguageByCode(input.languageCode);

        if (!language) {
            throw new Error(`Language not found: ${input.languageCode}`);
        }

        const [row] = await this.database
            .insert(learningSentenceWorkspaces)
            .values({
                id: randomUUID(),
                languageId: language.id,
                sourceText: input.sourceText,
                sourceLanguageCode: input.sourceLanguageCode,
                createdByUserId: input.createdByUserId,
            })
            .returning();

        if (!row) {
            throw new Error("Workspace insert returned no row");
        }

        return this.converter.convertWorkspace(row, []);
    }

    public async recordAnalysis(input: RecordWorkspaceAnalysisInput) {
        await this.database.delete(learningWorkspaceItems).where(eq(learningWorkspaceItems.workspaceId, input.workspaceId));

        const [workspaceRow] = await this.database
            .update(learningSentenceWorkspaces)
            .set({
                status: input.status,
                analysisModelProvider: input.analysisModelProvider,
                analysisModelId: input.analysisModelId,
                analysisPromptVersion: input.analysisPromptVersion,
                rawAnalysisJson: input.rawAnalysisJson,
                summary: input.summary,
                updatedAt: new Date(),
            })
            .where(eq(learningSentenceWorkspaces.id, input.workspaceId))
            .returning();

        if (!workspaceRow) {
            throw new Error(`Workspace not found: ${input.workspaceId}`);
        }

        const itemRows =
            input.items.length === 0
                ? []
                : await this.database
                      .insert(learningWorkspaceItems)
                      .values(
                          input.items.map((item) => ({
                              id: randomUUID(),
                              workspaceId: input.workspaceId,
                              proposedType: item.proposedType,
                              proposedText: item.proposedText,
                              proposedTranslation: item.proposedTranslation,
                              proposedNotes: item.proposedNotes,
                              proposedJson: item.proposedJson,
                              position: item.position,
                          })),
                      )
                      .returning();

        return this.converter.convertWorkspace(
            workspaceRow,
            itemRows.sort((left, right) => left.position - right.position).map((item) => this.converter.convertWorkspaceItem(item)),
        );
    }

    public async updateReview(input: UpdateWorkspaceReviewInput) {
        for (const item of input.items) {
            await this.database
                .update(learningWorkspaceItems)
                .set({
                    proposedText: item.proposedText,
                    proposedTranslation: item.proposedTranslation,
                    proposedNotes: item.proposedNotes,
                    proposedJson: item.proposedJson,
                    reviewAction: item.reviewAction,
                    mergeTargetLearnableId: item.mergeTargetLearnableId,
                    duplicateSuggestionsStatus: "idle",
                    duplicateSuggestionsJson: null,
                    duplicateSuggestionsComputedAt: null,
                    duplicateSuggestionsError: null,
                })
                .where(eq(learningWorkspaceItems.id, item.id));
        }

        const [workspaceRow] = await this.database
            .update(learningSentenceWorkspaces)
            .set({
                reviewedAnalysisJson: input.reviewedAnalysisJson,
                status: "reviewed",
                updatedAt: new Date(),
            })
            .where(eq(learningSentenceWorkspaces.id, input.workspaceId))
            .returning();

        if (!workspaceRow) {
            throw new Error(`Workspace not found: ${input.workspaceId}`);
        }

        const itemRows = await this.database
            .select()
            .from(learningWorkspaceItems)
            .where(eq(learningWorkspaceItems.workspaceId, input.workspaceId))
            .orderBy(asc(learningWorkspaceItems.position));

        return this.converter.convertWorkspace(
            workspaceRow,
            itemRows.map((item) => this.converter.convertWorkspaceItem(item)),
        );
    }

    public async markFailed(workspaceId: string, errorMessage: string): Promise<void> {
        await this.database
            .update(learningSentenceWorkspaces)
            .set({
                status: "failed",
                errorMessage,
                updatedAt: new Date(),
            })
            .where(eq(learningSentenceWorkspaces.id, workspaceId));
    }

    public async setWorkspaceItemSuggestions(input: {
        readonly workspaceItemId: string;
        readonly duplicateSuggestions: readonly LearnableMatch[];
        readonly status: "idle" | "loading" | "ready" | "failed";
        readonly error?: string;
    }): Promise<void> {
        await this.database
            .update(learningWorkspaceItems)
            .set({
                duplicateSuggestionsJson: input.duplicateSuggestions as unknown as Record<string, unknown>,
                duplicateSuggestionsStatus: input.status,
                duplicateSuggestionsComputedAt: new Date(),
                duplicateSuggestionsError: input.error ?? null,
            })
            .where(eq(learningWorkspaceItems.id, input.workspaceItemId));
    }

    public async setWorkspaceItemSuggestionStatus(input: {
        readonly workspaceItemId: string;
        readonly status: "idle" | "loading" | "ready" | "failed";
        readonly error?: string;
    }): Promise<void> {
        await this.database
            .update(learningWorkspaceItems)
            .set({
                duplicateSuggestionsStatus: input.status,
                duplicateSuggestionsError: input.error ?? null,
                duplicateSuggestionsComputedAt: input.status === "ready" || input.status === "failed" ? new Date() : null,
            })
            .where(eq(learningWorkspaceItems.id, input.workspaceItemId));
    }

    public async markSaved(workspaceId: string, reviewedAnalysisJson: Readonly<Record<string, unknown>>) {
        const [workspaceRow] = await this.database
            .update(learningSentenceWorkspaces)
            .set({
                status: "saved",
                reviewedAnalysisJson,
                updatedAt: new Date(),
            })
            .where(eq(learningSentenceWorkspaces.id, workspaceId))
            .returning();

        if (!workspaceRow) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }

        const itemRows = await this.database
            .select()
            .from(learningWorkspaceItems)
            .where(eq(learningWorkspaceItems.workspaceId, workspaceId))
            .orderBy(asc(learningWorkspaceItems.position));

        return this.converter.convertWorkspace(
            workspaceRow,
            itemRows.map((item) => this.converter.convertWorkspaceItem(item)),
        );
    }

    public async findWorkspaceById(workspaceId: string) {
        const startedAt = performance.now();
        const [workspaceRow] = await this.database
            .select()
            .from(learningSentenceWorkspaces)
            .where(eq(learningSentenceWorkspaces.id, workspaceId))
            .limit(1);

        if (!workspaceRow) {
            logQueryTiming("findWorkspaceById", startedAt);
            return undefined;
        }

        const itemRows = await this.database
            .select()
            .from(learningWorkspaceItems)
            .where(eq(learningWorkspaceItems.workspaceId, workspaceId))
            .orderBy(asc(learningWorkspaceItems.position));

        const result = this.converter.convertWorkspace(
            workspaceRow,
            itemRows.map((item) => this.converter.convertWorkspaceItem(item)),
        );
        logQueryTiming("findWorkspaceById", startedAt);
        return result;
    }

    public async listWorkspaces(
        createdByUserId: string,
        languageCode?: string,
        options?: { readonly query?: string; readonly limit?: number; readonly offset?: number; readonly includeItems?: boolean },
    ) {
        const startedAt = performance.now();
        const language = languageCode ? await this.findLanguageByCode(languageCode) : undefined;
        const conditions = [eq(learningSentenceWorkspaces.createdByUserId, createdByUserId)];

        if (language) {
            conditions.push(eq(learningSentenceWorkspaces.languageId, language.id));
        }

        if (options?.query?.trim()) {
            conditions.push(
                or(
                    ilike(learningSentenceWorkspaces.sourceText, `%${options.query}%`),
                    ilike(learningSentenceWorkspaces.summary, `%${options.query}%`),
                )!,
            );
        }

        const rows = await this.database
            .select()
            .from(learningSentenceWorkspaces)
            .where(and(...conditions))
            .orderBy(desc(learningSentenceWorkspaces.createdAt))
            .limit(options?.limit ?? 50)
            .offset(options?.offset ?? 0);

        const shouldIncludeItems = options?.includeItems ?? true;
        const items =
            shouldIncludeItems && rows.length
                ? await this.database
                      .select()
                      .from(learningWorkspaceItems)
                      .where(
                          inArray(
                              learningWorkspaceItems.workspaceId,
                              rows.map((row) => row.id),
                          ),
                      )
                      .orderBy(asc(learningWorkspaceItems.position))
                : [];

        const result = rows.map((row) =>
            this.converter.convertWorkspace(
                row,
                shouldIncludeItems
                    ? items.filter((item) => item.workspaceId === row.id).map((item) => this.converter.convertWorkspaceItem(item))
                    : [],
            ),
        );

        logQueryTiming("listWorkspaces", startedAt);
        return result;
    }

    public async findLanguageByCode(code: string) {
        const [row] = await this.database.select().from(learningLanguages).where(eq(learningLanguages.code, code)).limit(1);
        return row ? this.converter.convertLanguage(row) : undefined;
    }

    public async listLearnables(filters: LearnableListFilters) {
        const startedAt = performance.now();
        const language = filters.languageCode ? await this.findLanguageByCode(filters.languageCode) : undefined;
        const conditions = [];

        if (language) {
            conditions.push(eq(learningLearnables.languageId, language.id));
        }

        if (filters.types?.length) {
            conditions.push(inArray(learningLearnables.type, toArray(filters.types)));
        }

        if (filters.query?.trim()) {
            conditions.push(
                or(
                    ilike(learningLearnables.canonicalText, `%${filters.query}%`),
                    ilike(learningLearnables.translation, `%${filters.query}%`),
                    ilike(learningLearnables.usageNotes, `%${filters.query}%`),
                    ilike(learningLearnables.searchDocument, `%${filters.query}%`),
                ),
            );
        }

        if (filters.archived === true) {
            conditions.push(isNotNull(learningLearnables.archivedAt));
        }

        if (filters.archived === false) {
            conditions.push(isNull(learningLearnables.archivedAt));
        }

        if (typeof filters.minOccurrenceCount === "number") {
            conditions.push(gte(learningLearnables.occurrenceCount, filters.minOccurrenceCount));
        }

        if (typeof filters.maxOccurrenceCount === "number") {
            conditions.push(lte(learningLearnables.occurrenceCount, filters.maxOccurrenceCount));
        }

        const orderBy =
            filters.sort === "alphabetical"
                ? asc(learningLearnables.canonicalText)
                : filters.sort === "newest"
                  ? desc(learningLearnables.createdAt)
                  : filters.sort === "last_seen"
                    ? desc(learningLearnables.lastSeenAt)
                    : desc(learningLearnables.occurrenceCount);

        const rows = await this.database
            .select()
            .from(learningLearnables)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(filters.limit ?? 50)
            .offset(filters.offset ?? 0);

        const learnables = await this.hydrateLearnables(rows);

        if (filters.hasExamples === true) {
            const result = learnables.filter((learnable) => learnable.examples.length > 0);
            logQueryTiming("listLearnables", startedAt);
            return result;
        }

        logQueryTiming("listLearnables", startedAt);
        return learnables;
    }

    public async findLearnableById(id: string) {
        const startedAt = performance.now();
        const [row] = await this.database.select().from(learningLearnables).where(eq(learningLearnables.id, id)).limit(1);
        if (!row) {
            logQueryTiming("findLearnableById", startedAt);
            return undefined;
        }
        const [learnable] = await this.hydrateLearnables([row]);
        logQueryTiming("findLearnableById", startedAt);
        return learnable;
    }

    public async findExactMatch(input: { languageId: string; type: typeof learningLearnables.$inferSelect.type; normalizedText: string }) {
        const [row] = await this.database
            .select()
            .from(learningLearnables)
            .where(
                and(
                    eq(learningLearnables.languageId, input.languageId),
                    eq(learningLearnables.type, input.type),
                    eq(learningLearnables.normalizedText, input.normalizedText),
                ),
            )
            .limit(1);
        if (!row) {
            return undefined;
        }
        const [learnable] = await this.hydrateLearnables([row]);
        return learnable;
    }

    public async findAllByNormalizedText(input: { languageId: string; normalizedText: string }) {
        const rows = await this.database
            .select()
            .from(learningLearnables)
            .where(and(eq(learningLearnables.languageId, input.languageId), eq(learningLearnables.normalizedText, input.normalizedText)));
        return this.hydrateLearnables(rows);
    }

    public async findAliasMatch(input: { languageId: string; normalizedText: string }) {
        const [alias] = await this.database
            .select()
            .from(learningLearnableAliases)
            .where(
                and(
                    eq(learningLearnableAliases.languageId, input.languageId),
                    eq(learningLearnableAliases.normalizedAliasText, input.normalizedText),
                ),
            )
            .limit(1);

        if (!alias) {
            return undefined;
        }

        return this.findLearnableById(alias.learnableId);
    }

    public async createLearnable(input: CreateLearnableInput) {
        const [row] = await this.database
            .insert(learningLearnables)
            .values({
                id: randomUUID(),
                languageId: input.languageId,
                type: input.type,
                canonicalText: input.canonicalText,
                normalizedText: input.normalizedText,
                translation: input.translation,
                partOfSpeech: input.partOfSpeech,
                usageNotes: input.usageNotes,
                patternTemplate: input.patternTemplate,
                difficulty: input.difficulty,
                searchDocument: input.searchDocument,
                embedding: input.embedding,
                embeddingSourceText: input.embeddingSourceText,
                occurrenceCount: 1,
                firstSeenAt: input.firstSeenAt,
                lastSeenAt: input.lastSeenAt,
            })
            .returning();

        if (!row) {
            throw new Error("Learnable insert returned no row");
        }

        await this.replaceAliases(row.id, input.languageId, input.aliases);
        await this.replaceExamples(row.id, input.examples);

        const [learnable] = await this.hydrateLearnables([row]);
        if (!learnable) {
            throw new Error(`Learnable hydration failed after create: ${row.id}`);
        }
        return learnable;
    }

    public async updateLearnable(id: string, input: UpdateLearnableInput) {
        const [current] = await this.database.select().from(learningLearnables).where(eq(learningLearnables.id, id)).limit(1);

        if (!current) {
            throw new Error(`Learnable not found: ${id}`);
        }

        const [row] = await this.database
            .update(learningLearnables)
            .set({
                translation: input.translation,
                partOfSpeech: input.partOfSpeech,
                usageNotes: input.usageNotes,
                patternTemplate: input.patternTemplate,
                difficulty: input.difficulty,
                searchDocument: input.searchDocument,
                embedding: input.embedding,
                embeddingSourceText: input.embeddingSourceText,
                occurrenceCount: input.occurrenceCount,
                lastSeenAt: input.lastSeenAt,
                updatedAt: new Date(),
            })
            .where(eq(learningLearnables.id, id))
            .returning();

        if (!row) {
            throw new Error(`Learnable not found: ${id}`);
        }

        if (input.aliases) {
            await this.replaceAliases(id, row.languageId, input.aliases);
        }

        if (input.examples) {
            await this.replaceExamples(id, input.examples);
        }

        const [learnable] = await this.hydrateLearnables([row]);
        if (!learnable) {
            throw new Error(`Learnable hydration failed after update: ${row.id}`);
        }
        return learnable;
    }

    public async touchLearnable(id: string, now: Date) {
        const [row] = await this.database
            .update(learningLearnables)
            .set({
                lastSeenAt: now,
                updatedAt: now,
            })
            .where(eq(learningLearnables.id, id))
            .returning();

        if (!row) {
            throw new Error(`Learnable not found: ${id}`);
        }

        const [learnable] = await this.hydrateLearnables([row]);
        if (!learnable) {
            throw new Error(`Learnable hydration failed after touch: ${row.id}`);
        }
        return learnable;
    }

    public async listRelatedLearnables(id: string) {
        const rows = await this.database
            .select()
            .from(learningRelatedLearnables)
            .where(eq(learningRelatedLearnables.fromLearnableId, id))
            .orderBy(desc(learningRelatedLearnables.confidence));

        return rows.map((row) => this.converter.convertRelatedLearnable(row));
    }

    public async listAllRelatedLearnables(languageId: string) {
        const rows = await this.database
            .select({
                relation: learningRelatedLearnables,
            })
            .from(learningRelatedLearnables)
            .innerJoin(learningLearnables, eq(learningRelatedLearnables.fromLearnableId, learningLearnables.id))
            .where(eq(learningLearnables.languageId, languageId))
            .orderBy(desc(learningRelatedLearnables.confidence));

        return rows.map((row) => this.converter.convertRelatedLearnable(row.relation));
    }

    public async createOccurrence(input: {
        readonly learnableId: string;
        readonly workspaceId: string;
        readonly sourceSpanText: string;
        readonly sourceSentenceText: string;
        readonly rationale?: string;
    }) {
        const [row] = await this.database
            .insert(learningOccurrences)
            .values({
                id: randomUUID(),
                learnableId: input.learnableId,
                workspaceId: input.workspaceId,
                sourceSpanText: input.sourceSpanText,
                sourceSentenceText: input.sourceSentenceText,
                rationale: input.rationale,
            })
            .returning();

        if (!row) {
            throw new Error("Occurrence insert returned no row");
        }

        return this.converter.convertOccurrence(row);
    }

    public async listOccurrencesForLearnable(learnableId: string) {
        const rows = await this.database
            .select()
            .from(learningOccurrences)
            .where(eq(learningOccurrences.learnableId, learnableId))
            .orderBy(desc(learningOccurrences.createdAt));

        return rows.map((row) => this.converter.convertOccurrence(row));
    }

    public async findLexicalMatches(input: {
        readonly languageCode: string;
        readonly type: typeof learningLearnables.$inferSelect.type;
        readonly query: string;
        readonly limit?: number;
    }): Promise<readonly LearnableMatch[]> {
        const result = await this.findLexicalMatchesBatch({
            languageCode: input.languageCode,
            items: [{ workspaceItemId: "single-item", type: input.type, query: input.query, limit: input.limit }],
        });

        return result["single-item"] ?? [];
    }

    public async findLexicalMatchesBatch(input: {
        readonly languageCode: string;
        readonly items: readonly {
            readonly workspaceItemId: string;
            readonly type: typeof learningLearnables.$inferSelect.type;
            readonly query: string;
            readonly limit?: number;
        }[];
    }): Promise<Readonly<Record<string, readonly LearnableMatch[]>>> {
        const startedAt = performance.now();
        if (input.items.length === 0) {
            return {};
        }

        const language = await this.findLanguageByCode(input.languageCode);
        if (!language) {
            logQueryTiming("findLexicalMatchesBatch", startedAt);
            return {};
        }

        const normalizedByItemId = new Map(input.items.map((item) => [item.workspaceItemId, normalizeQuery(item.query)] as const));
        const normalizedValues = Array.from(new Set(Array.from(normalizedByItemId.values())));
        const requestedTypes = Array.from(new Set(input.items.map((item) => item.type)));

        const exactRows = await this.database
            .select()
            .from(learningLearnables)
            .where(
                and(
                    eq(learningLearnables.languageId, language.id),
                    inArray(learningLearnables.type, requestedTypes),
                    inArray(learningLearnables.normalizedText, normalizedValues),
                ),
            )
            .orderBy(desc(learningLearnables.occurrenceCount));

        const aliasRows = await this.database
            .select()
            .from(learningLearnableAliases)
            .where(
                and(
                    eq(learningLearnableAliases.languageId, language.id),
                    inArray(learningLearnableAliases.normalizedAliasText, normalizedValues),
                ),
            );

        const aliasLearnableIds = Array.from(new Set(aliasRows.map((row) => row.learnableId)));
        const aliasLearnableRows =
            aliasLearnableIds.length > 0
                ? await this.database
                      .select()
                      .from(learningLearnables)
                      .where(
                          and(
                              eq(learningLearnables.languageId, language.id),
                              inArray(learningLearnables.type, requestedTypes),
                              inArray(learningLearnables.id, aliasLearnableIds),
                          ),
                      )
                      .orderBy(desc(learningLearnables.occurrenceCount))
                : [];

        const fuzzyRowsByItemId = new Map<string, (typeof learningLearnables.$inferSelect)[]>();
        await Promise.all(
            input.items.map(async (item) => {
                const normalized = normalizedByItemId.get(item.workspaceItemId)!;
                const exactCount = exactRows.filter((row) => row.type === item.type && row.normalizedText === normalized).length;
                const aliasCount = aliasRows.filter((row) => row.normalizedAliasText === normalized).length;
                const needed = Math.max(0, (item.limit ?? 3) - exactCount - aliasCount);
                if (needed === 0) return;

                const fuzzyRows = await this.database
                    .select()
                    .from(learningLearnables)
                    .where(
                        and(
                            eq(learningLearnables.languageId, language.id),
                            eq(learningLearnables.type, item.type),
                            or(
                                ilike(learningLearnables.canonicalText, `%${item.query}%`),
                                ilike(learningLearnables.translation, `%${item.query}%`),
                                ilike(learningLearnables.searchDocument, `%${item.query}%`),
                            ),
                        ),
                    )
                    .orderBy(desc(learningLearnables.occurrenceCount))
                    .limit(needed);

                fuzzyRowsByItemId.set(item.workspaceItemId, fuzzyRows);
            }),
        );

        const allRows = [...exactRows, ...aliasLearnableRows, ...Array.from(fuzzyRowsByItemId.values()).flat()];
        const uniqueRowsById = new Map(allRows.map((row) => [row.id, row]));
        const hydratedLearnables = await this.hydrateLearnables(Array.from(uniqueRowsById.values()));
        const learnableById = new Map(hydratedLearnables.map((learnable) => [String(learnable.id), learnable] as const));

        const aliasIdsByNormalized = new Map<string, string[]>();
        for (const aliasRow of aliasRows) {
            const ids = aliasIdsByNormalized.get(aliasRow.normalizedAliasText) ?? [];
            ids.push(aliasRow.learnableId);
            aliasIdsByNormalized.set(aliasRow.normalizedAliasText, ids);
        }

        const result: Record<string, readonly LearnableMatch[]> = {};
        for (const item of input.items) {
            const normalized = normalizedByItemId.get(item.workspaceItemId)!;
            const limit = item.limit ?? 3;
            const seenIds = new Set<string>();
            const matches: LearnableMatch[] = [];

            for (const row of exactRows) {
                if (row.type !== item.type || row.normalizedText !== normalized) continue;
                const learnable = learnableById.get(row.id);
                if (!learnable || seenIds.has(learnable.id)) continue;
                matches.push({ learnable, confidence: 1, reason: "exact" });
                seenIds.add(learnable.id);
                if (matches.length >= limit) break;
            }

            if (matches.length < limit) {
                for (const aliasLearnableId of aliasIdsByNormalized.get(normalized) ?? []) {
                    const learnable = learnableById.get(aliasLearnableId);
                    if (!learnable || learnable.type !== item.type || seenIds.has(learnable.id)) continue;
                    matches.push({ learnable, confidence: 0.92, reason: "alias" });
                    seenIds.add(learnable.id);
                    if (matches.length >= limit) break;
                }
            }

            if (matches.length < limit) {
                for (const row of fuzzyRowsByItemId.get(item.workspaceItemId) ?? []) {
                    const learnable = learnableById.get(row.id);
                    if (!learnable || seenIds.has(learnable.id)) continue;
                    matches.push({ learnable, confidence: 0.74, reason: "lexical" });
                    seenIds.add(learnable.id);
                    if (matches.length >= limit) break;
                }
            }

            result[item.workspaceItemId] = matches;
        }

        logQueryTiming("findLexicalMatchesBatch", startedAt);
        return result;
    }

    public async findSemanticMatches(input: SemanticSearchInput): Promise<readonly LearnableMatch[]> {
        const startedAt = performance.now();
        const language = await this.findLanguageByCode(input.languageCode);

        if (!language) {
            logQueryTiming("findSemanticMatches", startedAt);
            return [];
        }

        const rows = await this.database
            .select({
                row: learningLearnables,
                distance: cosineDistance(learningLearnables.embedding, input.embedding),
            })
            .from(learningLearnables)
            .where(
                and(
                    eq(learningLearnables.languageId, language.id),
                    input.types?.length ? inArray(learningLearnables.type, toArray(input.types)) : undefined,
                    isNotNull(learningLearnables.embedding),
                ),
            )
            .orderBy(({ distance }) => asc(distance))
            .limit(input.limit ?? 10);

        const learnables = await this.hydrateLearnables(rows.map((entry) => entry.row));

        const result = rows.map((entry) => ({
            learnable: learnables.find((learnable) => learnable.id === entry.row.id)!,
            confidence: Math.max(0, 1 - Number(entry.distance)),
            reason: "semantic" as const,
        }));
        logQueryTiming("findSemanticMatches", startedAt);
        return result;
    }

    private async hydrateLearnables(rows: readonly (typeof learningLearnables.$inferSelect)[]) {
        if (rows.length === 0) {
            return [];
        }

        const ids = rows.map((row) => row.id);
        const aliases = await this.database
            .select()
            .from(learningLearnableAliases)
            .where(inArray(learningLearnableAliases.learnableId, ids));
        const examples = await this.database
            .select()
            .from(learningLearnableExamples)
            .where(inArray(learningLearnableExamples.learnableId, ids))
            .orderBy(desc(learningLearnableExamples.createdAt));

        const aliasesByLearnableId = new Map<string, string[]>();
        for (const alias of aliases) {
            const list = aliasesByLearnableId.get(alias.learnableId) ?? [];
            list.push(alias.aliasText);
            aliasesByLearnableId.set(alias.learnableId, list);
        }
        const examplesByLearnableId = new Map<string, ReturnType<LearningConverter["convertLearnableExample"]>[]>();
        for (const example of examples) {
            const list = examplesByLearnableId.get(example.learnableId) ?? [];
            list.push(this.converter.convertLearnableExample(example));
            examplesByLearnableId.set(example.learnableId, list);
        }

        return rows.map((row) =>
            this.converter.convertLearnable(row, aliasesByLearnableId.get(row.id) ?? [], examplesByLearnableId.get(row.id) ?? []),
        );
    }

    private async replaceAliases(learnableId: string, languageId: string, aliases: readonly string[]) {
        await this.database.delete(learningLearnableAliases).where(eq(learningLearnableAliases.learnableId, learnableId));

        if (aliases.length === 0) {
            return;
        }

        await this.database.insert(learningLearnableAliases).values(
            aliases.map((alias) => ({
                id: randomUUID(),
                learnableId,
                languageId,
                aliasText: alias,
                normalizedAliasText: alias.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase(),
            })),
        );
    }

    private async replaceExamples(
        learnableId: string,
        examples: readonly {
            readonly exampleText: string;
            readonly translation: string;
            readonly source: "ai" | "sentence_observed" | "manual";
        }[],
    ) {
        await this.database.delete(learningLearnableExamples).where(eq(learningLearnableExamples.learnableId, learnableId));

        if (examples.length === 0) {
            return;
        }

        await this.database.insert(learningLearnableExamples).values(
            examples.map((example) => ({
                id: randomUUID(),
                learnableId,
                exampleText: example.exampleText,
                translation: example.translation,
                source: example.source,
            })),
        );
    }
}
