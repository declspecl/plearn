"use client";

import { api } from "@plearn/trpc/client/react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

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

interface WorkspaceEditorProps {
    readonly initialWorkspace?: {
        readonly id: string;
        readonly sourceText: string;
        readonly summary?: string;
        readonly status: string;
        readonly items: EditableItem[];
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

export function WorkspaceEditor({ initialWorkspace }: WorkspaceEditorProps) {
    const router = useRouter();
    const [sourceText, setSourceText] = useState(initialWorkspace?.sourceText ?? "");
    const [workspace, setWorkspace] = useState(initialWorkspace);
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
        setWorkspace({
            id: nextWorkspace.id,
            sourceText: nextWorkspace.sourceText,
            summary: nextWorkspace.summary,
            status: nextWorkspace.status,
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
        if (!workspace) {
            return;
        }

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
                <section className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Review Workspace</p>
                            <p className="text-muted-foreground max-w-2xl text-sm">
                                {workspace.summary ?? "Concise study notes will appear here."}
                            </p>
                        </div>
                        <Button disabled={updateMutation.isPending || saveMutation.isPending} onClick={save} type="button">
                            {saveMutation.isPending ? "Saving..." : "Save To Catalog"}
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {workspace.items.map((item) => (
                            <Card key={item.id}>
                                <CardHeader className="gap-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge variant="outline">{typeLabel(item.proposedType)}</Badge>
                                        <Badge variant={item.reviewAction === "reject" ? "destructive" : "secondary"}>
                                            {item.reviewAction}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                                    <div className="space-y-4">
                                        <Input
                                            value={item.proposedText}
                                            onChange={(event) => updateItem(item.id, { proposedText: event.target.value })}
                                        />
                                        <Input
                                            value={item.proposedTranslation}
                                            onChange={(event) => updateItem(item.id, { proposedTranslation: event.target.value })}
                                        />
                                        <Textarea
                                            className="min-h-28"
                                            value={item.proposedNotes}
                                            onChange={(event) => updateItem(item.id, { proposedNotes: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Select
                                            value={item.reviewAction}
                                            onValueChange={(value) =>
                                                updateItem(item.id, {
                                                    reviewAction: value as EditableItem["reviewAction"],
                                                })
                                            }
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

                                        {item.duplicateSuggestions.length > 0 ? (
                                            <div className="border-border bg-warning/10 space-y-2 rounded-2xl border p-4">
                                                <p className="text-foreground text-sm font-medium">Merge Suggestions</p>
                                                {item.duplicateSuggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion.learnable.id}
                                                        className="border-border bg-card hover:border-ring block w-full rounded-xl border p-3 text-left transition"
                                                        onClick={() =>
                                                            updateItem(item.id, {
                                                                reviewAction: "merge_existing",
                                                                mergeTargetLearnableId: suggestion.learnable.id,
                                                            })
                                                        }
                                                        type="button"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-foreground font-medium">
                                                                {suggestion.learnable.canonicalText}
                                                            </span>
                                                            <span className="text-muted-foreground text-xs">
                                                                {Math.round(suggestion.confidence * 100)}% {suggestion.reason}
                                                            </span>
                                                        </div>
                                                        <p className="text-muted-foreground mt-1 text-sm">
                                                            {suggestion.learnable.translation}
                                                        </p>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            {suggestion.learnable.occurrenceCount} recorded occurrences
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="border-border bg-muted text-muted-foreground rounded-2xl border border-dashed p-4 text-sm">
                                                No close catalog match detected yet.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-border text-muted-foreground justify-between border-t pt-4 text-xs">
                                    <span>Workspace item {item.id.slice(0, 8)}</span>
                                    <span>
                                        {item.mergeTargetLearnableId
                                            ? `Merge target: ${item.mergeTargetLearnableId.slice(0, 8)}`
                                            : "New learnable"}
                                    </span>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
