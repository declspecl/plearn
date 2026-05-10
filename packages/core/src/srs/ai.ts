import type { Learnable } from "../learning/model/learning";
import type { SrsCardType, SrsGrade } from "./model";

export interface SrsCardGeneratorInput {
    readonly cardType: SrsCardType;
    readonly targetLearnables: readonly Learnable[];
    readonly bundledLearnables?: readonly Learnable[];
}

export interface SrsCardGeneratorOutput {
    readonly prompt: string;
    readonly metadata: Record<string, unknown>;
}

export interface SrsCardGenerator {
    generateCard(input: SrsCardGeneratorInput): Promise<SrsCardGeneratorOutput>;
}

export interface SrsAnswerGraderInput {
    readonly cardType: SrsCardType;
    readonly prompt: string;
    readonly userAnswer: string;
    readonly targetLearnables: readonly Learnable[];
}

export interface SrsAnswerGraderOutput {
    readonly grade: SrsGrade;
    readonly feedback: string;
    readonly modelProvider?: string;
    readonly modelId?: string;
}

export interface SrsAnswerGrader {
    gradeAnswer(input: SrsAnswerGraderInput): Promise<SrsAnswerGraderOutput>;
}
