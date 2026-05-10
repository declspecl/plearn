import type { Learnable, LearnableId } from "../../learning/model/learning";
import { createEntityId, type EntityId } from "../../shared/model/id";

export type SrsCardId = EntityId<"SrsCard">;
export type SrsReviewId = EntityId<"SrsReview">;

export function createSrsCardId(id: string): SrsCardId {
    return createEntityId<"SrsCard">(id);
}

export function createSrsReviewId(id: string): SrsReviewId {
    return createEntityId<"SrsReview">(id);
}

export const srsCardStatuses = ["new", "active", "graduated", "suspended"] as const;
export type SrsCardStatus = (typeof srsCardStatuses)[number];

export const srsGrades = ["missed", "shaky", "okay", "solid", "nailed"] as const;
export type SrsGrade = (typeof srsGrades)[number];

export const srsCardTypes = [
    "use_in_sentence",
    "whats_wrong",
    "pick_right_one",
    "shift_register",
    "complete_thought",
    "what_does_this_mean",
    "how_would_you_say",
] as const;
export type SrsCardType = (typeof srsCardTypes)[number];

export const gradeToNumber: Record<SrsGrade, number> = {
    missed: 1,
    shaky: 2,
    okay: 3,
    solid: 4,
    nailed: 5,
};

export interface SrsCard {
    readonly id: SrsCardId;
    readonly userId: string;
    readonly learnableId: LearnableId;
    readonly status: SrsCardStatus;
    readonly easeFactor: number;
    readonly intervalDays: number;
    readonly repetitionCount: number;
    readonly lapseCount: number;
    readonly nextReviewAt: Date | null;
    readonly lastReviewedAt: Date | null;
    readonly introducedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface SrsReview {
    readonly id: SrsReviewId;
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
    readonly createdAt: Date;
}

export interface SrsSchedulingResult {
    readonly newEaseFactor: number;
    readonly newIntervalDays: number;
    readonly newStatus: SrsCardStatus;
    readonly nextReviewAt: Date;
    readonly newRepetitionCount: number;
    readonly newLapseCount: number;
}

export interface ReviewCard {
    readonly cardId: SrsCardId;
    readonly learnableId: LearnableId;
}

export interface ReviewSession {
    readonly sessionId: string;
    readonly cards: readonly ReviewCard[];
}

export interface SessionSummary {
    readonly sessionId: string;
    readonly total: number;
    readonly grades: Record<SrsGrade, number>;
    readonly weakItems: readonly Learnable[];
    readonly newItemCount: number;
}

export interface GeneratedCard {
    readonly cardType: SrsCardType;
    readonly prompt: string;
    readonly learnables: readonly Learnable[];
    readonly metadata: Record<string, unknown>;
}

export interface GradingResult {
    readonly grade: SrsGrade;
    readonly feedback: string;
}
