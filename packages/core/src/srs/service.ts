import type { Learnable, LearnableId, LearnableType } from "../learning/model/learning";
import type { LearnableRepository } from "../learning/repository";
import type { SrsAnswerGrader } from "./ai";
import type { SrsCardGenerator } from "./ai";
import type { SrsScheduler } from "./algorithm";
import type {
    GeneratedCard,
    GradingResult,
    ReviewCard,
    ReviewSession,
    SessionSummary,
    SrsCard,
    SrsCardId,
    SrsCardType,
    SrsGrade,
} from "./model";
import { gradeToNumber } from "./model";
import type { SrsCardRepository, SrsReviewRepository } from "./repository";
import { randomUUID } from "node:crypto";

const DEFAULT_MAX_CARDS = 15;
const DEFAULT_NEW_CARDS_PER_DAY = 10;
const KNOWN_CATALOG_SCAFFOLD_LIMIT = 1000;

const CARD_TYPES_BY_LEARNABLE_TYPE: Record<LearnableType, readonly SrsCardType[]> = {
    vocabulary: ["use_in_sentence", "pick_right_one", "complete_thought", "how_would_you_say"],
    grammar_pattern: ["use_in_sentence", "whats_wrong", "complete_thought", "how_would_you_say"],
    utility_word: ["pick_right_one", "whats_wrong", "complete_thought"],
    phrase: ["what_does_this_mean", "use_in_sentence", "shift_register", "how_would_you_say"],
};

const ESCALATION_TYPES: readonly SrsCardType[] = ["use_in_sentence", "whats_wrong", "shift_register", "how_would_you_say"];

function selectCardType(learnable: Learnable, recentGrades: readonly SrsGrade[]): SrsCardType {
    const eligible = CARD_TYPES_BY_LEARNABLE_TYPE[learnable.type] ?? ["use_in_sentence"];

    const recentFailCount = recentGrades.filter((g) => gradeToNumber[g] <= 2).length;
    if (recentFailCount >= 2) {
        const harder = ESCALATION_TYPES.filter((t) => eligible.includes(t));
        if (harder.length > 0) {
            return harder[Math.floor(Math.random() * harder.length)]!;
        }
    }

    return eligible[Math.floor(Math.random() * eligible.length)]!;
}

async function findScaffoldLearnables(
    learnableRepo: LearnableRepository,
    targetLearnable: Learnable,
    limit: number = KNOWN_CATALOG_SCAFFOLD_LIMIT,
): Promise<Learnable[]> {
    const candidates = await learnableRepo.listLearnables({
        limit,
        sort: "frequency",
    });

    return candidates.filter((candidate) => candidate.id !== targetLearnable.id && candidate.languageId === targetLearnable.languageId);
}

export class ReviewSessionService {
    public constructor(
        private readonly cardRepo: SrsCardRepository,
        private readonly reviewRepo: SrsReviewRepository,
        private readonly learnableRepo: LearnableRepository,
        private readonly scheduler: SrsScheduler,
        private readonly cardGenerator: SrsCardGenerator,
        private readonly answerGrader: SrsAnswerGrader,
    ) {}

    public async getReviewStatus(userId: string) {
        const dueCount = await this.cardRepo.countDueCards(userId);
        const introducedToday = await this.cardRepo.countIntroducedToday(userId);
        const newAvailable = Math.max(0, DEFAULT_NEW_CARDS_PER_DAY - introducedToday);
        return { dueCount, newAvailable };
    }

    public async startSession(userId: string, maxCards: number = DEFAULT_MAX_CARDS): Promise<ReviewSession> {
        const sessionId = randomUUID();

        const dueCards = await this.cardRepo.findDueCards(userId, maxCards);
        const cards: ReviewCard[] = dueCards.map((c) => ({
            cardId: c.id,
            learnableId: c.learnableId,
        }));

        const remaining = maxCards - cards.length;
        if (remaining > 0) {
            const introducedToday = await this.cardRepo.countIntroducedToday(userId);
            const newLimit = Math.min(remaining, Math.max(0, DEFAULT_NEW_CARDS_PER_DAY - introducedToday));

            if (newLimit > 0) {
                const newLearnableIds = await this.cardRepo.findNewCardsToIntroduce(userId, newLimit);
                for (const learnableId of newLearnableIds) {
                    const card = await this.cardRepo.findOrCreateCard(userId, learnableId);
                    const now = new Date();
                    const introduced = await this.cardRepo.updateCard(card.id, {
                        status: "active",
                        introducedAt: now,
                        nextReviewAt: now,
                    });
                    cards.push({ cardId: introduced.id, learnableId: introduced.learnableId });
                }
            }
        }

        return { sessionId, cards };
    }

