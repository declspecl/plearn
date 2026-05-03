import { chunk, groupBy, unique } from "@plearn/utils/array-utilities";
import { describe, expect, it } from "vitest";

describe("chunk", () => {
    it("returns empty array for empty input", () => {
        expect(chunk([], 2)).toEqual([]);
    });

    it("returns single chunk when array smaller than size", () => {
        expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it("chunks array evenly divisible by size", () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it("chunks array with remainder", () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("handles chunk size of 1", () => {
        expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it("handles chunk size equal to array length", () => {
        expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    });
});

describe("unique", () => {
    it("returns empty array for empty input", () => {
        expect(unique([])).toEqual([]);
    });

    it("returns same array when no duplicates", () => {
        expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("removes duplicates", () => {
        expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it("handles all same values", () => {
        expect(unique([1, 1, 1])).toEqual([1]);
    });

    it("works with strings", () => {
        expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
    });
});

describe("groupBy", () => {
    it("returns empty object for empty array", () => {
        expect(groupBy<number, number>([], (value: number) => value)).toEqual({});
    });

    it("groups by string key", () => {
        const items = [
            { type: "a", value: 1 },
            { type: "b", value: 2 },
            { type: "a", value: 3 },
        ];

        expect(groupBy(items, (item: { type: string; value: number }) => item.type)).toEqual({
            a: [
                { type: "a", value: 1 },
                { type: "a", value: 3 },
            ],
            b: [{ type: "b", value: 2 }],
        });
    });

    it("groups by number key", () => {
        const items = [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
            { id: 1, name: "c" },
        ];

        expect(groupBy(items, (item: { id: number; name: string }) => item.id)).toEqual({
            1: [
                { id: 1, name: "a" },
                { id: 1, name: "c" },
            ],
            2: [{ id: 2, name: "b" }],
        });
    });

    it("handles single group", () => {
        const items = [1, 2, 3];

        expect(groupBy(items, () => "all")).toEqual({
            all: [1, 2, 3],
        });
    });

    it("handles each item in own group", () => {
        const items = [1, 2, 3];

        expect(groupBy(items, (value: number) => value)).toEqual({
            1: [1],
            2: [2],
            3: [3],
        });
    });
});
