"use client";

import { AnnotatedSentence, ToneLegend, type WordInfo } from "./annotated-sentence";
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@/lib/local-storage";
import { api } from "@plearn/trpc/client/react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
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
    suggestionsStatus: "idle" | "loading" | "ready" | "failed";
    duplicateSuggestionsLastComputedAt?: string;
    duplicateSuggestionsError?: string;
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
        case "grammar_pattern": {
            return "Grammar";
        }
        case "utility_word": {
            return "Utility";
        }
        case "vocabulary": {
            return "Vocabulary";
        }
        case "phrase": {
            return "Phrase";
        }
    }
}

function extractSentenceData(rawAnalysisJson?: Record<string, unknown>): SentenceData | undefined {
    if (!rawAnalysisJson?.sentence || typeof rawAnalysisJson.sentence !== "object") return undefined;
    const s = rawAnalysisJson.sentence as Record<string, unknown>;
    if (typeof s.text !== "string" || typeof s.meaning !== "string") return undefined;

    return { text: s.text, meaning: s.meaning };
}

function DuplicateSuggestions({ item, onMerge }: { item: EditableItem; onMerge: (learnableId: string) => void }) {
    if (item.suggestionsStatus === "loading" || item.suggestionsStatus === "idle") {
        return (
            <div className="border-border bg-muted text-muted-foreground rounded-2xl border border-dashed p-4 text-sm">
                Finding catalog matches...
            </div>
        );
    }

    if (item.suggestionsStatus === "failed") {
        return (
            <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-2xl border p-4 text-sm">
                Match lookup failed. {item.duplicateSuggestionsError ?? "Please retry."}
            </div>
        );
    }

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

const ANALYSIS_PHASES = [
    { label: "Translating sentence", duration: 5000 },
    { label: "Extracting grammar patterns", duration: 7000 },
    { label: "Analysis ready", duration: 3000 },
] as const;

const ANALYSIS_DRAFT_KEY = "plearn:analysis:draft:v1";
const REVIEW_DRAFT_PREFIX = "plearn:workspace-review:";

function AnalysisProgress({ isActive }: { isActive: boolean }) {
    const [phase, setPhase] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef(Date.now());

    useEffect(() => {
        if (!isActive) {
            setPhase(0);
            setElapsed(0);

            return;
        }

        startRef.current = Date.now();

        let currentPhaseIdx = 0;
        let phaseTimeout: ReturnType<typeof setTimeout>;

        function scheduleNext() {
            if (currentPhaseIdx >= ANALYSIS_PHASES.length - 1) return;
            phaseTimeout = setTimeout(() => {
                currentPhaseIdx++;
                setPhase(currentPhaseIdx);
                scheduleNext();
            }, ANALYSIS_PHASES[currentPhaseIdx]!.duration);
        }
        scheduleNext();

        const elapsedTimer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);

        return () => {
            clearTimeout(phaseTimeout);
            clearInterval(elapsedTimer);
        };
    }, [isActive]);

    if (!isActive) return null;

    const currentPhase = ANALYSIS_PHASES[phase]!;

    return (
        <motion.div
            className="border-border bg-card overflow-hidden rounded-xl border p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={phase}
                            className="text-foreground text-sm font-medium"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentPhase.label}
                        </motion.p>
                    </AnimatePresence>
                    <span className="text-muted-foreground text-xs tabular-nums">{elapsed}s</span>
                </div>

                <div className="flex items-center gap-2">
                    {ANALYSIS_PHASES.map((_, i) => (
                        <div key={i} className="bg-muted relative h-1 flex-1 overflow-hidden rounded-full">
                            {i < phase ? (
                                <motion.div
                                    className="bg-foreground/60 absolute inset-0 rounded-full"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : i === phase ? (
                                <motion.div
                                    className="bg-foreground/40 absolute inset-0 rounded-full"
                                    animate={{ scaleX: [0, 0.7, 0.4, 0.9] }}
                                    transition={{ duration: currentPhase.duration / 1000, ease: "easeInOut" }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            className="bg-foreground/20 h-5 rounded"
                            style={{ width: `${12 + Math.random() * 20}%` }}
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export function WorkspaceEditor({ initialWorkspace }: WorkspaceEditorProps) {
    const router = useRouter();
    const [sourceText, setSourceText] = useState(() => {
        const draft = getLocalStorageItem<string>(ANALYSIS_DRAFT_KEY);

        return draft ?? initialWorkspace?.sourceText ?? "";
    });
    const [workspace, setWorkspace] = useState(initialWorkspace);
    const [sentenceData, setSentenceData] = useState<SentenceData | undefined>(extractSentenceData(initialWorkspace?.rawAnalysisJson));
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const deferredText = useDeferredValue(sourceText);
    const analyzeMutation = api.learning.analyzeSentence.useMutation();
    const updateMutation = api.learning.updateWorkspaceReview.useMutation();
    const saveMutation = api.learning.saveWorkspace.useMutation();
    const workspaceSuggestionsQuery = api.learning.getWorkspaceSuggestions.useQuery(
        {
            workspaceId: workspace?.id ?? "",
            languageCode: "vi",
        },
        {
            enabled: Boolean(workspace?.id),
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    );

    useEffect(() => {
        setLocalStorageItem(ANALYSIS_DRAFT_KEY, sourceText);
    }, [sourceText]);

    useEffect(() => {
        if (!workspace) return;
        setLocalStorageItem(`${REVIEW_DRAFT_PREFIX}${workspace.id}:v1`, workspace.items);
    }, [workspace]);

    useEffect(() => {
        if (!workspace) return;
        const key = `${REVIEW_DRAFT_PREFIX}${workspace.id}:v1`;
        const draftItems = getLocalStorageItem<EditableItem[]>(key);
        if (!draftItems?.length) return;
        setWorkspace((current) => (current ? { ...current, items: draftItems } : current));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from localStorage only when workspace id changes
    }, [workspace?.id]);

    useEffect(() => {
        if (!workspaceSuggestionsQuery.data) return;
        const nextWorkspace = workspaceSuggestionsQuery.data;
        setWorkspace((current) =>
            current
                ? {
                      ...current,
                      items: nextWorkspace.items.map((item) => ({
                          id: item.id,
                          proposedType: item.proposedType,
                          proposedText: item.proposedText,
                          proposedTranslation: item.proposedTranslation,
                          proposedNotes: item.proposedNotes,
                          proposedJson: item.proposedJson,
                          reviewAction: item.reviewAction,
                          mergeTargetLearnableId: item.mergeTargetLearnableId,
                          suggestionsStatus: item.suggestionsStatus,
                          duplicateSuggestionsLastComputedAt: item.duplicateSuggestionsLastComputedAt?.toString(),
                          duplicateSuggestionsError: item.duplicateSuggestionsError,
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
                  }
                : current,
        );
    }, [workspaceSuggestionsQuery.data]);

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
                suggestionsStatus: item.suggestionsStatus,
                duplicateSuggestionsLastComputedAt: item.duplicateSuggestionsLastComputedAt?.toString(),
                duplicateSuggestionsError: item.duplicateSuggestionsError,
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

    useEffect(() => {
        if (!workspace) return;
        if (workspace.items.some((item) => item.suggestionsStatus !== "ready")) {
            void workspaceSuggestionsQuery.refetch();
        }
    }, [workspace, workspaceSuggestionsQuery]);

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
        removeLocalStorageItem(`${REVIEW_DRAFT_PREFIX}${workspace.id}:v1`);
        removeLocalStorageItem(ANALYSIS_DRAFT_KEY);
        startTransition(() => {
            router.push(`/tools/vietnamese/sentences/${workspace.id}`);
        });
    }

    const components = workspace?.items.filter((i) => i.proposedType === "grammar_pattern" || i.proposedType === "phrase") ?? [];
    const words = workspace?.items.filter((i) => i.proposedType === "vocabulary" || i.proposedType === "utility_word") ?? [];

    const wordInfoItems: WordInfo[] = useMemo(() => {
        if (!workspace) return [];

        return workspace.items.map((item) => ({
            text: item.proposedText,
            translation: item.proposedTranslation,
            type: item.proposedType,
            notes: item.proposedNotes,
            formula: typeof item.proposedJson.formula === "string" ? item.proposedJson.formula : undefined,
            exampleHints: Array.isArray(item.proposedJson.exampleHints)
                ? (item.proposedJson.exampleHints as Array<{ exampleText: string; translation: string }>)
                : [],
        }));
    }, [workspace]);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <Textarea
                    className="border-border bg-background min-h-32 resize-y text-base shadow-sm"
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
            </div>

            <AnimatePresence>
                {analyzeMutation.isPending ? <AnalysisProgress isActive={analyzeMutation.isPending} /> : null}
            </AnimatePresence>

            {workspace ? (
                <div className="space-y-8">
                    {/* Section 1: Sentence Translation */}
                    {sentenceData ? (
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <h2 className="text-foreground text-2xl font-[var(--font-display)] tracking-[-0.03em]">Sentence</h2>
                                <ToneLegend />
                            </div>
                            <Card>
                                <CardContent className="space-y-2 p-6">
                                    <AnnotatedSentence
                                        sentence={sentenceData.text}
                                        items={wordInfoItems}
                                        className="text-xl leading-relaxed font-medium"
                                    />
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
