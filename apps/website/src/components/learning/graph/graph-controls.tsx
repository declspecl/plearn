"use client";

import { GRAPH_TYPE_STYLES } from "./graph-constants";
import type { GraphData } from "./graph-types";
import { MagnifyingGlass, Minus, Plus, SelectionAll } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Toggle } from "~/components/ui/toggle";

export function GraphControls({
    activeTypes,
    counts,
    onFitAll,
    onSearchChange,
    onToggleType,
    onZoomIn,
    onZoomOut,
    searchText,
}: {
    readonly activeTypes: ReadonlySet<GraphData["nodes"][number]["type"]>;
    readonly counts: { readonly nodes: number; readonly edges: number };
    readonly onFitAll: () => void;
    readonly onSearchChange: (value: string) => void;
    readonly onToggleType: (type: GraphData["nodes"][number]["type"]) => void;
    readonly onZoomIn: () => void;
    readonly onZoomOut: () => void;
    readonly searchText: string;
}) {
    return (
        <div className="pointer-events-none absolute inset-x-5 top-5 z-20 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="pointer-events-auto w-full max-w-xl rounded-[1.6rem] border border-slate-200/80 bg-white/88 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground flex size-9 items-center justify-center rounded-xl bg-slate-100">
                        <MagnifyingGlass className="size-4" />
                    </div>
                    <Input
                        className="border-0 bg-transparent shadow-none before:hidden"
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Find by Vietnamese text or translation"
                        value={searchText}
                    />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {Object.entries(GRAPH_TYPE_STYLES).map(([type, style]) => (
                        <Toggle
                            key={type}
                            className="gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-slate-700 data-[pressed]:border-slate-300"
                            onPressedChange={() => onToggleType(type as GraphData["nodes"][number]["type"])}
                            pressed={activeTypes.has(type as GraphData["nodes"][number]["type"])}
                            variant="outline"
                        >
                            <span className="size-2 rounded-full" style={{ backgroundColor: style.solid }} />
                            {style.label}
                        </Toggle>
                    ))}
                </div>
            </div>
            <div className="pointer-events-auto flex items-center gap-2 self-end rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="px-2 text-right">
                    <p className="text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">Visible</p>
                    <p className="text-sm font-semibold text-slate-900">
                        {counts.nodes} nodes · {counts.edges} edges
                    </p>
                </div>
                <Button onClick={onZoomOut} size="icon-sm" variant="outline">
                    <Minus />
                </Button>
                <Button onClick={onZoomIn} size="icon-sm" variant="outline">
                    <Plus />
                </Button>
                <Button onClick={onFitAll} size="sm" variant="outline">
                    <SelectionAll />
                    Fit
                </Button>
            </div>
        </div>
    );
}
