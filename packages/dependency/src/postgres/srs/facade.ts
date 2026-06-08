import type { SrsConverter } from "./converter";
import type { LearnableId } from "@plearn/core/learning/model";
import { createEntityId } from "@plearn/core/shared/model/id";
import type { SrsGrade } from "@plearn/core/srs/model";
import type { SrsCardRepository, SrsCardUpdate, SrsReviewRepository, CreateSrsReviewInput } from "@plearn/core/srs/repository";
import type { DatabaseInstance } from "@plearn/db/client";
import { learningLearnables, learningSrsCards, learningSrsReviews } from "@plearn/db/schema";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export class SrsFacade implements SrsCardRepository, SrsReviewRepository {
    public constructor(
        private readonly database: DatabaseInstance,
        private readonly converter: SrsConverter,
    ) {}

    public async findOrCreateCard(userId: string, learnableId: LearnableId) {
        const existing = await this.database
            .select()
            .from(learningSrsCards)
            .where(and(eq(learningSrsCards.userId, userId), eq(learningSrsCards.learnableId, learnableId)))
            .limit(1);

        if (existing[0]) {
            return this.converter.convertCard(existing[0]);
        }

        const [row] = await this.database
            .insert(learningSrsCards)
            .values({
                id: randomUUID(),
                userId,
                learnableId,
            })
            .onConflictDoNothing()
            .returning();

        if (!row) {
            const [refetched] = await this.database
                .select()
                .from(learningSrsCards)
                .where(and(eq(learningSrsCards.userId, userId), eq(learningSrsCards.learnableId, learnableId)))
                .limit(1);
            return this.converter.convertCard(refetched!);
        }

        return this.converter.convertCard(row);
    }

    public async findDueCards(userId: string, limit: number, languageCode?: string) {
        const now = new Date();
        const rows = await this.database
            .select({ card: learningSrsCards })
            .from(learningSrsCards)
            .innerJoin(learningLearnables, eq(learningSrsCards.learnableId, learningLearnables.id))
            .where(
                and(
                    eq(learningSrsCards.userId, userId),
                    inArray(learningSrsCards.status, ["active", "graduated"]),
                    lte(learningSrsCards.nextReviewAt, now),
                    languageCode ? eq(learningLearnables.languageId, languageCode) : undefined,
                ),
            )
            .orderBy(asc(learningSrsCards.nextReviewAt))
            .limit(limit);

        return rows.map((r) => this.converter.convertCard(r.card));
    }

    public async countDueCards(userId: string, languageCode?: string) {
        const now = new Date();
        const [result] = await this.database
            .select({ count: count() })
            .from(learningSrsCards)
            .innerJoin(learningLearnables, eq(learningSrsCards.learnableId, learningLearnables.id))
            .where(
                and(
                    eq(learningSrsCards.userId, userId),
                    inArray(learningSrsCards.status, ["active", "graduated"]),
                    lte(learningSrsCards.nextReviewAt, now),
                    languageCode ? eq(learningLearnables.languageId, languageCode) : undefined,
                ),
            );

        return result?.count ?? 0;
    }

    public async updateCard(id: string, update: SrsCardUpdate) {
        const values: Record<string, unknown> = {};

        if (update.status !== undefined) values.status = update.status;
        if (update.easeFactor !== undefined) values.easeFactor = update.easeFactor;
        if (update.intervalDays !== undefined) values.intervalDays = update.intervalDays;
        if (update.repetitionCount !== undefined) values.repetitionCount = update.repetitionCount;
        if (update.lapseCount !== undefined) values.lapseCount = update.lapseCount;
        if (update.nextReviewAt !== undefined) values.nextReviewAt = update.nextReviewAt;
        if (update.lastReviewedAt !== undefined) values.lastReviewedAt = update.lastReviewedAt;
        if (update.introducedAt !== undefined) values.introducedAt = update.introducedAt;

        const [row] = await this.database.update(learningSrsCards).set(values).where(eq(learningSrsCards.id, id)).returning();

        if (!row) {
            throw new Error(`SRS card not found: ${id}`);
        }

        return this.converter.convertCard(row);
    }

    public async findNewCardsToIntroduce(userId: string, limit: number, languageCode?: string) {
        const rows = await this.database
            .select({ learnableId: learningLearnables.id })
            .from(learningLearnables)
            .leftJoin(learningSrsCards, and(eq(learningSrsCards.learnableId, learningLearnables.id), eq(learningSrsCards.userId, userId)))
            .where(
                and(
                    isNull(learningSrsCards.id),
                    isNull(learningLearnables.archivedAt),
                    languageCode ? eq(learningLearnables.languageId, languageCode) : undefined,
                ),
            )
            .orderBy(desc(learningLearnables.occurrenceCount))
            .limit(limit);

        return rows.map((r) => createEntityId<"Learnable">(r.learnableId));
    }

    public async getCardsByLearnableIds(userId: string, learnableIds: readonly LearnableId[]) {
        if (learnableIds.length === 0) return [];

        const rows = await this.database
            .select()
            .from(learningSrsCards)
            .where(and(eq(learningSrsCards.userId, userId), inArray(learningSrsCards.learnableId, [...learnableIds])));

        return rows.map((r) => this.converter.convertCard(r));
    }

    public async getCardByLearnableId(userId: string, learnableId: LearnableId) {
        const [row] = await this.database
            .select()
            .from(learningSrsCards)
            .where(and(eq(learningSrsCards.userId, userId), eq(learningSrsCards.learnableId, learnableId)))
            .limit(1);

        return row ? this.converter.convertCard(row) : undefined;
    }

    public async countIntroducedToday(userId: string, languageCode?: string) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [result] = await this.database
            .select({ count: count() })
            .from(learningSrsCards)
            .innerJoin(learningLearnables, eq(learningSrsCards.learnableId, learningLearnables.id))
            .where(
                and(
                    eq(learningSrsCards.userId, userId),
                    gte(learningSrsCards.introducedAt, todayStart),
                    languageCode ? eq(learningLearnables.languageId, languageCode) : undefined,
                ),
            );

        return result?.count ?? 0;
    }

    public async createReview(input: CreateSrsReviewInput) {
        const [row] = await this.database
            .insert(learningSrsReviews)
            .values({
                id: randomUUID(),
                cardId: input.cardId,
                userId: input.userId,
                sessionId: input.sessionId,
                cardType: input.cardType,
                grade: input.grade,
                prompt: input.prompt,
                userAnswer: input.userAnswer,
                aiFeedback: input.aiFeedback,
                aiModelProvider: input.aiModelProvider ?? null,
                aiModelId: input.aiModelId ?? null,
                isPractice: input.isPractice,
                targetLearnableIds: [...input.targetLearnableIds],
                durationMs: input.durationMs ?? null,
            })
            .returning();

        if (!row) {
            throw new Error("SRS review insert returned no row");
        }

        return this.converter.convertReview(row);
    }

    public async listReviewsBySession(userId: string, sessionId: string) {
        const rows = await this.database
            .select()
            .from(learningSrsReviews)
            .where(and(eq(learningSrsReviews.userId, userId), eq(learningSrsReviews.sessionId, sessionId)))
            .orderBy(asc(learningSrsReviews.createdAt));

        return rows.map((r) => this.converter.convertReview(r));
    }

    public async getRecentGradesForLearnable(userId: string, learnableId: LearnableId, limit: number) {
        const rows = await this.database
            .select({ grade: learningSrsReviews.grade })
            .from(learningSrsReviews)
            .innerJoin(learningSrsCards, eq(learningSrsReviews.cardId, learningSrsCards.id))
            .where(
                and(
                    eq(learningSrsReviews.userId, userId),
                    eq(learningSrsCards.learnableId, learnableId),
                    eq(learningSrsReviews.isPractice, false),
                ),
            )
            .orderBy(desc(learningSrsReviews.createdAt))
            .limit(limit);

        return rows.map((r) => r.grade as SrsGrade);
    }

    public async getWeakLearnableIds(userId: string, limit: number, languageCode?: string) {
        const result = await this.database
            .select({
                learnableId: learningSrsCards.learnableId,
                avgGrade: sql<number>`avg(case
                    when ${learningSrsReviews.grade} = 'missed' then 1
                    when ${learningSrsReviews.grade} = 'shaky' then 2
                    when ${learningSrsReviews.grade} = 'okay' then 3
                    when ${learningSrsReviews.grade} = 'solid' then 4
                    when ${learningSrsReviews.grade} = 'nailed' then 5
                end)`.as("avg_grade"),
            })
            .from(learningSrsReviews)
            .innerJoin(learningSrsCards, eq(learningSrsReviews.cardId, learningSrsCards.id))
            .innerJoin(learningLearnables, eq(learningSrsCards.learnableId, learningLearnables.id))
            .where(
                and(
                    eq(learningSrsReviews.userId, userId),
                    eq(learningSrsReviews.isPractice, false),
                    languageCode ? eq(learningLearnables.languageId, languageCode) : undefined,
                ),
            )
            .groupBy(learningSrsCards.learnableId)
            .having(
                sql`avg(case
                when ${learningSrsReviews.grade} = 'missed' then 1
                when ${learningSrsReviews.grade} = 'shaky' then 2
                when ${learningSrsReviews.grade} = 'okay' then 3
                when ${learningSrsReviews.grade} = 'solid' then 4
                when ${learningSrsReviews.grade} = 'nailed' then 5
            end) <= 2.5`,
            )
            .orderBy(sql`avg_grade asc`)
            .limit(limit);

        return result.map((r) => createEntityId<"Learnable">(r.learnableId));
    }
}
