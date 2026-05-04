"use client";

import { GRAPH_TYPE_STYLES, RELATION_DASH_PATTERNS } from "./graph-constants";

export function GraphLegend() {
    return (
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 w-[min(320px,calc(100%-2.5rem))] rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">Legend</p>
            <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(GRAPH_TYPE_STYLES).map((style) => (
                        <div key={style.label} className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: style.solid }} />
                            <span>{style.label}</span>
                        </div>
                    ))}
                </div>
                <div className="grid gap-1.5 text-xs text-slate-600">
                    {Object.entries(RELATION_DASH_PATTERNS).map(([relation, dashArray]) => (
                        <div key={relation} className="flex items-center gap-3">
                            <svg className="h-3 w-16 shrink-0" viewBox="0 0 64 12">
                                <path
                                    d="M 2 6 Q 18 2 32 6 T 62 6"
                                    fill="none"
                                    stroke="#475569"
                                    strokeDasharray={dashArray}
                                    strokeLinecap="round"
                                    strokeWidth="1.6"
                                />
                            </svg>
                            <span>{relation.replaceAll("_", " ")}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
