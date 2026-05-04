import { users } from "./auth";
import { index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";

export const learnableTypeEnum = pgEnum("learning_learnable_type", ["grammar_pattern", "vocabulary", "utility_word", "phrase"]);
export const workspaceStatusEnum = pgEnum("learning_workspace_status", ["draft", "analyzed", "reviewed", "saved", "failed"]);
export const reviewActionEnum = pgEnum("learning_review_action", ["pending", "create_new", "merge_existing", "reject"]);
export const suggestionStatusEnum = pgEnum("learning_suggestion_status", ["idle", "loading", "ready", "failed"]);
export const learnableExampleSourceEnum = pgEnum("learning_example_source", ["ai", "sentence_observed", "manual"]);
export const relatedLearnableTypeEnum = pgEnum("learning_related_learnable_type", [
    "similar_meaning",
    "same_pattern_family",
    "often_confused",
    "related_phrase",
]);

export const learningLanguages = pgTable(
    "learning_languages",
    {
        id: text("id").primaryKey(),
        code: text("code").notNull(),
        name: text("name").notNull(),
    },
    (table) => [uniqueIndex("learning_languages_code_uidx").on(table.code)],
);

export const learningSentenceWorkspaces = pgTable(
    "learning_sentence_workspaces",
    {
        id: text("id").primaryKey(),
        languageId: text("language_id")
            .notNull()
            .references(() => learningLanguages.id, { onDelete: "restrict" }),
        sourceText: text("source_text").notNull(),
        sourceLanguageCode: text("source_language_code").notNull().default("en"),
        status: workspaceStatusEnum("status").notNull().default("draft"),
        analysisModelProvider: text("analysis_model_provider"),
        analysisModelId: text("analysis_model_id"),
        analysisPromptVersion: text("analysis_prompt_version"),
        summary: text("summary"),
        rawAnalysisJson: jsonb("raw_analysis_json"),
        reviewedAnalysisJson: jsonb("reviewed_analysis_json"),
        errorMessage: text("error_message"),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        index("learning_sentence_workspaces_language_idx").on(table.languageId),
        index("learning_sentence_workspaces_user_idx").on(table.createdByUserId),
        index("learning_sentence_workspaces_user_language_created_at_idx").on(table.createdByUserId, table.languageId, table.createdAt),
        index("learning_sentence_workspaces_status_idx").on(table.status),
        index("learning_sentence_workspaces_created_at_idx").on(table.createdAt),
    ],
);

export const learningLearnables = pgTable(
    "learning_learnables",
    {
        id: text("id").primaryKey(),
        languageId: text("language_id")
            .notNull()
            .references(() => learningLanguages.id, { onDelete: "restrict" }),
        type: learnableTypeEnum("type").notNull(),
        canonicalText: text("canonical_text").notNull(),
        normalizedText: text("normalized_text").notNull(),
        translation: text("translation").notNull(),
        partOfSpeech: text("part_of_speech"),
        usageNotes: text("usage_notes").notNull(),
        patternTemplate: text("pattern_template"),
        difficulty: real("difficulty"),
        searchDocument: text("search_document").notNull().default(""),
        embedding: vector("embedding", { dimensions: 1536 }),
        embeddingSourceText: text("embedding_source_text"),
        occurrenceCount: integer("occurrence_count").notNull().default(0),
        firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
        lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        archivedAt: timestamp("archived_at"),
    },
    (table) => [
        uniqueIndex("learning_learnables_language_type_normalized_uidx").on(table.languageId, table.type, table.normalizedText),
        index("learning_learnables_language_idx").on(table.languageId),
        index("learning_learnables_type_idx").on(table.type),
        index("learning_learnables_occurrence_count_idx").on(table.occurrenceCount),
        index("learning_learnables_last_seen_idx").on(table.lastSeenAt),
        index("learning_learnables_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    ],
);

export const learningLearnableAliases = pgTable(
    "learning_learnable_aliases",
    {
        id: text("id").primaryKey(),
        learnableId: text("learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        aliasText: text("alias_text").notNull(),
        normalizedAliasText: text("normalized_alias_text").notNull(),
        languageId: text("language_id")
            .notNull()
            .references(() => learningLanguages.id, { onDelete: "restrict" }),
    },
    (table) => [
        uniqueIndex("learning_learnable_aliases_language_normalized_uidx").on(table.languageId, table.normalizedAliasText),
        index("learning_learnable_aliases_learnable_idx").on(table.learnableId),
    ],
);

export const learningLearnableExamples = pgTable(
    "learning_learnable_examples",
    {
        id: text("id").primaryKey(),
        learnableId: text("learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        exampleText: text("example_text").notNull(),
        translation: text("translation").notNull(),
        source: learnableExampleSourceEnum("source").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [index("learning_learnable_examples_learnable_idx").on(table.learnableId)],
);

export const learningOccurrences = pgTable(
    "learning_occurrences",
    {
        id: text("id").primaryKey(),
        learnableId: text("learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        workspaceId: text("workspace_id")
            .notNull()
            .references(() => learningSentenceWorkspaces.id, { onDelete: "cascade" }),
        sourceSpanText: text("source_span_text").notNull(),
        sourceSentenceText: text("source_sentence_text").notNull(),
        rationale: text("rationale"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("learning_occurrences_learnable_idx").on(table.learnableId),
        index("learning_occurrences_learnable_created_at_idx").on(table.learnableId, table.createdAt),
        index("learning_occurrences_workspace_idx").on(table.workspaceId),
    ],
);

export const learningWorkspaceItems = pgTable(
    "learning_workspace_items",
    {
        id: text("id").primaryKey(),
        workspaceId: text("workspace_id")
            .notNull()
            .references(() => learningSentenceWorkspaces.id, { onDelete: "cascade" }),
        proposedType: learnableTypeEnum("proposed_type").notNull(),
        proposedText: text("proposed_text").notNull(),
        proposedTranslation: text("proposed_translation").notNull(),
        proposedNotes: text("proposed_notes").notNull(),
        proposedJson: jsonb("proposed_json").notNull(),
        reviewAction: reviewActionEnum("review_action").notNull().default("pending"),
        mergeTargetLearnableId: text("merge_target_learnable_id").references(() => learningLearnables.id, { onDelete: "set null" }),
        duplicateSuggestionsJson: jsonb("duplicate_suggestions_json"),
        duplicateSuggestionsStatus: suggestionStatusEnum("duplicate_suggestions_status").notNull().default("idle"),
        duplicateSuggestionsComputedAt: timestamp("duplicate_suggestions_computed_at"),
        duplicateSuggestionsError: text("duplicate_suggestions_error"),
        position: integer("position").notNull(),
    },
    (table) => [
        index("learning_workspace_items_workspace_idx").on(table.workspaceId),
        index("learning_workspace_items_workspace_position_idx").on(table.workspaceId, table.position),
        index("learning_workspace_items_merge_target_idx").on(table.mergeTargetLearnableId),
    ],
);

export const learningRelatedLearnables = pgTable(
    "learning_related_learnables",
    {
        id: text("id").primaryKey(),
        fromLearnableId: text("from_learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        toLearnableId: text("to_learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        relationType: relatedLearnableTypeEnum("relation_type").notNull(),
        confidence: real("confidence").notNull(),
    },
    (table) => [
        index("learning_related_learnables_from_idx").on(table.fromLearnableId),
        index("learning_related_learnables_to_idx").on(table.toLearnableId),
    ],
);
