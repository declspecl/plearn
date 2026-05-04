import type { LearnableType, RelatedLearnableType } from "@plearn/core/learning/model";

export const GRAPH_TYPE_STYLES: Record<
    LearnableType,
    {
        readonly label: string;
        readonly solid: string;
        readonly tint: string;
        readonly glow: string;
        readonly accentClassName: string;
    }
> = {
    vocabulary: {
        label: "Vocabulary",
        solid: "#3b82f6",
        tint: "#dbeafe",
        glow: "rgba(59, 130, 246, 0.38)",
        accentClassName: "text-blue-600",
    },
    grammar_pattern: {
        label: "Grammar",
        solid: "#10b981",
        tint: "#d1fae5",
        glow: "rgba(16, 185, 129, 0.36)",
        accentClassName: "text-emerald-600",
    },
    phrase: {
        label: "Phrase",
        solid: "#a855f7",
        tint: "#f3e8ff",
        glow: "rgba(168, 85, 247, 0.34)",
        accentClassName: "text-purple-600",
    },
    utility_word: {
        label: "Utility",
        solid: "#f59e0b",
        tint: "#fef3c7",
        glow: "rgba(245, 158, 11, 0.36)",
        accentClassName: "text-amber-600",
    },
};

export const RELATION_DASH_PATTERNS: Record<RelatedLearnableType, string | undefined> = {
    same_pattern_family: undefined,
    similar_meaning: "4 4",
    often_confused: "2 5",
    related_phrase: "10 5 2 5",
};

export const GRAPH_FORCE_CONFIG = {
    centerStrength: 0.09,
    chargeStrength: -220,
    collisionPadding: 18,
    linkDistance: 150,
    linkStrengthMultiplier: 0.55,
    simulationTicks: 300,
    typeGravityStrength: 0.065,
} as const;

export const GRAPH_NODE_SIZE = {
    minHeight: 54,
    minWidth: 94,
    maxWidth: 164,
} as const;

const TYPE_ANCHOR_BY_TYPE: Record<LearnableType, { readonly x: number; readonly y: number }> = {
    vocabulary: { x: -220, y: -110 },
    grammar_pattern: { x: 220, y: -120 },
    phrase: { x: 180, y: 150 },
    utility_word: { x: -180, y: 170 },
};

export function getTypeAnchor(type: LearnableType) {
    return TYPE_ANCHOR_BY_TYPE[type];
}

export function clampZoom(zoom: number) {
    return Math.max(0.3, Math.min(3, zoom));
}

export function getNodeDimensions(occurrenceCount: number, minOccurrenceCount: number, maxOccurrenceCount: number) {
    const span = Math.max(1, maxOccurrenceCount - minOccurrenceCount);
    const ratio = (occurrenceCount - minOccurrenceCount) / span;
    const width = GRAPH_NODE_SIZE.minWidth + ratio * (GRAPH_NODE_SIZE.maxWidth - GRAPH_NODE_SIZE.minWidth);
    const height = GRAPH_NODE_SIZE.minHeight + Math.min(10, ratio * 10);

    return {
        width,
        height,
        radius: Math.max(width, height) / 2,
    };
}

export function truncateLabel(value: string, maxLength: number) {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
