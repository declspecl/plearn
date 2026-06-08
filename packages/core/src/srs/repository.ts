import type { LearnableId } from "../learning/model/learning";
import type { SrsCard, SrsCardId, SrsCardStatus, SrsCardType, SrsGrade, SrsReview } from "./model";

export interface SrsCardUpdate {
    readonly status?: SrsCardStatus;
    readonly easeFactor?: number;
    readonly intervalDays?: number;
    readonly repetitionCount?: number;
    readonly lapseCount?: number;
    readonly nextReviewAt?: Date | null;
    readonly lastReviewedAt?: Date | null;
    readonly introducedAt?: Date | null;
}

export interface CreateSrsReviewInput {
    readonly cardId: SrsCardId;
    readonly userId: string;
    readonly sessionId: string;
    readonly cardType: SrsCardType;
    readonly grade: SrsGrade;
    readonly prompt: string;
    readonly userAnswer: string;
    readonly aiFeedback: string;
    readonly aiModelProvider?: string;
    readonly aiModelId?: string;
    readonly isPractice: boolean;
    readonly targetLearnableIds: readonly string[];
    readonly durationMs?: number;
}

export interface SrsCardRepository {
    findOrCreateCard(userId: string, learnableId: LearnableId): Promise<SrsCard>;
    findDueCards(userId: string, limit: number, languageCode?: string): Promise<readonly SrsCard[]>;
    countDueCards(userId: string, languageCode?: string): Promise<number>;
    updateCard(id: SrsCardId, update: SrsCardUpdate): Promise<SrsCard>;
    findNewCardsToIntroduce(userId: string, limit: number, languageCode?: string): Promise<readonly LearnableId[]>;
    getCardsByLearnableIds(userId: string, learnableIds: readonly LearnableId[]): Promise<readonly SrsCard[]>;
    getCardByLearnableId(userId: string, learnableId: LearnableId): Promise<SrsCard | undefined>;
    countIntroducedToday(userId: string, languageCode?: string): Promise<number>;
}

export interface SrsReviewRepository {
    createReview(input: CreateSrsReviewInput): Promise<SrsReview>;
    listReviewsBySession(userId: string, sessionId: string): Promise<readonly SrsReview[]>;
    getRecentGradesForLearnable(userId: string, learnableId: LearnableId, limit: number): Promise<readonly SrsGrade[]>;
    getWeakLearnableIds(userId: string, limit: number, languageCode?: string): Promise<readonly LearnableId[]>;
}
