import type { TransitStreamEvent } from "@/lib/transit/types";
import "server-only";

export function createTransitNdjsonStream(execute: (send: (event: TransitStreamEvent) => void) => Promise<void>): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: TransitStreamEvent) => {
                controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            };

            void execute(send).finally(() => controller.close());
        },
    });

    return new Response(stream, {
        headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            "x-content-type-options": "nosniff",
        },
    });
}
