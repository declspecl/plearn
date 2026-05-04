"use client";

import { GRAPH_TYPE_STYLES } from "./graph-constants";
import { GraphEdge } from "./graph-edge";
import { GraphNode } from "./graph-node";
import type { PositionedEdge, PositionedNode } from "./graph-types";
import type { GraphViewportApi } from "./use-graph-viewport";
import { useId } from "react";

export function GraphCanvas({
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    hasSearchQuery,
    matchedNodeIds,
    connectedNodeIds,
    onSelectNode,
    onHoverNodeChange,
    viewport,
}: {
    readonly nodes: readonly PositionedNode[];
    readonly edges: readonly PositionedEdge[];
    readonly selectedNodeId?: string;
    readonly hoveredNodeId?: string;
    readonly hasSearchQuery: boolean;
    readonly matchedNodeIds: ReadonlySet<string>;
    readonly connectedNodeIds: ReadonlySet<string>;
    readonly onSelectNode: (node: PositionedNode) => void;
    readonly onHoverNodeChange: (node: PositionedNode | null) => void;
    readonly viewport: GraphViewportApi;
}) {
    const defsPrefix = useId().replaceAll(":", "-");

    return (
        <div className="relative min-h-[680px] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[linear-gradient(180deg,#fffef6_0%,#f8f5ea_48%,#f2efe4_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-[16%] top-[-14%] h-56 rounded-full bg-amber-300/30 blur-[120px]" />
                <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-blue-300/20 blur-[120px]" />
                <div className="absolute bottom-8 -left-16 h-72 w-72 rounded-full bg-emerald-300/18 blur-[120px]" />
            </div>
            <svg
                ref={viewport.svgRef}
                className="relative z-10 h-[680px] w-full touch-none"
                onPointerDown={viewport.onPointerDown}
                onPointerLeave={viewport.onPointerLeave}
                onPointerMove={viewport.onPointerMove}
                onPointerUp={viewport.onPointerUp}
                onWheel={viewport.onWheel}
            >
                <defs>
                    <pattern id={`${defsPrefix}-grid`} width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="1" />
                    </pattern>
                    {Object.entries(GRAPH_TYPE_STYLES).map(([type, style]) => (
                        <linearGradient key={type} id={`${defsPrefix}-node-${type}`} x1="0%" x2="100%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor={style.tint} />
                            <stop offset="100%" stopColor={style.solid} stopOpacity={0.82} />
                        </linearGradient>
                    ))}
                    {Object.entries(GRAPH_TYPE_STYLES).map(([type, style]) => (
                        <filter key={type} id={`${defsPrefix}-glow-${type}`} x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                            <feColorMatrix
                                in="blur"
                                result="tinted"
                                type="matrix"
                                values={`0 0 0 0 ${parseInt(style.solid.slice(1, 3), 16) / 255} 0 0 0 0 ${
                                    parseInt(style.solid.slice(3, 5), 16) / 255
                                } 0 0 0 0 ${parseInt(style.solid.slice(5, 7), 16) / 255} 0 0 0 0.55 0`}
                            />
                            <feMerge>
                                <feMergeNode in="tinted" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    ))}
                </defs>
                <rect fill={`url(#${defsPrefix}-grid)`} height="100%" width="100%" x="0" y="0" />
                <g transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}>
                    {edges.map((edge) => {
                        const isConnected =
                            selectedNodeId !== undefined && (edge.fromId === selectedNodeId || edge.toId === selectedNodeId);
                        const dimmed =
                            (selectedNodeId !== undefined && !isConnected) ||
                            (hasSearchQuery && !matchedNodeIds.has(edge.fromId) && !matchedNodeIds.has(edge.toId));

                        return (
                            <GraphEdge
                                key={edge.id}
                                defsPrefix={defsPrefix}
                                dimmed={dimmed}
                                edge={edge}
                                highlighted={Boolean(isConnected)}
                            />
                        );
                    })}
                    {nodes.map((node, index) => {
                        const matchesSearch = !hasSearchQuery || matchedNodeIds.has(node.id);
                        const isConnected = connectedNodeIds.size === 0 || connectedNodeIds.has(node.id) || node.id === selectedNodeId;
                        const dimmed = !matchesSearch || !isConnected;

                        return (
                            <GraphNode
                                key={node.id}
                                defsPrefix={defsPrefix}
                                dimmed={dimmed}
                                highlighted={isConnected}
                                hovered={hoveredNodeId === node.id}
                                index={index}
                                node={node}
                                onHoverChange={onHoverNodeChange}
                                onSelect={onSelectNode}
                                selected={selectedNodeId === node.id}
                            />
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
