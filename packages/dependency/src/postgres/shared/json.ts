export function removeUndefinedValues(values: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function asOptionalBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

export function asOptionalNumber(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
}

export function asOptionalString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}
