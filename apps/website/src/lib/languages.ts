// Central registry for the languages Plearn supports.
//
// This is the single source of truth that the sidebar nav, the shared language
// hub, and the mobile nav all read from. Keep it pure data (no React/icons) so
// it can be imported into both server and client components. Adding a language
// should be one entry here, not edits across six files.

export type LanguageCode = "vi" | "ja";

export interface ToolDef {
    readonly label: string;
    /** Path segment under `/tools/{slug}`. Empty string is the hub root. */
    readonly segment: string;
}

export const TOOLS = {
    hub: { label: "Hub", segment: "" },
    review: { label: "Review", segment: "review" },
    practice: { label: "Practice", segment: "practice" },
    analyze: { label: "Analyze", segment: "analyze" },
    explain: { label: "Explain", segment: "explain" },
    chat: { label: "Chat", segment: "chat" },
    catalog: { label: "Catalog", segment: "catalog" },
    history: { label: "History", segment: "sentences" },
    insights: { label: "Insights", segment: "insights" },
} as const satisfies Record<string, ToolDef>;

export type ToolKey = keyof typeof TOOLS;

export interface LanguageConfig {
    readonly code: LanguageCode;
    readonly slug: string;
    readonly label: string;
    /** Country-flag emoji shown in pickers for quick identification. */
    readonly flag: string;
    /** Tool keys this language exposes, in sidebar order. */
    readonly tools: readonly ToolKey[];
    readonly hub: {
        /** Hero copy shown before the user has decomposed anything. */
        readonly emptyHero: string;
        /** Blurb for the analysis banner CTA. */
        readonly analyzeBlurb: string;
        /** Whether hub source text needs furigana/reading annotation. */
        readonly annotateSourceText: boolean;
    };
}

export const LANGUAGES = [
    {
        code: "vi",
        slug: "vietnamese",
        label: "Vietnamese",
        flag: "🇻🇳",
        tools: ["hub", "review", "practice", "analyze", "explain", "chat", "catalog", "history", "insights"],
        hub: {
            emptyHero: "Your latest sentence will live here once you decompose it.",
            analyzeBlurb: "Capture a thought, translate it into Vietnamese, and decide what deserves a place in your long-term catalog.",
            annotateSourceText: false,
        },
    },
    {
        code: "ja",
        slug: "japanese",
        label: "Japanese",
        flag: "🇯🇵",
        tools: ["hub", "review", "practice", "analyze", "explain", "chat", "catalog", "history"],
        hub: {
            emptyHero: "Your latest Japanese sentence will live here once you decompose it.",
            analyzeBlurb: "Capture a thought, translate it into Japanese, and decide what deserves a place in your long-term catalog.",
            annotateSourceText: true,
        },
    },
] as const satisfies readonly LanguageConfig[];

export const DEFAULT_LANGUAGE = LANGUAGES[0];

export function languageBySlug(slug: string | null | undefined): LanguageConfig | undefined {
    return LANGUAGES.find((language) => language.slug === slug);
}

export function languageByCode(code: string | null | undefined): LanguageConfig | undefined {
    return LANGUAGES.find((language) => language.code === code);
}

/** Resolve the active language from an app pathname, if any. */
export function languageFromPathname(pathname: string): LanguageConfig | undefined {
    const match = /^\/tools\/([^/]+)/.exec(pathname);

    return match ? languageBySlug(match[1]) : undefined;
}

export function toolHref(slug: string, segment: string): string {
    return segment ? `/tools/${slug}/${segment}` : `/tools/${slug}`;
}

/** The path segment after `/tools/{slug}`, or "" for the hub root. */
export function toolSegmentFromPathname(pathname: string): string {
    const match = /^\/tools\/[^/]+\/?(.*)$/.exec(pathname);

    return match ? (match[1]?.split("/")[0] ?? "") : "";
}
