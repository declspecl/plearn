import { transitImagesFromClipboard } from "../../../../apps/website/src/lib/transit/clipboard";
import { describe, expect, it } from "vitest";

function clipboardData(input: { items?: readonly File[]; files?: readonly File[] }) {
    return {
        items: (input.items ?? []).map((file) => ({
            kind: "file",
            type: file.type,
            getAsFile: () => file,
        })),
        files: input.files ?? [],
    } as unknown as Pick<DataTransfer, "items" | "files">;
}

describe("Transit clipboard images", () => {
    it("reads a copied image from clipboard items", () => {
        const image = new File([new Uint8Array([1])], "copied.png", { type: "image/png" });

        expect(transitImagesFromClipboard(clipboardData({ items: [image] }))).toEqual([image]);
    });

    it("falls back to clipboard files and ignores unsupported content", () => {
        const image = new File([new Uint8Array([1])], "copied.webp", { type: "image/webp" });
        const text = new File(["hello"], "note.txt", { type: "text/plain" });

        expect(transitImagesFromClipboard(clipboardData({ files: [text, image] }))).toEqual([image]);
        expect(transitImagesFromClipboard(clipboardData({ items: [text], files: [text] }))).toEqual([]);
    });
});
