"use client";

import { GraphEdge } from "./graph-edge";
import { GraphNode } from "./graph-node";
import type { GraphFlowEdgeData, GraphFlowNodeData, PositionedEdge, PositionedNode } from "./graph-types";
import { useMemo } from "react";
import ReactFlow, { Background, type Edge, type Node, type ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

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
    onDeselect,
    onInit,
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
    readonly onDeselect: () => void;
    readonly onInit: (instance: ReactFlowInstance) => void;
}) {
    const nodeTypes = useMemo(() => ({ learnable: GraphNode }), []);
    const edgeTypes = useMemo(() => ({ learnable: GraphEdge }), []);
    const flowNodes = useMemo<Node<GraphFlowNodeData>[]>(
        () =>
            nodes.map((node, index) => {
                const matchesSearch = !hasSearchQuery || matchedNodeIds.has(node.id);
                const isConnected = connectedNodeIds.size === 0 || connectedNodeIds.has(node.id) || node.id === selectedNodeId;

                return {
                    id: node.id,
                    type: "learnable",
                    draggable: false,
                    position: {
                        x: node.x - node.width / 2,
                        y: node.y - node.height / 2,
                    },
                    selectable: true,
                    data: {
                        node,
                        index,
                        dimmed: !matchesSearch || !isConnected,
                        highlighted: isConnected,
                        hovered: hoveredNodeId === node.id,
                        selected: selectedNodeId === node.id,
                        onSelect: onSelectNode,
                        onHoverChange: onHoverNodeChange,
                    },
                } satisfies Node<GraphFlowNodeData>;
            }),
        [connectedNodeIds, hasSearchQuery, hoveredNodeId, matchedNodeIds, nodes, onHoverNodeChange, onSelectNode, selectedNodeId],
    );
    const flowEdges = useMemo<Edge<GraphFlowEdgeData>[]>(
        () =>
            edges.map((edge) => {
                const isConnected = selectedNodeId !== undefined && (edge.fromId === selectedNodeId || edge.toId === selectedNodeId);
                const dimmed =
                    (selectedNodeId !== undefined && !isConnected) ||
                    (hasSearchQuery && !matchedNodeIds.has(edge.fromId) && !matchedNodeIds.has(edge.toId));

                return {
                    id: edge.id,
                    source: edge.fromId,
                    target: edge.toId,
                    type: "learnable",
                    data: {
                        sourceType: edge.source.type,
                        targetType: edge.target.type,
                        relationType: edge.relationType,
                        confidence: edge.confidence,
                        dimmed,
                        highlighted: Boolean(isConnected),
                    },
                } satisfies Edge<GraphFlowEdgeData>;
            }),
        [edges, hasSearchQuery, matchedNodeIds, selectedNodeId],
    );

    return (
        <div className="relative min-h-[680px] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[linear-gradient(180deg,#fffef6_0%,#f8f5ea_48%,#f2efe4_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-[16%] top-[-14%] h-56 rounded-full bg-amber-300/30 blur-[120px]" />
                <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-blue-300/20 blur-[120px]" />
                <div className="absolute bottom-8 -left-16 h-72 w-72 rounded-full bg-emerald-300/18 blur-[120px]" />
            </div>
            <div className="relative z-10 h-[680px] w-full">
                <ReactFlow
                    className="[&_.react-flow__attribution]:hidden [&_.react-flow__edge-path]:transition-all [&_.react-flow__node]:border-0 [&_.react-flow__node]:bg-transparent [&_.react-flow__node]:p-0 [&_.react-flow__node]:shadow-none"
                    defaultEdgeOptions={{ zIndex: 0 }}
                    edgeTypes={edgeTypes}
                    edges={flowEdges}
                    fitView={false}
                    maxZoom={3}
                    minZoom={0.3}
                    nodeTypes={nodeTypes}
                    nodes={flowNodes}
                    nodesConnectable={false}
                    nodesDraggable={false}
                    onInit={onInit}
                    onPaneClick={onDeselect}
                    panOnDrag
                    proOptions={{ hideAttribution: true }}
                    selectionOnDrag={false}
                    zoomOnDoubleClick={false}
                >
                    <Background color="rgba(15,23,42,0.08)" gap={48} />
                </ReactFlow>
            </div>
        </div>
    );
}
