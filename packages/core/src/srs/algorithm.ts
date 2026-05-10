import { gradeToNumber, type SrsCard, type SrsCardStatus, type SrsGrade, type SrsSchedulingResult } from "./model";

export interface SrsScheduler {
    schedule(card: SrsCard, grade: SrsGrade, now?: Date): SrsSchedulingResult;
}

const EASE_FLOOR = 1.3;
const GRADUATED_INTERVAL_THRESHOLD = 21;
const GRADUATED_EASE_THRESHOLD = 2.0;

export class Sm2Scheduler implements SrsScheduler {
    public schedule(card: SrsCard, grade: SrsGrade, now: Date = new Date()): SrsSchedulingResult {
        const q = gradeToNumber[grade];
        const isLapse = q < 3;

        let newEaseFactor = card.easeFactor;
        let newIntervalDays: number;
        let newRepetitionCount = card.repetitionCount;
        let newLapseCount = card.lapseCount;
        let newStatus: SrsCardStatus = card.status === "new" ? "active" : card.status;

        if (isLapse) {
            newLapseCount = card.lapseCount + 1;
            newRepetitionCount = 0;
            newIntervalDays = 1;
            newEaseFactor = Math.max(EASE_FLOOR, card.easeFactor - 0.2);
        } else {
            newRepetitionCount = card.repetitionCount + 1;

            if (newRepetitionCount === 1) {
                newIntervalDays = 1;
            } else if (newRepetitionCount === 2) {
                newIntervalDays = 6;
            } else {
                newIntervalDays = Math.round(card.intervalDays * card.easeFactor * 10) / 10;
            }

            newEaseFactor = Math.max(EASE_FLOOR, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
        }

        if (newStatus === "active" && newIntervalDays > GRADUATED_INTERVAL_THRESHOLD && newEaseFactor > GRADUATED_EASE_THRESHOLD) {
            newStatus = "graduated";
        }

        const nextReviewAt = new Date(now.getTime() + newIntervalDays * 24 * 60 * 60 * 1000);

        return {
            newEaseFactor,
            newIntervalDays,
            newStatus,
            nextReviewAt,
            newRepetitionCount,
            newLapseCount,
        };
    }
}
