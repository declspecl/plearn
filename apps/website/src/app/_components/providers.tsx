"use client";

import { TRPCReactProvider } from "@plearn/trpc/client/react";
import "client-only";
import { ThemeProvider } from "next-themes";

export interface ProvidersProps {
    readonly children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem storageKey="plearn:theme">
            <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
    );
}
