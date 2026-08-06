import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "Plearn",
        short_name: "Plearn",
        description: "Private personal learning tools.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: [
            { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
