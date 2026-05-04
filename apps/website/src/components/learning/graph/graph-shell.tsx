"use client";

import { GraphCanvas } from "./graph-canvas";
import { GraphControls } from "./graph-controls";
import { GraphLegend } from "./graph-legend";
import { GraphSidebar } from "./graph-sidebar";
import type { GraphData, GraphNode, PositionedNode } from "./graph-types";
import { useForceSimulation } from "./use-force-simulation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ReactFlowInstance } from "reactflow";

export function GraphShell({ data }: { readonly data: GraphData }) {
    const [selectedNodeId, setSelectedNodeId] = useState<string>();
    const [hoveredNodeId, setHoveredNodeId] = useState<string>();
    const [searchText, setSearchText] = useState("");
    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [activeTypes, setActiveTypes] = useState<Set<GraphNode["type"]>>(
        () => new Set(["vocabulary", "grammar_pattern", "phrase", "utility_word"]),
    );
    const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());

    const filteredData = useMemo<GraphData>(() => {
        const visibleNodes = data.nodes.filter((node) => activeTypes.has(node.type));
        const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

        return {
            nodes: visibleNodes,
            edges: data.edges.filter((edge) => visibleNodeIds.has(edge.fromId) && visibleNodeIds.has(edge.toId)),
        };
    }, [activeTypes, data.edges, data.nodes]);

    const layout = useForceSimulation(filteredData);
    const layoutSignatureRef = useRef("");

    useEffect(() => {
        const signature = `${filteredData.nodes.length}:${filteredData.edges.length}`;

        if (layoutSignatureRef.current !== signature && flowInstance) {
            layoutSignatureRef.current = signature;
            requestAnimationFrame(() => {
                flowInstance.fitView({ duration: 360, padding: 0.18 });
            });
        }
    }, [filteredData.edges.length, filteredData.nodes.length, flowInstance]);

    useEffect(() => {
        if (selectedNodeId && !layout.nodes.some((node) => node.id === selectedNodeId)) {
            setSelectedNodeId(undefined);
        }
    }, [layout.nodes, selectedNodeId]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedNodeId(undefined);
            }
        };

        globalThis.addEventListener("keydown", onKeyDown);

        return () => globalThis.removeEventListener("keydown", onKeyDown);
    }, []);

    const matchedNodeIds = useMemo(() => {
        if (!deferredSearch) {
            return new Set<string>();
        }

        return new Set(
            layout.nodes
                .filter(
                    (node) =>
                        node.canonicalText.toLowerCase().includes(deferredSearch) ||
                        node.translation.toLowerCase().includes(deferredSearch),
                )
                .map((node) => node.id),
        );
    }, [deferredSearch, layout.nodes]);
    const hasSearchQuery = deferredSearch.length > 0;

    const connectedNodeIds = useMemo(() => {
        if (!selectedNodeId) {
            return new Set<string>();
        }

        return new Set([
            ...layout.edges.flatMap((edge) =>
                edge.fromId === selectedNodeId ? [edge.toId] : edge.toId === selectedNodeId ? [edge.fromId] : [],
            ),
            selectedNodeId,
        ]);
    }, [layout.edges, selectedNodeId]);

    const selectedNode = useMemo(() => layout.nodes.find((node) => node.id === selectedNodeId), [layout.nodes, selectedNodeId]);

    const handleSelectNode = (node: PositionedNode) => {
        setSelectedNodeId(node.id);
        flowInstance?.setCenter(node.x, node.y, { duration: 360, zoom: Math.max(flowInstance.getZoom(), 1.26) });
    };

    const handleToggleType = (type: GraphNode["type"]) => {
        startTransition(() => {
            setActiveTypes((current) => {
                const next = new Set(current);

                if (next.has(type) && next.size > 1) {
                    next.delete(type);
                } else {
                    next.add(type);
                }

                return next;
            });
        });
    };

    const visibleEdgeCount = layout.edges.length;

    if (data.nodes.length === 0) {
        return (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-[#fbf8ef] px-8 py-20 text-center">
                <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em] text-slate-900">No learnables yet</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    Save a few Vietnamese words, phrases, or grammar patterns and the relationship map will appear here.
                </p>
            </div>
        );
    }

    if (filteredData.nodes.length === 0) {
        return (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-[#fbf8ef] px-8 py-20 text-center">
                <p className="text-3xl font-[var(--font-display)] tracking-[-0.04em] text-slate-900">
                    No nodes match the current type filters
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Re-enable one of the learnable types to rebuild the map.</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <GraphControls
                activeTypes={activeTypes}
                counts={{ nodes: layout.nodes.length, edges: visibleEdgeCount }}
                onFitAll={() => flowInstance?.fitView({ duration: 360, padding: 0.18 })}
                onSearchChange={setSearchText}
                onToggleType={handleToggleType}
                onZoomIn={() => flowInstance?.zoomIn({ duration: 180 })}
                onZoomOut={() => flowInstance?.zoomOut({ duration: 180 })}
                searchText={searchText}
            />
            <GraphCanvas
                connectedNodeIds={connectedNodeIds}
                edges={layout.edges}
                hasSearchQuery={hasSearchQuery}
                hoveredNodeId={hoveredNodeId}
                matchedNodeIds={matchedNodeIds}
                nodes={layout.nodes}
                onDeselect={() => setSelectedNodeId(undefined)}
                onHoverNodeChange={(node) => setHoveredNodeId(node?.id)}
                onInit={setFlowInstance}
                onSelectNode={handleSelectNode}
                selectedNodeId={selectedNodeId}
            />
            <GraphLegend />
            <GraphSidebar
                node={selectedNode}
                onClose={() => setSelectedNodeId(undefined)}
                onExploreNeighbors={(nodeId) => {
                    const node = layout.nodes.find((entry) => entry.id === nodeId);

                    if (node) {
                        handleSelectNode(node);
                    }
                }}
            />
        </div>
    );
}
