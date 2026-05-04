"use client";

import { GRAPH_TYPE_STYLES, truncateLabel } from "./graph-constants";
import type { GraphFlowNodeData } from "./graph-types";
import { motion } from "motion/react";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export const GraphNode = memo(function GraphNode({ data }: NodeProps<GraphFlowNodeData>) {
    const { node, index, dimmed, hovered, highlighted, selected, onSelect, onHoverChange } = data;
    const style = GRAPH_TYPE_STYLES[node.type];
    const ringShadow = selected ? `0 0 0 1.5px ${style.solid}` : `0 0 0 1px ${highlighted ? `${style.solid}cc` : "rgba(15, 23, 42, 0.12)"}`;
    const glowShadow = hovered || selected ? `0 18px 42px ${style.glow}` : "0 12px 28px rgba(15, 23, 42, 0.10)";

    return (
        <motion.div
            animate={{ opacity: dimmed ? 0.24 : 1, scale: selected ? 1.03 : hovered ? 1.02 : 1 }}
            className="group relative cursor-pointer outline-none"
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
            tabIndex={0}
            transition={{ delay: Math.min(index * 0.014, 0.24), duration: 0.36, ease: "easeOut" }}
            style={{ width: node.width, height: node.height }}
        >
            <Handle className="pointer-events-none opacity-0" position={Position.Top} type="target" />
            <Handle className="pointer-events-none opacity-0" position={Position.Bottom} type="source" />
            {selected ? (
                <motion.div
                    animate={{ opacity: [0.22, 0.55, 0.22], scale: [0.94, 1.05, 0.94] }}
                    className="pointer-events-none absolute inset-[-10px] rounded-[24px]"
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ boxShadow: `0 0 0 1.6px ${style.solid}` }}
                />
            ) : null}
            <div
                className="absolute inset-0 rounded-[18px]"
                style={{
                    background: `linear-gradient(135deg, ${style.tint} 0%, ${style.solid}d1 100%)`,
                    boxShadow: `${ringShadow}, ${glowShadow}`,
                }}
            />
            <div className="absolute inset-[6px] rounded-[14px] bg-white/15" />
            <div className="relative flex h-full flex-col items-center justify-center px-3 text-center">
                <p className="text-[14px] font-[650] tracking-[-0.02em] text-slate-950" style={{ fontFamily: "var(--font-display)" }}>
                    {truncateLabel(node.canonicalText, node.width > 132 ? 18 : 12)}
                </p>
                <p className="mt-1 text-[10.5px] text-slate-700" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {truncateLabel(node.translation, node.width > 132 ? 22 : 15)}
                </p>
            </div>
        </motion.div>
    );
});
