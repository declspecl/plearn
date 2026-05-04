"use client";

import { colorizeWord, type VietnameseTone } from "@plearn/core/vietnamese/tone-parser";
import { api } from "@plearn/trpc/client/react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const TONE_CLASS: Record<VietnameseTone, string> = {
    1: "text-tone-1",
    2: "text-tone-2",
    3: "text-tone-3",
    4: "text-tone-4",
    5: "text-tone-5",
    6: "text-tone-6",
};

function ToneColoredText({ text, className }: { text: string; className?: string }) {
    const words = text.split(/(\s+)/);
    return (
        <span className={className}>
            {words.map((segment, i) =>
                /^\s+$/.test(segment) ? (
                    <span key={i}>{segment}</span>
                ) : (
                    <span key={i} className={TONE_CLASS[colorizeWord(segment).tone]}>
                        {segment}
                    </span>
                ),
            )}
        </span>
    );
}

interface EditableItem {
    readonly id: string;
    readonly proposedType: "grammar_pattern" | "vocabulary" | "utility_word" | "phrase";
    proposedText: string;
    proposedTranslation: string;
    proposedNotes: string;
    proposedJson: Record<string, unknown>;
    reviewAction: "pending" | "create_new" | "merge_existing" | "reject";
    mergeTargetLearnableId?: string;
    readonly duplicateSuggestions: Array<{
        readonly learnable: {
            readonly id: string;
            readonly canonicalText: string;
            readonly translation: string;
            readonly occurrenceCount: number;
        };
        readonly confidence: number;
        readonly reason: string;
    }>;
}

interface SentenceData {
    readonly text: string;
    readonly meaning: string;
}

interface WorkspaceEditorProps {
    readonly initialWorkspace?: {
        readonly id: string;
        readonly sourceText: string;
        readonly summary?: string;
        readonly status: string;
        readonly items: EditableItem[];
        readonly rawAnalysisJson?: Record<string, unknown>;
    };
}

function typeLabel(type: EditableItem["proposedType"]) {
    switch (type) {
        case "grammar_pattern":
            return "Grammar";
        case "utility_word":
            return "Utility";
        case "vocabulary":
            return "Vocabulary";
        case "phrase":
            return "Phrase";
    }
}

function extractSentenceData(rawAnalysisJson?: Record<string, unknown>): SentenceData | undefined {
    if (!rawAnalysisJson?.sentence || typeof rawAnalysisJson.sentence !== "object") return undefined;
    const s = rawAnalysisJson.sentence as Record<string, unknown>;
    if (typeof s.text !== "string" || typeof s.meaning !== "string") return undefined;
    return { text: s.text, meaning: s.meaning };
}

function DuplicateSuggestions({ item, onMerge }: { item: EditableItem; onMerge: (learnableId: string) => void }) {
    if (item.duplicateSuggestions.length === 0) {
        return (
            <div className="border-border bg-muted text-muted-foreground rounded-2xl border border-dashed p-4 text-sm">
                No close catalog match detected yet.
            </div>
        );
    }

    return (
        <div className="border-border bg-warning/10 space-y-2 rounded-2xl border p-4">
            <p className="text-foreground text-sm font-medium">Merge Suggestions</p>
            {item.duplicateSuggestions.map((suggestion) => (
                <button
                    key={suggestion.learnable.id}
                    className="border-border bg-card hover:border-ring block w-full rounded-xl border p-3 text-left transition"
                    onClick={() => onMerge(suggestion.learnable.id)}
                    type="button"
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground font-medium">{suggestion.learnable.canonicalText}</span>
                        <span className="text-muted-foreground text-xs">
                            {Math.round(suggestion.confidence * 100)}% {suggestion.reason}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{suggestion.learnable.translation}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{suggestion.learnable.occurrenceCount} recorded occurrences</p>
                </button>
            ))}
        </div>
    );
}

