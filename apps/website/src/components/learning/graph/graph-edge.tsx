"use client";

import { GRAPH_TYPE_STYLES, RELATION_DASH_PATTERNS } from "./graph-constants";
import type { PositionedEdge } from "./graph-types";

function buildEdgePath(edge: PositionedEdge) {
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const curvature = Math.min(36, distance * 0.12);
    const controlX = (edge.source.x + edge.target.x) / 2 + normalX * curvature;
    const controlY = (edge.source.y + edge.target.y) / 2 + normalY * curvature;

    return `M ${edge.source.x} ${edge.source.y} Q ${controlX} ${controlY} ${edge.target.x} ${edge.target.y}`;
}

export function GraphEdge({
    defsPrefix,
    edge,
    dimmed,
    highlighted,
}: {
    readonly defsPrefix: string;
    readonly edge: PositionedEdge;
    readonly dimmed: boolean;
    readonly highlighted: boolean;
}) {
    const sourceColor = GRAPH_TYPE_STYLES[edge.source.type].solid;
    const targetColor = GRAPH_TYPE_STYLES[edge.target.type].solid;
    const gradientId = `${defsPrefix}-edge-${edge.id}`;

    return (
        <>
            <linearGradient
                id={gradientId}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                gradientUnits="userSpaceOnUse"
            >
                <stop offset="0%" stopColor={sourceColor} stopOpacity={0.2 + edge.confidence * 0.5} />
                <stop offset="100%" stopColor={targetColor} stopOpacity={0.22 + edge.confidence * 0.58} />
            </linearGradient>
            <path
                d={buildEdgePath(edge)}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeDasharray={RELATION_DASH_PATTERNS[edge.relationType]}
                strokeLinecap="round"
                strokeWidth={highlighted ? 2.8 : 1.8}
                style={{
                    opacity: dimmed ? 0.12 : highlighted ? 0.95 : 0.28 + edge.confidence * 0.36,
                    transition: "opacity 180ms ease, stroke-width 180ms ease",
                }}
            >
                <title>{`${edge.relationType.replaceAll("_", " ")} • ${Math.round(edge.confidence * 100)}% confidence`}</title>
            </path>
        </>
    );
}
