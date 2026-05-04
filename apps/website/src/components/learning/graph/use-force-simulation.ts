"use client";

import { GRAPH_FORCE_CONFIG, getNodeDimensions, getTypeAnchor } from "./graph-constants";
import type { GraphData, PositionedEdge, PositionedNode } from "./graph-types";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { useMemo, useState } from "react";

interface SimNode extends PositionedNode {
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface SimLink {
    readonly id: string;
    readonly fromId: string;
    readonly toId: string;
    readonly relationType: PositionedEdge["relationType"];
    readonly confidence: number;
    source: string | SimNode;
    target: string | SimNode;
}

export function useForceSimulation(data: GraphData) {
    const [version, setVersion] = useState(0);

    const layout = useMemo(() => {
        if (data.nodes.length === 0) {
            return { nodes: [] as PositionedNode[], edges: [] as PositionedEdge[] };
        }

        const minOccurrenceCount = Math.min(...data.nodes.map((node) => node.occurrenceCount));
        const maxOccurrenceCount = Math.max(...data.nodes.map((node) => node.occurrenceCount));

        const nodes: SimNode[] = data.nodes.map((node, index) => {
            const anchor = getTypeAnchor(node.type);
            const angle = (index / Math.max(1, data.nodes.length)) * Math.PI * 2;
            const dimensions = getNodeDimensions(node.occurrenceCount, minOccurrenceCount, maxOccurrenceCount);

            return {
                ...node,
                ...dimensions,
                x: anchor.x + Math.cos(angle) * 72,
                y: anchor.y + Math.sin(angle) * 72,
            };
        });

        const links: SimLink[] = data.edges.map((edge) => ({
            id: edge.id,
            fromId: edge.fromId,
            toId: edge.toId,
            relationType: edge.relationType,
            confidence: edge.confidence,
            source: edge.fromId,
            target: edge.toId,
        }));

        const simulation = forceSimulation(nodes)
            .force(
                "link",
                forceLink<SimNode, SimLink>(links)
                    .id((node) => node.id)
                    .distance((link) => GRAPH_FORCE_CONFIG.linkDistance - link.confidence * 42)
                    .strength((link) => 0.18 + link.confidence * GRAPH_FORCE_CONFIG.linkStrengthMultiplier),
            )
            .force("charge", forceManyBody<SimNode>().strength(GRAPH_FORCE_CONFIG.chargeStrength))
            .force(
                "collide",
                forceCollide<SimNode>().radius((node) => node.radius + GRAPH_FORCE_CONFIG.collisionPadding),
            )
            .force("center", forceCenter(0, 0))
            .force("type-x", forceX<SimNode>((node) => getTypeAnchor(node.type).x).strength(GRAPH_FORCE_CONFIG.typeGravityStrength))
            .force("type-y", forceY<SimNode>((node) => getTypeAnchor(node.type).y).strength(GRAPH_FORCE_CONFIG.typeGravityStrength))
            .stop();

        simulation.tick(GRAPH_FORCE_CONFIG.simulationTicks);

        const nodeById = new Map(nodes.map((node) => [node.id, node as PositionedNode]));
        const positionedEdges: PositionedEdge[] = links
            .map((link) => {
                const sourceId = typeof link.source === "string" ? link.source : link.source.id;
                const targetId = typeof link.target === "string" ? link.target : link.target.id;
                const source = nodeById.get(sourceId);
                const target = nodeById.get(targetId);

                if (!source || !target) {
                    return null;
                }

                return {
                    id: link.id,
                    fromId: link.fromId,
                    toId: link.toId,
                    relationType: link.relationType,
                    confidence: link.confidence,
                    source,
                    target,
                } satisfies PositionedEdge;
            })
            .filter((edge): edge is PositionedEdge => edge !== null);

        return {
            nodes: nodes.map((node) => ({ ...node })),
            edges: positionedEdges,
        };
    }, [data, version]);

    return {
        ...layout,
        reheat() {
            setVersion((current) => current + 1);
        },
    };
}
