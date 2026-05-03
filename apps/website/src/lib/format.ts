// Small formatting helpers shared across Plearn UI surfaces.
// Keep these pure and presentational — not domain logic.

export function relativeTime(iso: string, now: Date = new Date()): string {
    const t = new Date(iso).getTime();
    const diffMs = now.getTime() - t;

    if (diffMs < 0) {
        return "just now";
    }

    const minutes = Math.round(diffMs / 60_000);

    if (minutes < 1) {
        return "just now";
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.round(hours / 24);

    if (days < 14) {
        return `${days}d ago`;
    }

    const weeks = Math.round(days / 7);

    return `${weeks}w ago`;
}

export function shortDate(iso: string): string {
    const d = new Date(iso);
    const month = d.toLocaleString("en-US", { month: "short" });

    return `${month} ${d.getDate()}`;
}

export function dayName(iso: string): string {
    return new Date(iso).toLocaleString("en-US", { weekday: "short" });
}

export function fullDate(iso: string): string {
    const d = new Date(iso);
    const month = d.toLocaleString("en-US", { month: "long" });

    return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

const COLOR_TOKEN: Record<string, string> = {
    teal: "var(--teal)",
    amber: "var(--amber)",
    green: "var(--green)",
    red: "var(--red)",
    violet: "var(--violet)",
    olive: "var(--olive)",
    paper: "var(--paper)",
    panel: "var(--panel)",
    ink: "var(--ink)",
};

export function colorToken(name: string): string {
    return COLOR_TOKEN[name] ?? "var(--cream)";
}

export function confidenceColor(c: "low" | "medium" | "high"): string {
    if (c === "high") {
        return "var(--green)";
    }

    if (c === "medium") {
        return "var(--amber)";
    }

    return "var(--muted-dark)";
}

export function directionColor(d: "up" | "down" | "flat"): string {
    if (d === "up") {
        return "var(--green)";
    }

    if (d === "down") {
        return "var(--red)";
    }

    return "var(--muted-dark)";
}

export function directionGlyph(d: "up" | "down" | "flat"): string {
    if (d === "up") {
        return "▲";
    }

    if (d === "down") {
        return "▼";
    }

    return "●";
}
