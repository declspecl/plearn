"use client";

import { GRAPH_TYPE_STYLES, RELATION_DASH_PATTERNS } from "./graph-constants";
import type { GraphFlowEdgeData } from "./graph-types";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";

export function GraphEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<GraphFlowEdgeData>) {
    if (!data) {
        return null;
    }

    const sourceColor = GRAPH_TYPE_STYLES[data.sourceType].solid;
    const targetColor = GRAPH_TYPE_STYLES[data.targetType].solid;
    const gradientId = `graph-edge-${id}`;
    const [path] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        curvature: 0.28,
    });

    return (
        <>
            <linearGradient id={gradientId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={sourceColor} stopOpacity={0.2 + data.confidence * 0.5} />
                <stop offset="100%" stopColor={targetColor} stopOpacity={0.22 + data.confidence * 0.58} />
            </linearGradient>
            <BaseEdge
                path={path}
                style={{
                    opacity: data.dimmed ? 0.12 : data.highlighted ? 0.95 : 0.28 + data.confidence * 0.36,
                    stroke: `url(#${gradientId})`,
                    strokeDasharray: RELATION_DASH_PATTERNS[data.relationType],
                    strokeLinecap: "round",
                    strokeWidth: data.highlighted ? 2.8 : 1.8,
                    transition: "opacity 180ms ease, stroke-width 180ms ease",
                }}
            />
            <path d={path} fill="none" stroke="transparent" strokeWidth={12}>
                <title>{`${data.relationType.replaceAll("_", " ")} • ${Math.round(data.confidence * 100)}% confidence`}</title>
            </path>
        </>
    );
}
