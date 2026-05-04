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

function toArray<T>(value: readonly T[] | undefined): T[] {
    return value ? [...value] : [];
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
        const [workspaceRow] = await this.database
            .select()
            .from(learningSentenceWorkspaces)
            .where(eq(learningSentenceWorkspaces.id, workspaceId))
            .limit(1);

        if (!workspaceRow) {
            return undefined;
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

    public async listWorkspaces(createdByUserId: string, languageCode?: string) {
        const language = languageCode ? await this.findLanguageByCode(languageCode) : undefined;
        const conditions = [eq(learningSentenceWorkspaces.createdByUserId, createdByUserId)];

        if (language) {
            conditions.push(eq(learningSentenceWorkspaces.languageId, language.id));
        }

        const rows = await this.database
            .select()
            .from(learningSentenceWorkspaces)
            .where(and(...conditions))
            .orderBy(desc(learningSentenceWorkspaces.createdAt));

        const items = rows.length
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

        return rows.map((row) =>
            this.converter.convertWorkspace(
                row,
                items.filter((item) => item.workspaceId === row.id).map((item) => this.converter.convertWorkspaceItem(item)),
            ),
        );
    }

    public async findLanguageByCode(code: string) {
        const [row] = await this.database.select().from(learningLanguages).where(eq(learningLanguages.code, code)).limit(1);
        return row ? this.converter.convertLanguage(row) : undefined;
    }

    public async listLearnables(filters: LearnableListFilters) {
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
            return learnables.filter((learnable) => learnable.examples.length > 0);
        }

        return learnables;
    }

    public async findLearnableById(id: string) {
        const [row] = await this.database.select().from(learningLearnables).where(eq(learningLearnables.id, id)).limit(1);
        if (!row) {
            return undefined;
        }
        const [learnable] = await this.hydrateLearnables([row]);
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
        const language = await this.findLanguageByCode(input.languageCode);

        if (!language) {
            return [];
        }

        const rows = await this.database
            .select()
            .from(learningLearnables)
            .where(
                and(
                    eq(learningLearnables.languageId, language.id),
                    eq(learningLearnables.type, input.type),
                    or(
                        ilike(learningLearnables.canonicalText, `%${input.query}%`),
                        ilike(learningLearnables.translation, `%${input.query}%`),
                        ilike(learningLearnables.searchDocument, `%${input.query}%`),
                    ),
                ),
            )
            .orderBy(desc(learningLearnables.occurrenceCount))
            .limit(input.limit ?? 5);

        const learnables = await this.hydrateLearnables(rows);

        return learnables.map((learnable) => ({
            learnable,
            confidence: learnable.normalizedText === input.query.trim().toLowerCase() ? 1 : 0.74,
            reason: learnable.normalizedText === input.query.trim().toLowerCase() ? "exact" : "lexical",
        }));
    }

    public async findSemanticMatches(input: SemanticSearchInput): Promise<readonly LearnableMatch[]> {
        const language = await this.findLanguageByCode(input.languageCode);

        if (!language) {
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

        return rows.map((entry) => ({
            learnable: learnables.find((learnable) => learnable.id === entry.row.id)!,
            confidence: Math.max(0, 1 - Number(entry.distance)),
            reason: "semantic" as const,
        }));
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

        return rows.map((row) =>
            this.converter.convertLearnable(
                row,
                aliases.filter((alias) => alias.learnableId === row.id).map((alias) => alias.aliasText),
                examples
                    .filter((example) => example.learnableId === row.id)
                    .map((example) => this.converter.convertLearnableExample(example)),
            ),
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
