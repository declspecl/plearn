import type { LearnableType, RelatedLearnableType } from "@plearn/core/learning/model";

export interface GraphNode {
    readonly id: string;
    readonly type: LearnableType;
    readonly canonicalText: string;
    readonly translation: string;
    readonly occurrenceCount: number;
    readonly difficulty?: number;
}

export interface GraphEdge {
    readonly id: string;
    readonly fromId: string;
    readonly toId: string;
    readonly relationType: RelatedLearnableType;
    readonly confidence: number;
}

export interface GraphData {
    readonly nodes: readonly GraphNode[];
    readonly edges: readonly GraphEdge[];
}

export interface PositionedNode extends GraphNode {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly radius: number;
}

export interface PositionedEdge extends GraphEdge {
    readonly source: PositionedNode;
    readonly target: PositionedNode;
}

export interface GraphFlowNodeData {
    readonly node: PositionedNode;
    readonly index: number;
    readonly dimmed: boolean;
    readonly hovered: boolean;
    readonly highlighted: boolean;
    readonly selected: boolean;
    readonly onSelect: (node: PositionedNode) => void;
    readonly onHoverChange: (node: PositionedNode | null) => void;
}

export interface GraphFlowEdgeData {
    readonly sourceType: LearnableType;
    readonly targetType: LearnableType;
    readonly relationType: RelatedLearnableType;
    readonly confidence: number;
    readonly dimmed: boolean;
    readonly highlighted: boolean;
}
