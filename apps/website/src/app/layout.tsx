import { Providers } from "./_components/providers";
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Mono, Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
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
    title: "App Template",
    description: "A clean template shell.",
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
                geistSans.variable,
                geistMono.variable,
                plexMono.variable,
                inter.variable,
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
