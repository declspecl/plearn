export interface CardPromptOption {
    readonly label: string;
    readonly text: string;
}

export interface CardPromptMetadata {
    readonly context?: string;
    readonly stimulus?: string;
    readonly stimulusLabel?: string;
    readonly hint?: string;
    readonly options?: readonly CardPromptOption[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
}

function readOptions(value: unknown): readonly CardPromptOption[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const options = value.flatMap((option, index) => {
        if (typeof option === "string" && option.trim()) {
            return [{ label: String.fromCharCode(65 + index), text: option }];
        }

        if (!isRecord(option)) return [];
        const text = readString(option.text);
        if (!text) return [];

        return [
            {
                label: readString(option.label) ?? String.fromCharCode(65 + index),
                text,
            },
        ];
    });

    return options.length > 0 ? options : undefined;
}

export function parseCardPromptMetadata(value: Record<string, unknown> | undefined): CardPromptMetadata {
    if (!value) return {};

    return {
        context: readString(value.context),
        stimulus: readString(value.stimulus),
        stimulusLabel: readString(value.stimulusLabel),
        hint: readString(value.hint),
        options: readOptions(value.options),
    };
}
