"use client";

import { AnnotatedSentence, ToneLegend, type WordInfo } from "./annotated-sentence";
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@/lib/local-storage";
import { api } from "@plearn/trpc/client/react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

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
            return "Pattern";
        }
        case "utility_word": {
            return "Utility";
        }
        case "vocabulary": {
            return "Word";
        }
        case "phrase": {
            return "Phrase";
        }
    }
}

function extractSentenceData(rawAnalysisJson?: Record<string, unknown>): SentenceData | undefined {
    if (!rawAnalysisJson?.sentence || typeof rawAnalysisJson.sentence !== "object") return undefined;
    const sentence = rawAnalysisJson.sentence as Record<string, unknown>;
    if (typeof sentence.text !== "string" || typeof sentence.meaning !== "string") return undefined;

    return { text: sentence.text, meaning: sentence.meaning };
}

function DuplicateSuggestions({ item, onMerge }: { item: EditableItem; onMerge: (learnableId: string) => void }) {
    if (item.suggestionsStatus === "loading" || item.suggestionsStatus === "idle") {
        return (
            <div className="rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] p-3 text-sm text-[color:var(--plearn-ink-3)]">
                Finding catalog matches...
            </div>
        );
    }

    if (item.suggestionsStatus === "failed") {
        return (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                Match lookup failed. {item.duplicateSuggestionsError ?? "Please retry."}
            </div>
        );
    }

    if (item.duplicateSuggestions.length === 0) {
        return (
            <div className="rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] p-3 text-sm text-[color:var(--plearn-ink-3)]">
                No close catalog match detected yet.
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-md border border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] p-3">
            <p className="text-sm text-[color:var(--plearn-ink-3)]">Merge suggestions</p>
            {item.duplicateSuggestions.map((suggestion) => (
                <button
                    key={suggestion.learnable.id}
                    className="hover:border-primary/60 block w-full rounded-md border border-[color:var(--border)] bg-[color:var(--background)] p-3 text-left transition"
                    onClick={() => onMerge(suggestion.learnable.id)}
                    type="button"
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground font-medium">{suggestion.learnable.canonicalText}</span>
                        <span className="text-xs text-[color:var(--plearn-ink-4)]">{Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--plearn-ink-3)]">{suggestion.learnable.translation}</p>
                    <p className="mt-1 text-xs text-[color:var(--plearn-ink-4)]">
                        {suggestion.learnable.occurrenceCount} recorded occurrences
                    </p>
                </button>
            ))}
        </div>
    );
}

function matchState(item: EditableItem) {
    if (item.reviewAction === "merge_existing" && item.mergeTargetLearnableId) {
        return { label: "matched", accent: "text-[color:var(--plearn-green)]", createNew: false };
    }

    if (item.duplicateSuggestions.length > 0) {
        return { label: "matched", accent: "text-[color:var(--plearn-green)]", createNew: false };
    }

    return { label: "no match", accent: "text-[color:var(--plearn-ink-3)]", createNew: true };
}

