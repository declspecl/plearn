import { createTRPCRouter, protectedProcedure } from "./trpc";
import { learnableTypes } from "@plearn/core/learning/model";
import { createSrsCardId, srsCardTypes } from "@plearn/core/srs/model";
import { z } from "zod";

const srsCardTypeSchema = z.enum(srsCardTypes);

export const srsRouter = createTRPCRouter({
    getReviewStatus: protectedProcedure.query(async ({ ctx }) => {
        return ctx.services.reviewSessionService.getReviewStatus(ctx.session.user.id);
    }),

    startReviewSession: protectedProcedure
        .input(
            z.object({
                maxCards: z.number().int().min(5).max(30).default(15),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.reviewSessionService.startSession(ctx.session.user.id, input.maxCards);
        }),

    generateCard: protectedProcedure
        .input(
            z.object({
                cardId: z.string().transform(createSrsCardId),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.reviewSessionService.generateCard(ctx.session.user.id, input.cardId);
        }),

    submitAnswer: protectedProcedure
        .input(
            z.object({
                sessionId: z.string(),
                cardId: z.string().transform(createSrsCardId),
                cardType: srsCardTypeSchema,
                prompt: z.string(),
                userAnswer: z.string().min(1),
                targetLearnableIds: z.array(z.string()),
                durationMs: z.number().int().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.reviewSessionService.submitAnswer({
                userId: ctx.session.user.id,
                sessionId: input.sessionId,
                cardId: input.cardId,
                cardType: input.cardType,
                prompt: input.prompt,
                userAnswer: input.userAnswer,
                targetLearnableIds: input.targetLearnableIds,
                durationMs: input.durationMs,
            });
        }),

    getSessionSummary: protectedProcedure
        .input(
            z.object({
                sessionId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.services.reviewSessionService.getSessionSummary(ctx.session.user.id, input.sessionId);
        }),

    startPracticeSession: protectedProcedure
        .input(
            z.object({
                mode: z.enum(["weak_items", "category", "random"]),
                types: z.array(z.enum(learnableTypes)).optional(),
                limit: z.number().int().min(1).max(30).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.practiceService.startPracticeSession(ctx.session.user.id, {
                mode: input.mode,
                types: input.types,
                limit: input.limit,
            });
        }),

    generatePracticeCard: protectedProcedure
        .input(
            z.object({
                learnableId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.practiceService.generateCard(ctx.session.user.id, input.learnableId as any);
        }),

    submitPracticeAnswer: protectedProcedure
        .input(
            z.object({
                sessionId: z.string(),
                cardId: z.string().transform(createSrsCardId),
                cardType: srsCardTypeSchema,
                prompt: z.string(),
                userAnswer: z.string().min(1),
                targetLearnableIds: z.array(z.string()),
                durationMs: z.number().int().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.practiceService.submitPracticeAnswer({
                userId: ctx.session.user.id,
                sessionId: input.sessionId,
                cardId: input.cardId,
                cardType: input.cardType,
                prompt: input.prompt,
                userAnswer: input.userAnswer,
                targetLearnableIds: input.targetLearnableIds,
                durationMs: input.durationMs,
            });
        }),
});
