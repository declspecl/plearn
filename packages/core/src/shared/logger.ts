export interface Logger {
    info(message: string, metadata?: Readonly<Record<string, unknown>>): void;
    warn(message: string, metadata?: Readonly<Record<string, unknown>>): void;
    error(message: string, metadata?: Readonly<Record<string, unknown>>): void;
}
