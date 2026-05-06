import type { ChatStreamEvent } from "@/lib/chat/types";
import "server-only";

export function createNdjsonStream(execute: (send: (event: ChatStreamEvent) => void) => Promise<void>): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: ChatStreamEvent) => {
                controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            };

            void execute(send).finally(() => {
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-cache, no-transform",
        },
    });
}
