import { transitExtractionSchema } from "@/lib/transit/schemas";
import type { SanitizedTransitExtraction } from "@/lib/transit/types";
import "server-only";

const SENSITIVE_PATTERNS = [
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu,
    /(?:\+?81[-\s]?)?(?:0?\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4})/gu,
    /\b(?:\d[ -]?){12,19}\b/gu,
    /\b(?:reservation|booking|membership|member|credit card|ic card|qr)\s*(?:number|no\.?|id|code)?\s*[:：#]?\s*[A-Z0-9-]{5,}\b/giu,
] as const;

export function redactSensitiveText(value: string) {
    return SENSITIVE_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[redacted]"), value).trim();
}

function sanitizeUnknown(value: unknown): unknown {
    if (typeof value === "string") {
        return redactSensitiveText(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeUnknown(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeUnknown(item)]));
    }

    return value;
}

export function sanitizeTransitExtraction(value: unknown): SanitizedTransitExtraction {
    return transitExtractionSchema.parse(sanitizeUnknown(value)) as SanitizedTransitExtraction;
}

export function sanitizeUserText(value: string | null | undefined, maxLength: number) {
    if (!value) {
        return null;
    }

    const normalized = redactSensitiveText(value.replaceAll(/\s+/gu, " ").slice(0, maxLength));

    return normalized.length > 0 ? normalized : null;
}
