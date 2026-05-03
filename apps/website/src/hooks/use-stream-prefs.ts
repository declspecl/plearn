"use client";

import { useCallback, useEffect, useState } from "react";

export type DensityMode = "comfortable" | "compact";
export type SortMode = "biggest-moves" | "alphabetical";

export interface StreamPrefs {
    density: DensityMode;
    sort: SortMode;
}

const STORAGE_KEY = "plearn:stream-prefs";

const DEFAULTS: StreamPrefs = {
    density: "comfortable",
    sort: "biggest-moves",
};

export function useStreamPrefs(): [StreamPrefs, (update: Partial<StreamPrefs>) => void] {
    const [prefs, setPrefs] = useState<StreamPrefs>(DEFAULTS);

    // Read from localStorage on mount (SSR-safe)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (raw) {
                const parsed = JSON.parse(raw) as Partial<StreamPrefs>;

                setPrefs((prev) => ({ ...prev, ...parsed }));
            }
        } catch {
            // ignore
        }
    }, []);

    const update = useCallback((patch: Partial<StreamPrefs>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...patch };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // ignore
            }

            return next;
        });
    }, []);

    return [prefs, update];
}
