export const learningLanguageCodes = ["vi", "ja"] as const;
export type LearningLanguageCode = (typeof learningLanguageCodes)[number];

export interface LearningLanguageConfig {
    readonly code: LearningLanguageCode;
    readonly slug: "vietnamese" | "japanese";
    readonly name: string;
    readonly nativeName: string;
    readonly analyzeTitle: string;
    readonly explainTitle: string;
    readonly inputLabel: string;
    readonly inputPlaceholder: string;
    readonly features: {
        readonly tones: boolean;
        readonly ruby: boolean;
        readonly tokenizer: "whitespace" | "japanese";
    };
}

export const learningLanguageConfigs = [
    {
        code: "vi",
        slug: "vietnamese",
        name: "Vietnamese",
        nativeName: "Tiếng Việt",
        analyzeTitle: "Sentence Decomposition",
        explainTitle: "Explain Vietnamese",
        inputLabel: "Vietnamese sentence",
        inputPlaceholder: "Em ơi, anh muốn ăn phở bò tái nạm...",
        features: {
            tones: true,
            ruby: false,
            tokenizer: "whitespace",
        },
    },
    {
        code: "ja",
        slug: "japanese",
        name: "Japanese",
        nativeName: "日本語",
        analyzeTitle: "Japanese Decomposition",
        explainTitle: "Explain Japanese",
        inputLabel: "Japanese sentence",
        inputPlaceholder: "昨日、駅前で友達とラーメンを食べました。",
        features: {
            tones: false,
            ruby: true,
            tokenizer: "japanese",
        },
    },
] as const satisfies readonly LearningLanguageConfig[];

export function getLearningLanguageConfigByCode(code: string): LearningLanguageConfig | undefined {
    return learningLanguageConfigs.find((config) => config.code === code);
}

export function getLearningLanguageConfigBySlug(slug: string): LearningLanguageConfig | undefined {
    return learningLanguageConfigs.find((config) => config.slug === slug);
}

export function requireLearningLanguageConfigByCode(code: string): LearningLanguageConfig {
    const config = getLearningLanguageConfigByCode(code);
    if (!config) {
        throw new Error(`Unsupported learning language code: ${code}`);
    }

    return config;
}

export function requireLearningLanguageConfigBySlug(slug: string): LearningLanguageConfig {
    const config = getLearningLanguageConfigBySlug(slug);
    if (!config) {
        throw new Error(`Unsupported learning language slug: ${slug}`);
    }

    return config;
}