    public async generateCard(userId: string, cardId: SrsCardId): Promise<GeneratedCard> {
        let card: SrsCard | undefined;

        const allCards = await this.cardRepo.findDueCards(userId, 100);
        card = allCards.find((c) => c.id === cardId);

        if (!card) {
            throw new Error(`Card not found: ${cardId}`);
        }

        const learnable = await this.learnableRepo.findLearnableById(card.learnableId);
        if (!learnable) {
            throw new Error(`Learnable not found for card: ${cardId}`);
        }

        const recentGrades = await this.reviewRepo.getRecentGradesForLearnable(userId, learnable.id, 5);
        const cardType = selectCardType(learnable, recentGrades);

        let bundledLearnables = await findScaffoldLearnables(this.learnableRepo, learnable);
        if (cardType === "how_would_you_say") {
            const strongLearnables = await this.findBundledLearnables(userId, learnable.id);
            bundledLearnables = [...strongLearnables, ...bundledLearnables].filter(
                (candidate, index, all) => all.findIndex((other) => other.id === candidate.id) === index,
            );
        }

        const result = await this.cardGenerator.generateCard({
            cardType,
            targetLearnables: [learnable],
            bundledLearnables,
        });

        return {
            cardType,
            prompt: result.prompt,
            learnables: [learnable],
            metadata: result.metadata,
        };
    }

    public async submitAnswer(input: {
        userId: string;
        sessionId: string;
        cardId: SrsCardId;
        cardType: SrsCardType;
        prompt: string;
        userAnswer: string;
        targetLearnableIds: readonly string[];
        durationMs?: number;
    }): Promise<GradingResult & { updatedCard: SrsCard }> {
        const learnables: Learnable[] = [];
        for (const lid of input.targetLearnableIds) {
            const l = await this.learnableRepo.findLearnableById(lid as LearnableId);
            if (l) learnables.push(l);
        }

        const gradeResult = await this.answerGrader.gradeAnswer({
            cardType: input.cardType,
            prompt: input.prompt,
            userAnswer: input.userAnswer,
            targetLearnables: learnables,
        });

        const currentCards = await this.cardRepo.getCardsByLearnableIds(
            input.userId,
            input.targetLearnableIds.slice(0, 1).map((id) => id as LearnableId),
        );
        const card = currentCards[0];
        if (!card) {
            throw new Error(`Card not found for grading: ${input.cardId}`);
        }

        const schedulingResult = this.scheduler.schedule(card, gradeResult.grade);

        const updatedCard = await this.cardRepo.updateCard(input.cardId, {
            status: schedulingResult.newStatus,
            easeFactor: schedulingResult.newEaseFactor,
            intervalDays: schedulingResult.newIntervalDays,
            repetitionCount: schedulingResult.newRepetitionCount,
            lapseCount: schedulingResult.newLapseCount,
            nextReviewAt: schedulingResult.nextReviewAt,
            lastReviewedAt: new Date(),
        });

        await this.reviewRepo.createReview({
            cardId: input.cardId,
            userId: input.userId,
            sessionId: input.sessionId,
            cardType: input.cardType,
            grade: gradeResult.grade,
            prompt: input.prompt,
            userAnswer: input.userAnswer,
            aiFeedback: gradeResult.feedback,
            aiModelProvider: gradeResult.modelProvider,
            aiModelId: gradeResult.modelId,
            isPractice: false,
            targetLearnableIds: [...input.targetLearnableIds],
            durationMs: input.durationMs,
        });

        return {
            grade: gradeResult.grade,
            feedback: gradeResult.feedback,
            updatedCard,
        };
    }

    public async getSessionSummary(userId: string, sessionId: string): Promise<SessionSummary> {
        const reviews = await this.reviewRepo.listReviewsBySession(userId, sessionId);

        const grades: Record<SrsGrade, number> = {
            missed: 0,
            shaky: 0,
            okay: 0,
            solid: 0,
            nailed: 0,
        };

        for (const review of reviews) {
            grades[review.grade]++;
        }

        const weakLearnableIds = await this.reviewRepo.getWeakLearnableIds(userId, 5);
        const weakItems: Learnable[] = [];
        for (const lid of weakLearnableIds) {
            const l = await this.learnableRepo.findLearnableById(lid);
            if (l) weakItems.push(l);
        }

        return {
            sessionId,
            total: reviews.length,
            grades,
            weakItems,
            newItemCount: 0,
        };
    }

