import { users } from "../auth";
import {
    learningLanguages,
    learningLearnableAliases,
    learningLearnableExamples,
    learningLearnables,
    learningOccurrences,
    learningRelatedLearnables,
    learningSentenceWorkspaces,
    learningWorkspaceItems,
} from "../learning";
import { relations } from "drizzle-orm";

export const learningLanguagesRelations = relations(learningLanguages, ({ many }) => ({
    aliases: many(learningLearnableAliases),
    learnables: many(learningLearnables),
    workspaces: many(learningSentenceWorkspaces),
}));

export const learningSentenceWorkspacesRelations = relations(learningSentenceWorkspaces, ({ one, many }) => ({
    language: one(learningLanguages, {
        fields: [learningSentenceWorkspaces.languageId],
        references: [learningLanguages.id],
    }),
    createdByUser: one(users, {
        fields: [learningSentenceWorkspaces.createdByUserId],
        references: [users.id],
    }),
    occurrences: many(learningOccurrences),
    items: many(learningWorkspaceItems),
}));

export const learningLearnablesRelations = relations(learningLearnables, ({ one, many }) => ({
    aliases: many(learningLearnableAliases),
    examples: many(learningLearnableExamples),
    language: one(learningLanguages, {
        fields: [learningLearnables.languageId],
        references: [learningLanguages.id],
    }),
    occurrences: many(learningOccurrences),
    relatedFrom: many(learningRelatedLearnables, { relationName: "related_from" }),
    relatedTo: many(learningRelatedLearnables, { relationName: "related_to" }),
    mergeWorkspaceItems: many(learningWorkspaceItems),
}));

export const learningLearnableAliasesRelations = relations(learningLearnableAliases, ({ one }) => ({
    language: one(learningLanguages, {
        fields: [learningLearnableAliases.languageId],
        references: [learningLanguages.id],
    }),
    learnable: one(learningLearnables, {
        fields: [learningLearnableAliases.learnableId],
        references: [learningLearnables.id],
    }),
}));

export const learningLearnableExamplesRelations = relations(learningLearnableExamples, ({ one }) => ({
    learnable: one(learningLearnables, {
        fields: [learningLearnableExamples.learnableId],
        references: [learningLearnables.id],
    }),
}));

export const learningOccurrencesRelations = relations(learningOccurrences, ({ one }) => ({
    learnable: one(learningLearnables, {
        fields: [learningOccurrences.learnableId],
        references: [learningLearnables.id],
    }),
    workspace: one(learningSentenceWorkspaces, {
        fields: [learningOccurrences.workspaceId],
        references: [learningSentenceWorkspaces.id],
    }),
}));

export const learningWorkspaceItemsRelations = relations(learningWorkspaceItems, ({ one }) => ({
    mergeTargetLearnable: one(learningLearnables, {
        fields: [learningWorkspaceItems.mergeTargetLearnableId],
        references: [learningLearnables.id],
    }),
    workspace: one(learningSentenceWorkspaces, {
        fields: [learningWorkspaceItems.workspaceId],
        references: [learningSentenceWorkspaces.id],
    }),
}));

export const learningRelatedLearnablesRelations = relations(learningRelatedLearnables, ({ one }) => ({
    fromLearnable: one(learningLearnables, {
        fields: [learningRelatedLearnables.fromLearnableId],
        references: [learningLearnables.id],
        relationName: "related_from",
    }),
    toLearnable: one(learningLearnables, {
        fields: [learningRelatedLearnables.toLearnableId],
        references: [learningLearnables.id],
        relationName: "related_to",
    }),
}));
