import { isOfficialRailHostname } from "./constants";
import { load } from "cheerio";
import { fileTypeFromBuffer } from "file-type";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import "server-only";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const blockedAddresses = new BlockList();

for (const [network, prefix, type] of [
    ["0.0.0.0", 8, "ipv4"],
    ["10.0.0.0", 8, "ipv4"],
    ["100.64.0.0", 10, "ipv4"],
    ["127.0.0.0", 8, "ipv4"],
    ["169.254.0.0", 16, "ipv4"],
    ["172.16.0.0", 12, "ipv4"],
    ["192.0.0.0", 24, "ipv4"],
    ["192.0.2.0", 24, "ipv4"],
    ["192.168.0.0", 16, "ipv4"],
    ["198.18.0.0", 15, "ipv4"],
    ["198.51.100.0", 24, "ipv4"],
    ["203.0.113.0", 24, "ipv4"],
    ["224.0.0.0", 4, "ipv4"],
    ["::", 128, "ipv6"],
    ["::1", 128, "ipv6"],
    ["fc00::", 7, "ipv6"],
    ["fe80::", 10, "ipv6"],
    ["2001:db8::", 32, "ipv6"],
] as const) {
    blockedAddresses.addSubnet(network, prefix, type);
}

export interface OfficialResource {
    readonly url: string;
    readonly mediaType: "text/plain" | "application/pdf" | "image/png" | "image/jpeg" | "image/webp";
    readonly data: string | Uint8Array;
    readonly title: string;
}

export class OfficialResourceError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "OfficialResourceError";
    }
}

export function isBlockedNetworkAddress(address: string) {
    const family = isIP(address);

    return family === 0 || blockedAddresses.check(address, family === 6 ? "ipv6" : "ipv4");
}

export function validateOfficialResourceUrl(input: string | URL) {
    let url: URL;
    try {
        url = input instanceof URL ? new URL(input) : new URL(input);
    } catch {
        throw new OfficialResourceError("The official resource URL is invalid.");
    }

    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
        throw new OfficialResourceError("Only credential-free official HTTPS resources are allowed.");
    }

    if (isIP(url.hostname) !== 0 || !isOfficialRailHostname(url.hostname)) {
        throw new OfficialResourceError("The resource is not hosted by an approved rail operator.");
    }

    return url;
}

async function assertSafeUrl(url: URL) {
    validateOfficialResourceUrl(url);

    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
        throw new OfficialResourceError("The official resource hostname did not resolve.");
    }

    for (const address of addresses) {
        if (isBlockedNetworkAddress(address.address)) {
            throw new OfficialResourceError("The official resource resolved to a blocked network.");
        }
    }
}

async function readLimitedBody(response: Response) {
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_BYTES) {
        throw new OfficialResourceError("The official resource exceeds the 10 MB limit.");
    }

    if (!response.body) {
        throw new OfficialResourceError("The official resource had no response body.");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }
        total += value.byteLength;
        if (total > MAX_BYTES) {
            await reader.cancel();
            throw new OfficialResourceError("The official resource exceeds the 10 MB limit.");
        }
        chunks.push(value);
    }

    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return output;
}

export async function fetchOfficialResource(inputUrl: string): Promise<OfficialResource> {
    let current = validateOfficialResourceUrl(inputUrl);
    const signal = AbortSignal.timeout(TIMEOUT_MS);

    for (const redirectCount of Array.from({ length: MAX_REDIRECTS + 1 }, (_, index) => index)) {
        await assertSafeUrl(current);
        const response = await fetch(current, {
            redirect: "manual",
            signal,
            headers: { "user-agent": "PlearnTransitGuide/1.0" },
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location || redirectCount === MAX_REDIRECTS) {
                throw new OfficialResourceError("The official resource redirected too many times.");
            }
            await response.body?.cancel();
            current = new URL(location, current);
            continue;
        }

        if (!response.ok) {
            throw new OfficialResourceError(`The official resource returned HTTP ${response.status}.`);
        }

        const bytes = await readLimitedBody(response);
        await assertSafeUrl(current);
        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";

        if (contentType === "text/html" || contentType === "application/xhtml+xml") {
            const html = new TextDecoder().decode(bytes);
            const $ = load(html);
            $("script, style, noscript, iframe, object, embed, form").remove();
            const title = $("title").first().text().trim() || current.hostname;
            const text = $("main, article, body").first().text().replaceAll(/\s+/gu, " ").trim().slice(0, 80_000);
            const links = [
                ...new Set(
                    $("a[href]")
                        .toArray()
                        .flatMap((element) => {
                            const href = $(element).attr("href");
                            if (!href) return [];
                            try {
                                const url = new URL(href, current);

                                return url.protocol === "https:" && isOfficialRailHostname(url.hostname) ? [url.toString()] : [];
                            } catch {
                                return [];
                            }
                        }),
                ),
            ].slice(0, 50);
            const sanitized = links.length > 0 ? `${text}\n\nRelevant official links:\n${links.join("\n")}` : text;

            return { url: current.toString(), mediaType: "text/plain", data: sanitized, title };
        }

        const detected = await fileTypeFromBuffer(bytes);
        const mediaType = detected?.mime;
        if (!mediaType || !new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]).has(mediaType)) {
            throw new OfficialResourceError("The official resource type is not supported.");
        }

        return {
            url: current.toString(),
            mediaType: mediaType as OfficialResource["mediaType"],
            data: bytes,
            title: current.pathname.split("/").findLast(Boolean) ?? current.hostname,
        };
    }

    throw new OfficialResourceError("The official resource could not be fetched.");
}
