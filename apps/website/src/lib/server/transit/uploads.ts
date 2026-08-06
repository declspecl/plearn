import { TRANSIT_UPLOAD_LIMITS } from "./constants";
import { fileTypeFromBuffer } from "file-type";
import "server-only";
import sharp from "sharp";

const ACCEPTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface NormalizedTransitImage {
    readonly data: Uint8Array;
    readonly mediaType: "image/png" | "image/jpeg" | "image/webp";
    readonly originalName: string;
}

export class TransitUploadError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "TransitUploadError";
    }
}

export async function normalizeTransitImages(files: readonly File[]): Promise<readonly NormalizedTransitImage[]> {
    if (files.length === 0) {
        return [];
    }

    if (files.length > TRANSIT_UPLOAD_LIMITS.maxFiles) {
        throw new TransitUploadError(`Upload at most ${TRANSIT_UPLOAD_LIMITS.maxFiles} screenshots.`);
    }

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > TRANSIT_UPLOAD_LIMITS.maxTotalBytes) {
        throw new TransitUploadError("The screenshots exceed the 20 MB total limit.");
    }

    return Promise.all(
        files.map(async (file) => {
            if (file.size <= 0 || file.size > TRANSIT_UPLOAD_LIMITS.maxFileBytes) {
                throw new TransitUploadError("Each screenshot must be between 1 byte and 10 MB.");
            }

            const input = Buffer.from(await file.arrayBuffer());
            const detected = await fileTypeFromBuffer(input);
            if (!detected || !ACCEPTED_MIME_TYPES.has(detected.mime)) {
                throw new TransitUploadError("Screenshots must be PNG, JPEG, or WebP images.");
            }

            const image = sharp(input, { limitInputPixels: TRANSIT_UPLOAD_LIMITS.maxPixels, failOn: "error" });
            const metadata = await image.metadata();
            if (!metadata.width || !metadata.height || metadata.width * metadata.height > TRANSIT_UPLOAD_LIMITS.maxPixels) {
                throw new TransitUploadError("A screenshot exceeds the 25 megapixel limit.");
            }

            const rotated = image.rotate();
            let output: Buffer;
            let mediaType: NormalizedTransitImage["mediaType"];
            switch (detected.mime) {
                case "image/jpeg": {
                    output = await rotated.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer();
                    mediaType = "image/jpeg";
                    break;
                }
                case "image/webp": {
                    output = await rotated.webp({ lossless: true }).toBuffer();
                    mediaType = "image/webp";
                    break;
                }
                default: {
                    output = await rotated.png({ compressionLevel: 9 }).toBuffer();
                    mediaType = "image/png";
                }
            }

            if (output.byteLength > TRANSIT_UPLOAD_LIMITS.maxFileBytes) {
                throw new TransitUploadError("A normalized screenshot exceeds the 10 MB limit.");
            }

            return {
                data: new Uint8Array(output),
                mediaType,
                originalName: file.name.slice(0, 120),
            };
        }),
    );
}
