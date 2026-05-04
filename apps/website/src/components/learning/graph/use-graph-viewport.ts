"use client";

import { clampZoom } from "./graph-constants";
import type { PositionedNode } from "./graph-types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";

interface ViewportState {
    readonly panX: number;
    readonly panY: number;
    readonly zoom: number;
}

export interface GraphViewportApi extends ViewportState {
    readonly svgRef: React.RefObject<SVGSVGElement | null>;
    readonly fitAll: () => void;
    readonly centerOn: (x: number, y: number, zoom?: number) => void;
    readonly onWheel: (event: React.WheelEvent<SVGSVGElement>) => void;
    readonly onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
    readonly onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
    readonly onPointerUp: (event?: React.PointerEvent<SVGSVGElement>) => void;
    readonly onPointerLeave: (event?: React.PointerEvent<SVGSVGElement>) => void;
    readonly setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
}

function easeInOutCubic(value: number) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function useGraphViewport(nodes: readonly PositionedNode[]): GraphViewportApi {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const dragRef = useRef<{ pointerId: number; startPanX: number; startPanY: number; clientX: number; clientY: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [viewport, setViewport] = useState<ViewportState>({ panX: 0, panY: 0, zoom: 1 });
    const [size, setSize] = useState({ width: 0, height: 0 });
    const hasAutoFittedRef = useRef(false);

    useLayoutEffect(() => {
        const svg = svgRef.current;

        if (!svg) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => {
            if (!entry) {
                return;
            }

            setSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });

        observer.observe(svg);

        return () => observer.disconnect();
    }, []);

    const animateTo = useCallback(
        (next: ViewportState) => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            const start = performance.now();
            const from = viewport;
            const duration = 360;

            const tick = (now: number) => {
                const progress = Math.min(1, (now - start) / duration);
                const eased = easeInOutCubic(progress);

                setViewport({
                    panX: from.panX + (next.panX - from.panX) * eased,
                    panY: from.panY + (next.panY - from.panY) * eased,
                    zoom: from.zoom + (next.zoom - from.zoom) * eased,
                });

                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(tick);
                } else {
                    animationFrameRef.current = null;
                }
            };

            animationFrameRef.current = requestAnimationFrame(tick);
        },
        [viewport],
    );

    const fitAll = useCallback(() => {
        if (nodes.length === 0 || size.width === 0 || size.height === 0) {
            return;
        }

        const minX = Math.min(...nodes.map((node) => node.x - node.width / 2));
        const maxX = Math.max(...nodes.map((node) => node.x + node.width / 2));
        const minY = Math.min(...nodes.map((node) => node.y - node.height / 2));
        const maxY = Math.max(...nodes.map((node) => node.y + node.height / 2));
        const graphWidth = Math.max(1, maxX - minX);
        const graphHeight = Math.max(1, maxY - minY);
        const padding = 110;
        const zoom = clampZoom(Math.min((size.width - padding) / graphWidth, (size.height - padding) / graphHeight));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        animateTo({
            zoom,
            panX: size.width / 2 - centerX * zoom,
            panY: size.height / 2 - centerY * zoom,
        });
    }, [animateTo, nodes, size.height, size.width]);

    const centerOn = useCallback(
        (x: number, y: number, zoom = Math.max(viewport.zoom, 1.2)) => {
            if (size.width === 0 || size.height === 0) {
                return;
            }

            animateTo({
                zoom: clampZoom(zoom),
                panX: size.width / 2 - x * clampZoom(zoom),
                panY: size.height / 2 - y * clampZoom(zoom),
            });
        },
        [animateTo, size.height, size.width, viewport.zoom],
    );

    useEffect(() => {
        if (!hasAutoFittedRef.current && nodes.length > 0 && size.width > 0 && size.height > 0) {
            hasAutoFittedRef.current = true;
            fitAll();
        }
    }, [fitAll, nodes.length, size.height, size.width]);

    useEffect(
        () => () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        },
        [],
    );

    const onWheel = useCallback(
        (event: React.WheelEvent<SVGSVGElement>) => {
            event.preventDefault();

            const svg = svgRef.current;
            if (!svg) {
                return;
            }

            const rect = svg.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const graphX = (pointerX - viewport.panX) / viewport.zoom;
            const graphY = (pointerY - viewport.panY) / viewport.zoom;
            const zoom = clampZoom(viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08));

            setViewport({
                zoom,
                panX: pointerX - graphX * zoom,
                panY: pointerY - graphY * zoom,
            });
        },
        [viewport],
    );

    const onPointerDown = useCallback(
        (event: React.PointerEvent<SVGSVGElement>) => {
            dragRef.current = {
                pointerId: event.pointerId,
                startPanX: viewport.panX,
                startPanY: viewport.panY,
                clientX: event.clientX,
                clientY: event.clientY,
            };

            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [viewport.panX, viewport.panY],
    );

    const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        setViewport((current) => ({
            ...current,
            panX: drag.startPanX + (event.clientX - drag.clientX),
            panY: drag.startPanY + (event.clientY - drag.clientY),
        }));
    }, []);

    const endDrag = useCallback((event?: React.PointerEvent<SVGSVGElement>) => {
        if (event && dragRef.current?.pointerId === event.pointerId) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragRef.current = null;
    }, []);

    return {
        ...viewport,
        svgRef,
        fitAll,
        centerOn,
        onWheel,
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerLeave: endDrag,
        setViewport,
    };
}
