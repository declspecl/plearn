"use client";

import { GRAPH_TYPE_STYLES, truncateLabel } from "./graph-constants";
import type { PositionedNode } from "./graph-types";
import { motion } from "motion/react";

export function GraphNode({
    defsPrefix,
    node,
    index,
    dimmed,
    hovered,
    highlighted,
    selected,
    onSelect,
    onHoverChange,
}: {
    readonly defsPrefix: string;
    readonly node: PositionedNode;
    readonly index: number;
    readonly dimmed: boolean;
    readonly hovered: boolean;
    readonly highlighted: boolean;
    readonly selected: boolean;
    readonly onSelect: (node: PositionedNode) => void;
    readonly onHoverChange: (node: PositionedNode | null) => void;
}) {
    const style = GRAPH_TYPE_STYLES[node.type];
    const gradientId = `${defsPrefix}-node-${node.type}`;
    const glowId = `${defsPrefix}-glow-${node.type}`;
    const ringRadius = Math.max(node.width, node.height) * 0.62;

    return (
        <motion.g
            animate={{ opacity: dimmed ? 0.24 : 1, scale: selected ? 1.03 : hovered ? 1.02 : 1 }}
            initial={{ opacity: 0, scale: 0.84 }}
            onBlur={() => onHoverChange(null)}
            onClick={() => onSelect(node)}
            onFocus={() => onHoverChange(node)}
            onHoverEnd={() => onHoverChange(null)}
            onHoverStart={() => onHoverChange(node)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(node);
                }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            tabIndex={0}
            transition={{ delay: Math.min(index * 0.014, 0.24), duration: 0.36, ease: "easeOut" }}
            transform={`translate(${node.x}, ${node.y})`}
        >
            {selected ? (
                <motion.circle
                    animate={{ opacity: [0.22, 0.55, 0.22], scale: [0.94, 1.05, 0.94] }}
                    cx={0}
                    cy={0}
                    fill="none"
                    r={ringRadius}
                    stroke={style.solid}
                    strokeWidth={1.6}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
            ) : null}
            <rect
                fill={`url(#${gradientId})`}
                filter={hovered || selected ? `url(#${glowId})` : undefined}
                height={node.height}
                rx={18}
                stroke={selected ? style.solid : highlighted ? `${style.solid}cc` : "rgba(15, 23, 42, 0.12)"}
                strokeWidth={selected ? 2 : 1.1}
                width={node.width}
                x={-node.width / 2}
                y={-node.height / 2}
            />
            <rect
                fill="rgba(255,255,255,0.12)"
                height={node.height - 12}
                rx={14}
                width={node.width - 12}
                x={-node.width / 2 + 6}
                y={-node.height / 2 + 6}
            />
            <text fill="#0f172a" fontFamily="var(--font-display)" fontSize={selected ? 15 : 14} fontWeight={650} textAnchor="middle" y={-2}>
                {truncateLabel(node.canonicalText, node.width > 132 ? 18 : 12)}
            </text>
            <text fill="#334155" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10.5} textAnchor="middle" y={16}>
                {truncateLabel(node.translation, node.width > 132 ? 22 : 15)}
            </text>
        </motion.g>
    );
}
