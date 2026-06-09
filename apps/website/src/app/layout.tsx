import { Providers } from "./_components/providers";
import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const plexSans = IBM_Plex_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-sans",
});

const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-display",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
    weight: ["400", "500"],
    variable: "--font-plex-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://plearn.io"),
    title: "Plearn",
    description: "Private personal learning tools.",
    appleWebApp: {
        title: "Plearn",
    },
};

export interface RootLayoutProps {
    readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html
            lang="en"
            className={[
                "h-full",
                "antialiased",
                geistMono.variable,
                plexMono.variable,
                plexSans.variable,
                fraunces.variable,
                "font-sans",
            ].join(" ")}
            suppressHydrationWarning
        >
            <body className="flex min-h-full flex-col">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