    private async findBundledLearnables(userId: string, excludeId: LearnableId): Promise<Learnable[]> {
        const strongCards = await this.cardRepo.findDueCards(userId, 50);
        const candidates = strongCards.filter((c) => c.learnableId !== excludeId && c.easeFactor >= 2.3 && c.repetitionCount >= 2);

        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);

        const learnables: Learnable[] = [];
        for (const card of selected) {
            const l = await this.learnableRepo.findLearnableById(card.learnableId);
            if (l) learnables.push(l);
        }

        return learnables;
    }
}

export class PracticeService {
    public constructor(
        private readonly cardRepo: SrsCardRepository,
        private readonly reviewRepo: SrsReviewRepository,
        private readonly learnableRepo: LearnableRepository,
        private readonly cardGenerator: SrsCardGenerator,
        private readonly answerGrader: SrsAnswerGrader,
    ) {}

    public async startPracticeSession(
        userId: string,
        filter: {
            mode: "weak_items" | "category" | "random";
            types?: readonly LearnableType[];
            limit?: number;
        },
    ): Promise<ReviewSession> {
        const sessionId = randomUUID();
        const limit = filter.limit ?? DEFAULT_MAX_CARDS;
        let learnableIds: LearnableId[] = [];

        switch (filter.mode) {
            case "weak_items": {
                learnableIds = [...(await this.reviewRepo.getWeakLearnableIds(userId, limit))];
                break;
            }
            case "category": {
                const learnables = await this.learnableRepo.listLearnables({
                    types: filter.types,
                    limit,
                    sort: "frequency",
                });
                learnableIds = learnables.map((l) => l.id);
                break;
            }
            case "random": {
                const learnables = await this.learnableRepo.listLearnables({
                    limit,
                    sort: "last_seen",
                });
                learnableIds = learnables.map((l) => l.id);
                break;
            }
        }

        const cards: ReviewCard[] = [];
        for (const learnableId of learnableIds) {
            const card = await this.cardRepo.findOrCreateCard(userId, learnableId);
            cards.push({ cardId: card.id, learnableId: card.learnableId });
        }

        return { sessionId, cards };
    }

    public async generateCard(userId: string, learnableId: LearnableId): Promise<GeneratedCard> {
        const learnable = await this.learnableRepo.findLearnableById(learnableId);
        if (!learnable) {
            throw new Error(`Learnable not found: ${learnableId}`);
        }

        const recentGrades = await this.reviewRepo.getRecentGradesForLearnable(userId, learnableId, 5);
        const cardType = selectCardType(learnable, recentGrades);
        const bundledLearnables = await findScaffoldLearnables(this.learnableRepo, learnable);

        const result = await this.cardGenerator.generateCard({
            cardType,
            targetLearnables: [learnable],
            bundledLearnables,
        });

        return {
            cardType,
            prompt: result.prompt,
            learnables: [learnable],
            metadata: result.metadata,
        };
    }

    public async submitPracticeAnswer(input: {
        userId: string;
        sessionId: string;
        cardId: SrsCardId;
        cardType: SrsCardType;
        prompt: string;
        userAnswer: string;
        targetLearnableIds: readonly string[];
        durationMs?: number;
    }): Promise<GradingResult> {
        const learnables: Learnable[] = [];
        for (const lid of input.targetLearnableIds) {
            const l = await this.learnableRepo.findLearnableById(lid as LearnableId);
            if (l) learnables.push(l);
        }

        const gradeResult = await this.answerGrader.gradeAnswer({
            cardType: input.cardType,
            prompt: input.prompt,
            userAnswer: input.userAnswer,
            targetLearnables: learnables,
        });

        await this.reviewRepo.createReview({
            cardId: input.cardId,
            userId: input.userId,
            sessionId: input.sessionId,
            cardType: input.cardType,
            grade: gradeResult.grade,
            prompt: input.prompt,
            userAnswer: input.userAnswer,
            aiFeedback: gradeResult.feedback,
            aiModelProvider: gradeResult.modelProvider,
            aiModelId: gradeResult.modelId,
            isPractice: true,
            targetLearnableIds: [...input.targetLearnableIds],
            durationMs: input.durationMs,
        });

        return {
            grade: gradeResult.grade,
            feedback: gradeResult.feedback,
        };
    }
}
