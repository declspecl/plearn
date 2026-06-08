import type { LearningLanguageCode } from "./language-config";
import type { LearnableType } from "./model";
import kuromoji from "kuromoji";
import { createRequire } from "node:module";
import path from "node:path";
import { toHiragana, toRomaji } from "wanakana";

export interface DisplayToken {
    readonly surface: string;
    readonly reading?: string;
    readonly baseForm?: string;
    readonly partOfSpeech?: string;
    readonly isWordLike: boolean;
}

export interface ProposalTextMetadata {
    readonly reading?: string;
    readonly baseForm?: string;
    readonly normalizedForm?: string;
    readonly romanization?: string;
    readonly languageMetadata?: Readonly<Record<string, unknown>>;
}

export interface LanguageTextProcessor {
    normalizeText(text: string): string;
    candidateLookupTexts(text: string): Promise<readonly string[]>;
    enrichProposalText(input: {
        readonly text: string;
        readonly type: LearnableType;
        readonly existingMetadata?: Readonly<Record<string, unknown>>;
    }): Promise<ProposalTextMetadata>;
    tokenizeForDisplay(text: string): Promise<readonly DisplayToken[]>;
}

function normalizeCommon(value: string): string {
    return value.normalize("NFKC").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function uniqueNonEmpty(values: readonly (string | undefined)[]): readonly string[] {
    return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

class WhitespaceTextProcessor implements LanguageTextProcessor {
    public normalizeText(text: string): string {
        return normalizeCommon(text);
    }

    public async candidateLookupTexts(text: string): Promise<readonly string[]> {
        const words = this.normalizeText(text).split(/\s+/).filter(Boolean);
        const subphrases: string[] = [];
        for (let start = 0; start < words.length; start += 1) {
            for (let len = 1; len <= words.length - start; len += 1) {
                subphrases.push(words.slice(start, start + len).join(" "));
            }
        }

        return uniqueNonEmpty(subphrases);
    }

    public async enrichProposalText(): Promise<ProposalTextMetadata> {
        return {};
    }

    public async tokenizeForDisplay(text: string): Promise<readonly DisplayToken[]> {
        return text.split(/(\s+)/).map((surface) => ({
            surface,
            isWordLike: surface.trim().length > 0,
        }));
    }
}

interface KuromojiToken {
    readonly surface_form: string;
    readonly pos?: string;
    readonly basic_form?: string;
    readonly reading?: string;
    readonly pronunciation?: string;
}

interface KuromojiTokenizer {
    tokenize(text: string): readonly KuromojiToken[];
}

let tokenizerPromise: Promise<KuromojiTokenizer | null> | undefined;

function kuromojiDictionaryPath() {
    const require = createRequire(import.meta.url);
    const packageManifest = require.resolve("kuromoji/package.json");

    return path.join(path.dirname(packageManifest), "dict");
}

async function getKuromojiTokenizer(): Promise<KuromojiTokenizer | null> {
    tokenizerPromise ??= new Promise((resolve) => {
        kuromoji.builder({ dicPath: kuromojiDictionaryPath() }).build((error, tokenizer) => {
            if (error) {
                console.warn("[learning][ja] kuromoji tokenizer unavailable; falling back to Intl.Segmenter", { error });
                resolve(null);
                return;
            }

            resolve(tokenizer as KuromojiTokenizer);
        });
    });

    return tokenizerPromise;
}

function katakanaReadingToHiragana(reading?: string): string | undefined {
    return reading ? toHiragana(reading) : undefined;
}

function tokenBaseForm(token: KuromojiToken): string | undefined {
    if (!token.basic_form || token.basic_form === "*") {
        return undefined;
    }

    return token.basic_form;
}

function tokenPartOfSpeech(token: KuromojiToken): string | undefined {
    return token.pos && token.pos !== "*" ? token.pos : undefined;
}

function tokenizeWithIntlSegmenter(text: string): readonly DisplayToken[] {
    const segmenter = new Intl.Segmenter("ja-JP", { granularity: "word" });

    return [...segmenter.segment(text)].map((segment) => ({
        surface: segment.segment,
        isWordLike: segment.isWordLike ?? false,
    }));
}

class JapaneseTextProcessor implements LanguageTextProcessor {
    public normalizeText(text: string): string {
        return normalizeCommon(text);
    }

    public async candidateLookupTexts(text: string): Promise<readonly string[]> {
        const tokens = await this.tokenizeForDisplay(text);
        const words = tokens.filter((token) => token.isWordLike);
        const candidates: (string | undefined)[] = [this.normalizeText(text)];

        for (const token of words) {
            candidates.push(token.surface, token.baseForm, token.reading, token.reading ? toRomaji(token.reading) : undefined);
        }

        for (let start = 0; start < words.length; start += 1) {
            for (let len = 2; len <= Math.min(4, words.length - start); len += 1) {
                candidates.push(
                    words
                        .slice(start, start + len)
                        .map((token) => token.surface)
                        .join(""),
                );
            }
        }

        return uniqueNonEmpty(candidates.map((candidate) => (candidate ? this.normalizeText(candidate) : undefined)));
    }

    public async enrichProposalText(input: {
        readonly text: string;
        readonly type: LearnableType;
        readonly existingMetadata?: Readonly<Record<string, unknown>>;
    }): Promise<ProposalTextMetadata> {
        if (input.type === "grammar_pattern" || input.type === "phrase") {
            return {};
        }

        const tokens = (await this.tokenizeForDisplay(input.text)).filter((token) => token.isWordLike);
        const firstToken = tokens[0];
        const reading = firstToken?.reading;
        const baseForm = firstToken?.baseForm;
        const partOfSpeech = firstToken?.partOfSpeech;
        const romanization = reading ? toRomaji(reading) : undefined;

        return {
            reading,
            baseForm,
            normalizedForm: this.normalizeText(baseForm ?? input.text),
            romanization,
            languageMetadata: {
                ...input.existingMetadata,
                ...(reading ? { reading } : {}),
                ...(baseForm ? { baseForm } : {}),
                ...(partOfSpeech ? { tokenizerPartOfSpeech: partOfSpeech } : {}),
                ...(romanization ? { romanization } : {}),
            },
        };
    }

    public async tokenizeForDisplay(text: string): Promise<readonly DisplayToken[]> {
        const tokenizer = await getKuromojiTokenizer();
        if (!tokenizer) {
            return tokenizeWithIntlSegmenter(text);
        }

        return tokenizer.tokenize(text).map((token) => {
            const reading = katakanaReadingToHiragana(token.reading ?? token.pronunciation);

            return {
                surface: token.surface_form,
                reading,
                baseForm: tokenBaseForm(token),
                partOfSpeech: tokenPartOfSpeech(token),
                isWordLike: true,
            };
        });
    }
}

const processors: Record<LearningLanguageCode, LanguageTextProcessor> = {
    vi: new WhitespaceTextProcessor(),
    ja: new JapaneseTextProcessor(),
};

export function getLanguageTextProcessor(languageCode: string): LanguageTextProcessor {
    return processors[languageCode as LearningLanguageCode] ?? processors.vi;
}

export function normalizeLearnableTextForLanguage(languageCode: string, value: string): string {
    return getLanguageTextProcessor(languageCode).normalizeText(value);
}

export function normalizeLearnableText(value: string): string {
    return normalizeLearnableTextForLanguage("vi", value);
}
