import { createEntityId } from "@plearn/core/shared/model/id";
import {
    createSrsCardId,
    createSrsReviewId,
    type SrsCard,
    type SrsCardStatus,
    type SrsCardType,
    type SrsGrade,
    type SrsReview,
} from "@plearn/core/srs/model";
import type { learningSrsCards, learningSrsReviews } from "@plearn/db/schema";

type SrsCardRow = typeof learningSrsCards.$inferSelect;
type SrsReviewRow = typeof learningSrsReviews.$inferSelect;

export class SrsConverter {
    public convertCard(row: SrsCardRow): SrsCard {
        return {
            id: createSrsCardId(row.id),
            userId: row.userId,
            learnableId: createEntityId(row.learnableId),
            status: row.status as SrsCardStatus,
            easeFactor: row.easeFactor,
            intervalDays: row.intervalDays,
            repetitionCount: row.repetitionCount,
            lapseCount: row.lapseCount,
            nextReviewAt: row.nextReviewAt,
            lastReviewedAt: row.lastReviewedAt,
            introducedAt: row.introducedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    public convertReview(row: SrsReviewRow): SrsReview {
        return {
            id: createSrsReviewId(row.id),
            cardId: createSrsCardId(row.cardId),
            userId: row.userId,
            sessionId: row.sessionId,
            cardType: row.cardType as SrsCardType,
            grade: row.grade as SrsGrade,
            prompt: row.prompt,
            userAnswer: row.userAnswer,
            aiFeedback: row.aiFeedback,
            aiModelProvider: row.aiModelProvider ?? undefined,
            aiModelId: row.aiModelId ?? undefined,
            isPractice: row.isPractice,
            targetLearnableIds: (row.targetLearnableIds ?? []) as string[],
            durationMs: row.durationMs ?? undefined,
            createdAt: row.createdAt,
        };
    }
}
