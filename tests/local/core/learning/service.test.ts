import type { Learnable, SentenceWorkspace } from "@plearn/core/learning/model";
import { createLanguageId, createLearnableId, createSentenceWorkspaceId, createWorkspaceItemId } from "@plearn/core/learning/model";
import type {
    LearningEmbedder,
    LearningSearchRepository,
    LearnableRepository,
    OccurrenceRepository,
    SentenceWorkspaceRepository,
} from "@plearn/core/learning/repository";
import { WorkspaceReviewService, buildSearchDocument, normalizeLearnableText } from "@plearn/core/learning/service";
import { describe, expect, it, vi } from "vitest";

describe("learning helpers", () => {
    it("normalizes learnable text for dedupe", () => {
        expect(normalizeLearnableText("  Xin   Chào  ")).toBe("xin chào");
    });

    it("builds a dense search document", () => {
        expect(
            buildSearchDocument({
                canonicalText: "xin chao",
                translation: "hello",
                usageNotes: "common greeting",
                aliases: ["chao"],
                examples: [{ exampleText: "xin chao ban", translation: "hello friend" }],
            }),
        ).toContain("hello friend");
    });
});

describe("WorkspaceReviewService", () => {
    it("merges into an existing learnable and records an occurrence", async () => {
        const existingLearnable: Learnable = {
            id: createLearnableId("learnable-1"),
            languageId: createLanguageId("vi"),
            type: "phrase",
            canonicalText: "xin chào",
            normalizedText: "xin chào",
            translation: "hello",
            usageNotes: "greeting",
            searchDocument: "xin chào hello greeting",
            occurrenceCount: 2,
            firstSeenAt: new Date("2024-01-01"),
            lastSeenAt: new Date("2024-01-02"),
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-02"),
            aliases: [],
            examples: [],
        };

        const workspace: SentenceWorkspace = {
            id: createSentenceWorkspaceId("workspace-1"),
            languageId: createLanguageId("vi"),
            sourceText: "I just wanted to say hello.",
            sourceLanguageCode: "en",
            status: "reviewed",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdByUserId: "user-1",
            items: [
                {
                    id: createWorkspaceItemId("item-1"),
                    workspaceId: createSentenceWorkspaceId("workspace-1"),
                    proposedType: "phrase",
                    proposedText: "Xin chào",
                    proposedTranslation: "hello",
                    proposedNotes: "default greeting",
                    proposedJson: {},
                    reviewAction: "merge_existing",
                    mergeTargetLearnableId: existingLearnable.id,
                    position: 0,
                    duplicateSuggestions: [],
                },
            ],
        };

        const workspaces: SentenceWorkspaceRepository = {
            createWorkspace: vi.fn(),
            recordAnalysis: vi.fn(),
            updateReview: vi.fn(),
            markFailed: vi.fn(),
            markSaved: vi.fn(async () => workspace),
            findWorkspaceById: vi.fn(async () => workspace),
            listWorkspaces: vi.fn(),
        };
        const learnables: LearnableRepository = {
            findLanguageByCode: vi.fn(),
            listLearnables: vi.fn(),
            findLearnableById: vi.fn(async () => existingLearnable),
            findExactMatch: vi.fn(),
            findAliasMatch: vi.fn(),
            createLearnable: vi.fn(),
            updateLearnable: vi.fn(async (_id, input) => ({
                ...existingLearnable,
                usageNotes: input.usageNotes ?? existingLearnable.usageNotes,
                occurrenceCount: input.occurrenceCount ?? existingLearnable.occurrenceCount,
            })),
            touchLearnable: vi.fn(),
            listRelatedLearnables: vi.fn(),
        };
        const occurrences: OccurrenceRepository = {
            createOccurrence: vi.fn(async () => ({
                id: "occurrence-1" as any,
                learnableId: existingLearnable.id,
                workspaceId: workspace.id,
                sourceSpanText: "Xin chào",
                sourceSentenceText: workspace.sourceText,
                createdAt: new Date(),
            })),
            listOccurrencesForLearnable: vi.fn(),
        };
        const search: LearningSearchRepository = {
            findLexicalMatches: vi.fn(),
            findSemanticMatches: vi.fn(),
        };
        const embedder: LearningEmbedder = {
            buildEmbeddingSourceText: vi.fn(),
            embed: vi.fn(),
        };

        const service = new WorkspaceReviewService(workspaces, learnables, occurrences, search, embedder);
        const result = await service.saveWorkspace(workspace.id);

        expect(result.savedLearnables).toHaveLength(1);
        expect(learnables.updateLearnable).toHaveBeenCalled();
        expect(occurrences.createOccurrence).toHaveBeenCalled();
    });
});
