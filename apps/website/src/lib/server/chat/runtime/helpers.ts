import { getAppConfig } from "@/lib/server/app-config";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import "server-only";

export class ChatRuntimeError extends Error {
    public constructor(
        message: string,
        public readonly failureCode:
            | "unknown"
            | "timeout"
            | "tool_error"
            | "tool_timeout"
            | "network_error"
            | "run_in_progress"
            | "client_cancelled"
            | "stale_run"
            | "thread_locked"
            | "invalid_retry",
    ) {
        super(message);
        this.name = "ChatRuntimeError";
    }
}

export function getAnalysisModel() {
    const appConfig = getAppConfig();
    switch (appConfig.LEARNING_ANALYSIS_PROVIDER) {
        case "deepseek": {
            return deepseek(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        case "openai": {
            return openai(appConfig.LEARNING_ANALYSIS_MODEL);
        }
        default: {
            throw new Error(`Unsupported analysis provider: ${appConfig.LEARNING_ANALYSIS_PROVIDER}`);
        }
    }
}

export function getRunTimeoutMs() {
    return getAppConfig().LEARNING_ANALYSIS_TIMEOUT_MS ?? 90_000;
}

export function getToolTimeoutMs() {
    return Math.min(20_000, Math.max(5000, Math.floor(getRunTimeoutMs() / 3)));
}

export function getStaleRunGraceMs() {
    return getRunTimeoutMs() + 15_000;
}

export function combineSignals(signals: Array<AbortSignal | undefined>) {
    const candidates = signals.filter((signal): signal is AbortSignal => Boolean(signal));
    if (candidates.length === 0) {
        return undefined;
    }

    if (candidates.length === 1) {
        return candidates[0];
    }

    return AbortSignal.any(candidates);
}

export async function withTimeout<T>(input: {
    operation: Promise<T>;
    timeoutMs: number;
    timeoutMessage: string;
    timeoutCode: "timeout" | "tool_timeout";
    signal?: AbortSignal;
}): Promise<T> {
    if (input.signal?.aborted) {
        throw new ChatRuntimeError("Chat request was cancelled.", "client_cancelled");
    }

    const timeoutSignal = AbortSignal.timeout(input.timeoutMs);
    const combined = combineSignals([input.signal, timeoutSignal]);

    return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            if (input.signal?.aborted) {
                reject(new ChatRuntimeError("Chat request was cancelled.", "client_cancelled"));

                return;
            }

            reject(new ChatRuntimeError(input.timeoutMessage, input.timeoutCode));
        };

        combined?.addEventListener("abort", onAbort, { once: true });

        void input.operation
            .then(resolve)
            .catch(reject)
            .finally(() => {
                combined?.removeEventListener("abort", onAbort);
            });
    });
}

export function logChatInfo(message: string, metadata?: Readonly<Record<string, unknown>>) {
    console.info(`[CHAT] ${message}`, metadata ?? {});
}

export function logChatWarn(message: string, metadata?: Readonly<Record<string, unknown>>) {
    console.warn(`[CHAT] ${message}`, metadata ?? {});
}

export function logChatError(message: string, metadata?: Readonly<Record<string, unknown>>) {
    console.error(`[CHAT] ${message}`, metadata ?? {});
}
