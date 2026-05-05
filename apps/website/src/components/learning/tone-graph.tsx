"use strict";
"use client";

import { getWordTone, type VietnameseTone } from "@plearn/core/vietnamese/tone-parser";
import { motion } from "motion/react";
import { Fragment, useMemo } from "react";
import { cn } from "~/lib/utils";

export interface ToneGraphProps {
    readonly text: string;
    readonly className?: string;
    readonly height?: number | string;
    readonly widthPerSyllable?: number;
}

// Safari ignores CSS variables inside SVG gradient stops, so we use explicit hex colors
// mapped to the same values defined in globals.css
const TONE_HEX_COLORS: Record<VietnameseTone, string> = {
    1: "#9ca3af",
    2: "#3b82f6",
    3: "#22c55e",
    4: "#f97316",
    5: "#a855f7",
    6: "#ef4444",
};

function buildUnifiedPath(syllables: string[]) {
    let d = "";
    let currentY = 0;

    syllables.forEach((syllable, i) => {
        const tone = getWordTone(syllable);
        const x = i * 100;

        let startY = 0;
        let endY = 0;
        let shape = "";

        switch (tone) {
            case 1:
                startY = 25;
                endY = 25;
                shape = `C ${x + 40},25 ${x + 70},25 ${x + 100},25`;
                break;
            case 2:
                startY = 65;
                endY = 15;
                shape = `C ${x + 50},65 ${x + 70},15 ${x + 100},15`;
                break;
            case 3:
                startY = 45;
                endY = 75;
                shape = `C ${x + 50},45 ${x + 70},75 ${x + 100},75`;
                break;
            case 4:
            case 5:
                startY = 40;
                endY = 35;
                shape = `C ${x + 35},40 ${x + 50},95 ${x + 65},95 C ${x + 80},95 ${x + 90},35 ${x + 100},35`;
                break;
            case 6:
                startY = 60;
                endY = 90;
                shape = `C ${x + 50},60 ${x + 70},90 ${x + 100},90`;
                break;
        }

        if (i === 0) {
            d += `M 0,${startY} `;
            currentY = startY;
        }

        // Smooth transition curve from previous endY to this startY
        d += `C ${x + 10},${currentY} ${x + 10},${startY} ${x + 20},${startY} `;

        d += shape + " ";
        currentY = endY;
    });

    return d.trim();
}

export function ToneGraph({ text, className, height = 48, widthPerSyllable = 60 }: ToneGraphProps) {
    const syllables = useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);
    const gradientId = useMemo(() => `tone-grad-${Math.random().toString(36).slice(2)}`, []);

    if (syllables.length === 0) {
        return null;
    }

    const totalWidth = syllables.length * widthPerSyllable;
    const viewBoxWidth = syllables.length * 100;

    const drawTime = syllables.length * 0.35; // fluid, quick motion
    const pauseTime = 2.0;
    const dur = drawTime + pauseTime;
    const drawEnd = drawTime / dur;

    const unifiedPath = buildUnifiedPath(syllables);

    return (
        <svg
            viewBox={`0 0 ${viewBoxWidth} 100`}
            width={totalWidth}
            height={height}
            className={cn("overflow-visible", className)}
            preserveAspectRatio="xMinYMid meet"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                    {syllables.map((syllable, i) => {
                        const tone = getWordTone(syllable);
                        const color = TONE_HEX_COLORS[tone];
                        const startPercent = (i / syllables.length) * 100;
                        const endPercent = ((i + 1) / syllables.length) * 100;

                        return (
                            <Fragment key={i}>
                                <stop offset={`${startPercent}%`} stopColor={color} />
                                <stop offset={`${endPercent}%`} stopColor={color} />
                            </Fragment>
                        );
                    })}
                </linearGradient>
            </defs>

            {/* Background grid lines */}
            <line x1="0" y1="25" x2={viewBoxWidth} y2="25" className="stroke-foreground/10" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="0" y1="50" x2={viewBoxWidth} y2="50" className="stroke-foreground/10" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="0" y1="75" x2={viewBoxWidth} y2="75" className="stroke-foreground/10" strokeWidth="2" strokeDasharray="4 4" />

            {/* Faint background path */}
            <path d={unifiedPath} fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" strokeLinecap="round" className="opacity-15" />

            {/* Animated continuous path */}
            <motion.path
                d={unifiedPath}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: drawTime, ease: "easeInOut", repeat: Infinity, repeatDelay: pauseTime }}
            />

            {/* The heavy dots for Nặng tones */}
            {syllables.map((syllable, i) => {
                const tone = getWordTone(syllable);
                if (tone !== 6) return null;

                const delayRatio = ((i + 1) / syllables.length) * drawEnd;

                return (
                    <circle key={`dot-${i}`} cx={(i + 1) * 100} cy="90" r="6" fill={TONE_HEX_COLORS[6]} style={{ opacity: 0 }}>
                        <animate
                            attributeName="opacity"
                            values="0; 0; 1; 1; 0"
                            keyTimes={`0; ${Math.max(0, delayRatio - 0.01)}; ${delayRatio}; 0.98; 1`}
                            dur={`${dur}s`}
                            repeatCount="indefinite"
                        />
                    </circle>
                );
            })}

            {/* The traveling fluid white dot */}
            <circle r="5" fill="white" style={{ opacity: 0, filter: "drop-shadow(0px 0px 4px rgba(255,255,255,0.8))" }}>
                <animate
                    attributeName="opacity"
                    values="0; 1; 1; 0; 0"
                    keyTimes={`0; 0.02; ${Math.max(0.02, drawEnd - 0.02)}; ${drawEnd}; 1`}
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                />
                <animateMotion
                    dur={`${dur}s`}
                    path={unifiedPath}
                    calcMode="spline"
                    keyPoints="0;1;1"
                    keyTimes={`0;${drawEnd};1`}
                    keySplines="0.42 0 0.58 1; 0 0 1 1"
                    repeatCount="indefinite"
                />
            </circle>
        </svg>
    );
}