function ItemCard({ item, onUpdate }: { item: EditableItem; onUpdate: (patch: Partial<EditableItem>) => void }) {
    return (
        <Card>
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{typeLabel(item.proposedType)}</Badge>
                    <Badge variant={item.reviewAction === "reject" ? "destructive" : "secondary"}>{item.reviewAction}</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                    <Input value={item.proposedText} onChange={(event) => onUpdate({ proposedText: event.target.value })} />
                    <Input value={item.proposedTranslation} onChange={(event) => onUpdate({ proposedTranslation: event.target.value })} />
                    <Textarea
                        className="min-h-28"
                        value={item.proposedNotes}
                        onChange={(event) => onUpdate({ proposedNotes: event.target.value })}
                    />
                </div>
                <div className="space-y-4">
                    <Select
                        value={item.reviewAction}
                        onValueChange={(value) => onUpdate({ reviewAction: value as EditableItem["reviewAction"] })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choose review action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="create_new">Create New</SelectItem>
                            <SelectItem value="merge_existing">Merge Existing</SelectItem>
                            <SelectItem value="reject">Reject</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                    <DuplicateSuggestions
                        item={item}
                        onMerge={(learnableId) => onUpdate({ reviewAction: "merge_existing", mergeTargetLearnableId: learnableId })}
                    />
                </div>
            </CardContent>
            <CardFooter className="border-border text-muted-foreground justify-between border-t pt-4 text-xs">
                <span>Workspace item {item.id.slice(0, 8)}</span>
                <span>{item.mergeTargetLearnableId ? `Merge target: ${item.mergeTargetLearnableId.slice(0, 8)}` : "New learnable"}</span>
            </CardFooter>
        </Card>
    );
}

export function WorkspaceEditor({ initialWorkspace }: WorkspaceEditorProps) {
    const router = useRouter();
    const [sourceText, setSourceText] = useState(initialWorkspace?.sourceText ?? "");
    const [workspace, setWorkspace] = useState(initialWorkspace);
    const [sentenceData, setSentenceData] = useState<SentenceData | undefined>(extractSentenceData(initialWorkspace?.rawAnalysisJson));
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const deferredText = useDeferredValue(sourceText);
    const analyzeMutation = api.learning.analyzeSentence.useMutation();
    const updateMutation = api.learning.updateWorkspaceReview.useMutation();
    const saveMutation = api.learning.saveWorkspace.useMutation();

    async function analyze() {
        const nextWorkspace = await analyzeMutation.mutateAsync({
            languageCode: "vi",
            sourceText: deferredText,
        });

        const rawJson = nextWorkspace.rawAnalysisJson as Record<string, unknown> | undefined;
        setSentenceData(extractSentenceData(rawJson));

        setWorkspace({
            id: nextWorkspace.id,
            sourceText: nextWorkspace.sourceText,
            summary: nextWorkspace.summary,
            status: nextWorkspace.status,
            rawAnalysisJson: rawJson,
            items: nextWorkspace.items.map((item) => ({
                id: item.id,
                proposedType: item.proposedType,
                proposedText: item.proposedText,
                proposedTranslation: item.proposedTranslation,
                proposedNotes: item.proposedNotes,
                proposedJson: item.proposedJson,
                reviewAction: item.reviewAction,
                mergeTargetLearnableId: item.mergeTargetLearnableId,
                duplicateSuggestions: item.duplicateSuggestions.map((suggestion) => ({
                    learnable: {
                        id: suggestion.learnable.id,
                        canonicalText: suggestion.learnable.canonicalText,
                        translation: suggestion.learnable.translation,
                        occurrenceCount: suggestion.learnable.occurrenceCount,
                    },
                    confidence: suggestion.confidence,
                    reason: suggestion.reason,
                })),
            })),
        });
        setSaveMessage(null);
    }

    function updateItem(id: string, patch: Partial<EditableItem>) {
        setWorkspace((current) =>
            current
                ? {
                      ...current,
                      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                  }
                : current,
        );
    }

    async function save() {
        if (!workspace) return;

        const reviewedAnalysisJson = {
            sourceText: workspace.sourceText,
            summary: workspace.summary,
            items: workspace.items.map((item) => ({
                id: item.id,
                type: item.proposedType,
                text: item.proposedText,
                translation: item.proposedTranslation,
                notes: item.proposedNotes,
                reviewAction: item.reviewAction,
                mergeTargetLearnableId: item.mergeTargetLearnableId,
            })),
        } satisfies Record<string, unknown>;

        await updateMutation.mutateAsync({
            workspaceId: workspace.id,
            languageCode: "vi",
            reviewedAnalysisJson,
            items: workspace.items.map((item) => ({
                id: item.id,
                proposedText: item.proposedText,
                proposedTranslation: item.proposedTranslation,
                proposedNotes: item.proposedNotes,
                proposedJson: item.proposedJson,
                reviewAction: item.reviewAction,
                mergeTargetLearnableId: item.mergeTargetLearnableId,
            })),
        });

        const result = await saveMutation.mutateAsync({
            workspaceId: workspace.id,
        });

        setSaveMessage(`Saved ${result.savedLearnables.length} learnables.`);
        startTransition(() => {
            router.push(`/tools/vietnamese/sentences/${workspace.id}`);
            router.refresh();
        });
    }

    const components = workspace?.items.filter((i) => i.proposedType === "grammar_pattern" || i.proposedType === "phrase") ?? [];
    const words = workspace?.items.filter((i) => i.proposedType === "vocabulary" || i.proposedType === "utility_word") ?? [];

    return (
        <div className="space-y-8">
            <Card className="overflow-hidden shadow-lg">
                <CardHeader className="border-border bg-accent border-b">
                    <CardTitle className="text-3xl font-[var(--font-display)] tracking-[-0.03em]">Sentence Decomposer</CardTitle>
                    <CardDescription className="max-w-2xl text-sm text-pretty">
                        Feed an English sentence into the workspace, inspect the extracted Vietnamese learnables, then decide what becomes
                        part of your long-term catalog.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                    <Textarea
                        className="min-h-32 resize-y text-base"
                        placeholder="Type the English sentence you want to decompose..."
                        value={sourceText}
                        onChange={(event) => setSourceText(event.target.value)}
                    />
                    <div className="flex items-center gap-3">
                        <Button disabled={!deferredText.trim() || analyzeMutation.isPending} onClick={analyze} type="button">
                            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Sentence"}
                        </Button>
                        {saveMessage ? <span className="text-success-foreground text-sm">{saveMessage}</span> : null}
                        {analyzeMutation.error ? (
                            <span className="text-destructive-foreground text-sm">{analyzeMutation.error.message}</span>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            {workspace ? (
                <div className="space-y-8">
                    {/* Section 1: Sentence Translation */}
                    {sentenceData ? (
                        <section className="space-y-3">
                            <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Sentence</h2>
                            <Card>
                                <CardContent className="space-y-2 p-6">
                                    <ToneColoredText text={sentenceData.text} className="text-xl leading-relaxed font-medium" />
                                    <p className="text-muted-foreground">{sentenceData.meaning}</p>
                                </CardContent>
                            </Card>
                        </section>
                    ) : workspace.summary ? (
                        <section className="space-y-3">
                            <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Sentence</h2>
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-muted-foreground">{workspace.summary}</p>
                                </CardContent>
                            </Card>
                        </section>
                    ) : null}

                    {/* Section 2: Components (grammar patterns + phrases) */}
                    {components.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Components</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Phrases, structures, and grammar patterns extracted from the sentence.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {components.map((item) => (
                                    <ItemCard key={item.id} item={item} onUpdate={(patch) => updateItem(item.id, patch)} />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {/* Section 3: Words */}
                    {words.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Words</h2>
                                    <p className="text-muted-foreground text-sm">Individual Vietnamese words and graphemes.</p>
                                </div>
                            </div>
                            <div className="grid gap-4">
                                {words.map((item) => (
                                    <ItemCard key={item.id} item={item} onUpdate={(patch) => updateItem(item.id, patch)} />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {/* Save action */}
                    <div className="flex justify-end">
                        <Button disabled={updateMutation.isPending || saveMutation.isPending} onClick={save} type="button" size="lg">
                            {saveMutation.isPending ? "Saving..." : "Save To Catalog"}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
