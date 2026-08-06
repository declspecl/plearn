const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isAcceptedTransitImage(file: File) {
    return ACCEPTED_IMAGE_TYPES.has(file.type);
}

export function transitImagesFromClipboard(data: Pick<DataTransfer, "items" | "files">) {
    const itemFiles = [...data.items].flatMap((item) => {
        const file = item.kind === "file" && ACCEPTED_IMAGE_TYPES.has(item.type) ? item.getAsFile() : null;

        return file ? [file] : [];
    });

    return itemFiles.length > 0 ? itemFiles : [...data.files].filter((file) => isAcceptedTransitImage(file));
}
