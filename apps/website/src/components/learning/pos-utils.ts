/**
 * Maps kuromoji top-level parts of speech (Japanese labels) onto a small set of
 * color-coded categories used to highlight Japanese sentences by grammatical role.
 */
export type PosCategory =
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "particle"
    | "auxiliary"
    | "conjunction"
    | "interjection"
    | "adnominal"
    | "prefix"
    | "other";

export const POS_CLASS: Record<PosCategory, string> = {
    noun: "text-pos-noun",
    verb: "text-pos-verb",
    adjective: "text-pos-adjective",
    adverb: "text-pos-adverb",
    particle: "text-pos-particle",
    auxiliary: "text-pos-auxiliary",
    conjunction: "text-pos-conjunction",
    interjection: "text-pos-interjection",
    adnominal: "text-pos-adnominal",
    prefix: "text-pos-prefix",
    other: "text-pos-other",
};

export const POS_LABEL: Record<PosCategory, string> = {
    noun: "noun",
    verb: "verb",
    adjective: "adjective",
    adverb: "adverb",
    particle: "particle",
    auxiliary: "auxiliary",
    conjunction: "conjunction",
    interjection: "interjection",
    adnominal: "adnominal",
    prefix: "prefix",
    other: "other",
};

/** Kuromoji emits the top-level POS as the first comma/segment of `pos`; we key on that. */
const POS_BY_JA: Readonly<Record<string, PosCategory>> = {
    名詞: "noun",
    代名詞: "noun",
    動詞: "verb",
    形容詞: "adjective",
    形状詞: "adjective",
    形容動詞: "adjective",
    副詞: "adverb",
    助詞: "particle",
    助動詞: "auxiliary",
    接続詞: "conjunction",
    接続助詞: "conjunction",
    感動詞: "interjection",
    連体詞: "adnominal",
    接頭詞: "prefix",
    接頭辞: "prefix",
    フィラー: "other",
    記号: "other",
    補助記号: "other",
    その他: "other",
};

export function posCategory(partOfSpeech?: string): PosCategory {
    if (!partOfSpeech) return "other";
    const top = partOfSpeech.split(/[,、]/)[0]?.trim() ?? "";

    return POS_BY_JA[top] ?? "other";
}

export function posClassName(partOfSpeech?: string): string {
    return POS_CLASS[posCategory(partOfSpeech)];
}

/** Categories worth surfacing in the legend, in reading-friendly order. */
export const POS_LEGEND_ORDER: readonly PosCategory[] = ["noun", "verb", "adjective", "adverb", "particle", "auxiliary", "conjunction"];
