export const OFFICIAL_RAIL_DOMAINS = [
    "smart-ex.jp",
    "jr-odekake.net",
    "westjr.co.jp",
    "jr-central.co.jp",
    "jreast.co.jp",
    "jrkyushu.co.jp",
    "jrhokkaido.co.jp",
    "jr-shikoku.co.jp",
] as const;

export const TRANSIT_UPLOAD_LIMITS = {
    maxFiles: 3,
    maxFileBytes: 10 * 1024 * 1024,
    maxTotalBytes: 20 * 1024 * 1024,
    maxPixels: 25_000_000,
} as const;

export function isOfficialRailHostname(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/\.$/, "");

    return OFFICIAL_RAIL_DOMAINS.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
}