function ItemCard({
    item,
    expanded,
    onToggle,
    onUpdate,
}: {
    item: EditableItem;
    expanded: boolean;
    onToggle: () => void;
    onUpdate: (patch: Partial<EditableItem>) => void;
}) {
    const state = matchState(item);

    return (
        <div
            className={cn(
                "overflow-hidden rounded-[10px] border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] transition-colors",
                expanded ? "border-primary" : "hover:border-white/20",
            )}
        >
            <button
                className="grid w-full gap-3 px-4 py-4 text-left md:grid-cols-[24px_1fr_auto_auto] md:items-center"
                onClick={onToggle}
                type="button"
            >
                <span className="text-sm text-[color:var(--plearn-ink-4)]">{expanded ? "▾" : "▸"}</span>
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-foreground text-[1.2rem] font-[var(--font-display)] tracking-[-0.02em]">{item.proposedText}</span>
                    <span className="text-sm text-[color:var(--plearn-ink-3)]">{item.proposedTranslation}</span>
                </span>
                <span className="justify-self-start rounded-full border border-[color:var(--border)] px-3 py-1 text-sm text-[color:var(--plearn-ink-3)]">
                    {typeLabel(item.proposedType)}
                </span>
                <span className={cn("text-sm", state.accent)}>
                    {state.label}
                    {state.createNew ? (
                        <span
                            className="text-primary ml-2"
                            onClick={(event) => {
                                event.stopPropagation();
                                onUpdate({ reviewAction: "create_new" });
                            }}
                        >
                            + add to catalog
                        </span>
                    ) : null}
                </span>
            </button>

            {expanded ? (
                <div className="grid gap-5 border-t border-dashed border-[color:var(--border)] px-5 py-5 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm text-[color:var(--plearn-ink-3)]">Vietnamese</label>
                            <Input
                                className="rounded-md bg-[color:var(--background)]"
                                value={item.proposedText}
                                onChange={(event) => onUpdate({ proposedText: event.target.value })}
                            />
                        </div>
                        {item.proposedType === "grammar_pattern" ? (
                            <div>
                                <label className="mb-1 block text-sm text-[color:var(--plearn-ink-3)]">Pattern</label>
                                <Input
                                    className="rounded-md bg-[color:var(--background)]"
                                    value={typeof item.proposedJson.formula === "string" ? item.proposedJson.formula : item.proposedText}
                                    onChange={(event) =>
                                        onUpdate({
                                            proposedJson: {
                                                ...item.proposedJson,
                                                formula: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                        ) : null}
                        <div>
                            <label className="mb-1 block text-sm text-[color:var(--plearn-ink-3)]">Review action</label>
                            <Select
                                value={item.reviewAction}
                                onValueChange={(value) => onUpdate({ reviewAction: value as EditableItem["reviewAction"] })}
                            >
                                <SelectTrigger className="rounded-md bg-[color:var(--background)]">
                                    <SelectValue placeholder="Choose review action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="create_new">Create New</SelectItem>
                                    <SelectItem value="merge_existing">Merge Existing</SelectItem>
                                    <SelectItem value="reject">Reject</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm text-[color:var(--plearn-ink-3)]">English gloss</label>
                            <Input
                                className="rounded-md bg-[color:var(--background)]"
                                value={item.proposedTranslation}
                                onChange={(event) => onUpdate({ proposedTranslation: event.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-[color:var(--plearn-ink-3)]">Notes</label>
                            <Textarea
                                className="min-h-24 rounded-md bg-[color:var(--background)]"
                                value={item.proposedNotes}
                                onChange={(event) => onUpdate({ proposedNotes: event.target.value })}
                            />
                        </div>
                        <DuplicateSuggestions
                            item={item}
                            onMerge={(learnableId) => onUpdate({ reviewAction: "merge_existing", mergeTargetLearnableId: learnableId })}
                        />
                    </div>
                </div>
            ) : null}
        </div>
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
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] p-6"
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
                    <span className="text-xs text-[color:var(--plearn-ink-4)] tabular-nums">{elapsed}s</span>
                </div>

                <div className="flex items-center gap-2">
                    {ANALYSIS_PHASES.map((_, index) => (
                        <div key={index} className="relative h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--plearn-bg-3)]">
                            {index < phase ? (
                                <motion.div
                                    className="bg-primary/70 absolute inset-0 rounded-full"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : index === phase ? (
                                <motion.div
                                    className="bg-primary/50 absolute inset-0 rounded-full"
                                    animate={{ scaleX: [0, 0.7, 0.4, 0.9] }}
                                    transition={{ duration: currentPhase.duration / 1000, ease: "easeInOut" }}
                                    style={{ transformOrigin: "left" }}
                                />
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export function WorkspaceEditor({ initialWorkspace }: WorkspaceEditorProps) {
    const router = useRouter();
    const [sourceText, setSourceText] = useState(
        () => getLocalStorageItem<string>(ANALYSIS_DRAFT_KEY) ?? initialWorkspace?.sourceText ?? "",
    );
    const [workspace, setWorkspace] = useState(initialWorkspace);
    const [sentenceData, setSentenceData] = useState<SentenceData | undefined>(extractSentenceData(initialWorkspace?.rawAnalysisJson));
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(initialWorkspace?.items[0]?.id ?? null);
    const deferredText = useDeferredValue(sourceText);
    const analyzeMutation = api.learning.analyzeSentence.useMutation();
    const updateMutation = api.learning.updateWorkspaceReview.useMutation();
    const saveMutation = api.learning.saveWorkspace.useMutation();
    const workspaceSuggestionsQuery = api.learning.getWorkspaceSuggestions.useQuery(
        { workspaceId: workspace?.id ?? "", languageCode: "vi" },
        { enabled: Boolean(workspace?.id), refetchOnWindowFocus: false, staleTime: 30_000 },
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
        setExpandedItemId(nextWorkspace.items[0]?.id ?? null);
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

        const result = await saveMutation.mutateAsync({ workspaceId: workspace.id });
        setSaveMessage(`Saved ${result.savedLearnables.length} learnables.`);
        removeLocalStorageItem(`${REVIEW_DRAFT_PREFIX}${workspace.id}:v1`);
        removeLocalStorageItem(ANALYSIS_DRAFT_KEY);
        startTransition(() => {
            router.push(`/tools/vietnamese/sentences/${workspace.id}`);
        });
    }

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
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)]">
                <div className="flex items-baseline justify-between px-4 pt-4 pb-2 text-sm text-[color:var(--plearn-ink-3)]">
                    <span>English sentence</span>
                    <span className="text-[color:var(--plearn-ink-4)]">Cmd + Enter to analyze</span>
                </div>
                <div className="px-4 pb-4">
                    <textarea
                        className="text-foreground field-sizing-content min-h-36 w-full resize-y rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3 text-base transition-colors outline-none focus:border-white/18"
                        data-slot="textarea"
                        maxLength={500}
                        placeholder="What if I had never heard that? Wouldn't that be crazy?"
                        value={sourceText}
                        onChange={(event) => setSourceText(event.target.value)}
                        onKeyDown={(event) => {
                            if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === "Enter" &&
                                deferredText.trim() &&
                                !analyzeMutation.isPending
                            ) {
                                event.preventDefault();
                                void analyze();
                            }
                        }}
                    />
                </div>
                <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--plearn-bg-3)] px-3 py-3">
                    <span className="text-sm text-[color:var(--plearn-ink-4)]">{sourceText.length} / 500</span>
                    <div className="flex items-center gap-3">
                        {saveMessage ? <span className="text-success-foreground text-sm">{saveMessage}</span> : null}
                        {analyzeMutation.error ? (
                            <span className="text-destructive-foreground text-sm">{analyzeMutation.error.message}</span>
                        ) : null}
                        <Button
                            disabled={!deferredText.trim() || analyzeMutation.isPending}
                            onClick={analyze}
                            type="button"
                            variant="secondary"
                        >
                            {analyzeMutation.isPending ? "Analyzing..." : "Analyze →"}
                        </Button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {analyzeMutation.isPending ? <AnalysisProgress isActive={analyzeMutation.isPending} /> : null}
            </AnimatePresence>

            {workspace ? (
                <div className="space-y-8">
                    {sentenceData ? (
                        <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] px-6 py-6">
                            <div className="mb-4 flex flex-wrap gap-4 text-sm text-[color:var(--plearn-ink-4)]">
                                <span>Parsed</span>
                                <span className="text-[color:var(--plearn-green)]">Sentence · translated</span>
                                <span>Register · inferred</span>
                            </div>
                            <div className="space-y-3">
                                <AnnotatedSentence
                                    sentence={sentenceData.text}
                                    items={wordInfoItems}
                                    className="text-[1.95rem] leading-[1.35] font-[var(--font-display)] tracking-[-0.02em]"
                                />
                                <p className="text-sm text-[color:var(--plearn-ink-3)]">{sentenceData.meaning}</p>
                                <div className="border-t border-[color:var(--border)] pt-4">
                                    <ToneLegend />
                                </div>
                            </div>
                        </section>
                    ) : workspace.summary ? (
                        <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--plearn-bg-2)] p-6">
                            <p className="text-muted-foreground">{workspace.summary}</p>
                        </section>
                    ) : null}

                    {workspace.items.length > 0 ? (
                        <section className="space-y-4">
                            <div className="plearn-divider-heading">
                                <span className="name">Breakdown</span>
                                <span className="count">{workspace.items.length} elements · click to inspect</span>
                            </div>
                            <div className="grid gap-4">
                                {workspace.items.map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        expanded={expandedItemId === item.id}
                                        onToggle={() => setExpandedItemId((current) => (current === item.id ? null : item.id))}
                                        onUpdate={(patch) => updateItem(item.id, patch)}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <div className="flex justify-end">
                        <Button
                            disabled={updateMutation.isPending || saveMutation.isPending}
                            onClick={save}
                            type="button"
                            size="lg"
                            variant="secondary"
                        >
                            {saveMutation.isPending ? "Saving..." : "Save To Catalog"}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
