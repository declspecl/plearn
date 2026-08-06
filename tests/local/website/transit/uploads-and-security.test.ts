import {
    isBlockedNetworkAddress,
    OfficialResourceError,
    validateOfficialResourceUrl,
} from "../../../../apps/website/src/lib/server/transit/official-resource-fetcher";
import { normalizeTransitImages, TransitUploadError } from "../../../../apps/website/src/lib/server/transit/uploads";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Transit screenshot uploads", () => {
    it("rejects more than three screenshots", async () => {
        const files = Array.from({ length: 4 }, (_, index) => new File([new Uint8Array([index])], `${index}.png`, { type: "image/png" }));

        await expect(normalizeTransitImages(files)).rejects.toThrow(/at most 3/iu);
    });

    it("validates magic bytes instead of trusting the browser MIME", async () => {
        const fake = new File(["not an image"], "ticket.png", { type: "image/png" });

        await expect(normalizeTransitImages([fake])).rejects.toBeInstanceOf(TransitUploadError);
    });

    it("normalizes orientation and removes JPEG metadata", async () => {
        const input = await sharp({ create: { width: 2, height: 3, channels: 3, background: "#ffffff" } })
            .jpeg()
            .withMetadata({ orientation: 6 })
            .toBuffer();
        const [normalized] = await normalizeTransitImages([new File([Uint8Array.from(input)], "ticket.jpg", { type: "image/jpeg" })]);
        const metadata = await sharp(normalized!.data).metadata();

        expect(metadata.width).toBe(3);
        expect(metadata.height).toBe(2);
        expect(metadata.orientation).toBeUndefined();
        expect(metadata.exif).toBeUndefined();
    });
});

describe("Transit official-resource SSRF boundary", () => {
    it("accepts only credential-free HTTPS URLs on the official domain allowlist", () => {
        expect(validateOfficialResourceUrl("https://www.jr-odekake.net/eki/premises.php?id=0610130").hostname).toBe("www.jr-odekake.net");
        expect(() => validateOfficialResourceUrl("http://jr-odekake.net/map.pdf")).toThrow(OfficialResourceError);
        expect(() => validateOfficialResourceUrl("https://user:pass@jr-odekake.net/map.pdf")).toThrow(OfficialResourceError);
        expect(() => validateOfficialResourceUrl("https://jr-odekake.net:8443/map.pdf")).toThrow(OfficialResourceError);
        expect(() => validateOfficialResourceUrl("https://jr-odekake.net.attacker.example/map.pdf")).toThrow(OfficialResourceError);
        expect(() => validateOfficialResourceUrl("https://127.0.0.1/map.pdf")).toThrow(OfficialResourceError);
    });

    it("blocks private, loopback, link-local, metadata, and documentation networks", () => {
        for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.2", "::1", "fc00::1", "fe80::1", "2001:db8::1"]) {
            expect(isBlockedNetworkAddress(address), address).toBe(true);
        }
        expect(isBlockedNetworkAddress("8.8.8.8")).toBe(false);
        expect(isBlockedNetworkAddress("2606:4700:4700::1111")).toBe(false);
    });
});
