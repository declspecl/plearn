import { type CxOptions, cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: CxOptions) {
    return twMerge(cx(inputs));
}

// Type-narrowing predicate: works around `.filter(Boolean)` losing the
// non-null type. Use as `arr.filter(present)` to drop `undefined | null`.
export function present<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
