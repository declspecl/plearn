"use client";

import { TRPCReactProvider } from "@plearn/trpc/client/react";
import "client-only";

export interface ProvidersProps {
    readonly children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return <TRPCReactProvider>{children}</TRPCReactProvider>;
}
