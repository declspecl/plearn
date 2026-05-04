import { createTRPCRouter, protectedProcedure } from "./trpc";
import {
    createLearnableId,
    createSentenceWorkspaceId,
    createWorkspaceItemId,
    learnableTypes,
    reviewActions,
} from "@plearn/core/learning/model";
import { z } from "zod";

const learnableTypeSchema = z.enum(learnableTypes);
const reviewActionSchema = z.enum(reviewActions);

export const learningRouter = createTRPCRouter({
    analyzeSentence: protectedProcedure
        .input(
            z.object({
                languageCode: z.string().min(2),
                sourceText: z.string().min(1),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.sentenceAnalysisService.analyzeSentence({
                languageCode: input.languageCode,
                sourceText: input.sourceText,
                createdByUserId: ctx.session.user.id,
            });
        }),
    getWorkspace: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().transform((value) => createSentenceWorkspaceId(value)),
                languageCode: z.string().default("vi"),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.sentenceAnalysisService.getWorkspace(input.workspaceId, input.languageCode);
        }),
    getWorkspaceSuggestions: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().transform((value) => createSentenceWorkspaceId(value)),
                languageCode: z.string().default("vi"),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.sentenceAnalysisService.computeWorkspaceSuggestions(input.workspaceId, input.languageCode);
        }),
    updateWorkspaceReview: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().transform((value) => createSentenceWorkspaceId(value)),
                languageCode: z.string().default("vi"),
                reviewedAnalysisJson: z.record(z.string(), z.unknown()),
                items: z.array(
                    z.object({
                        id: z.string().transform((value) => createWorkspaceItemId(value)),
                        proposedText: z.string().min(1),
                        proposedTranslation: z.string().min(1),
                        proposedNotes: z.string(),
                        proposedJson: z.record(z.string(), z.unknown()),
                        reviewAction: reviewActionSchema,
                        mergeTargetLearnableId: z
                            .string()
                            .transform((value) => createLearnableId(value))
                            .optional(),
                    }),
                ),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.workspaceReviewService.updateWorkspaceReview(input);
        }),
    saveWorkspace: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().transform((value) => createSentenceWorkspaceId(value)),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.workspaceReviewService.saveWorkspace(input.workspaceId);
        }),
    listLearnables: protectedProcedure
        .input(
            z.object({
                languageCode: z.string().optional(),
                query: z.string().optional(),
                types: z.array(learnableTypeSchema).optional(),
                archived: z.boolean().optional(),
                minOccurrenceCount: z.number().int().optional(),
                maxOccurrenceCount: z.number().int().optional(),
                hasExamples: z.boolean().optional(),
                limit: z.number().int().positive().max(100).optional(),
                offset: z.number().int().nonnegative().optional(),
                sort: z.enum(["frequency", "newest", "last_seen", "alphabetical"]).optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.listLearnables(input);
        }),
    semanticSearchLearnables: protectedProcedure
        .input(
            z.object({
                languageCode: z.string(),
                query: z.string().min(1),
                types: z.array(learnableTypeSchema).optional(),
                limit: z.number().int().positive().max(50).optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.semanticSearchService.search(input);
        }),
    getLearnable: protectedProcedure
        .input(
            z.object({
                learnableId: z.string().transform((value) => createLearnableId(value)),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.getLearnable(input.learnableId);
        }),
    listSentenceWorkspaces: protectedProcedure
        .input(
            z.object({
                languageCode: z.string().optional(),
                query: z.string().optional(),
                limit: z.number().int().positive().max(200).optional(),
                offset: z.number().int().nonnegative().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.listSentenceWorkspaces(ctx.session.user.id, input.languageCode, {
                query: input.query,
                limit: input.limit,
                offset: input.offset,
            });
        }),
    getRelatedLearnables: protectedProcedure
        .input(
            z.object({
                learnableId: z.string().transform((value) => createLearnableId(value)),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.listRelatedLearnables(input.learnableId);
        }),
    getLearnableGraph: protectedProcedure
        .input(
            z.object({
                languageCode: z.string().min(2),
                types: z.array(learnableTypeSchema).optional(),
                limit: z.number().int().positive().max(300).optional(),
                minOccurrenceCount: z.number().int().nonnegative().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.getLearnableGraph(input.languageCode, {
                types: input.types,
                limit: input.limit,
                minOccurrenceCount: input.minOccurrenceCount,
            });
        }),
    lookupByText: protectedProcedure
        .input(
            z.object({
                languageCode: z.string().min(2),
                text: z.string().min(1),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.learnableCatalogService.lookupByText(input.languageCode, input.text);
        }),
});
