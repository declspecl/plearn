export const getLocalStorageItem = <T>(key: string): T | null => {
    if (globalThis.window === undefined) return null;
    const item = globalThis.localStorage.getItem(key);
    if (!item) return null;
    try {
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`[LOCALSTORAGE] Error parsing key "${key}":`, error);

        return null;
    }
};

export const setLocalStorageItem = <T>(key: string, value: T) => {
    if (globalThis.window === undefined) return;
    try {
        globalThis.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`[LOCALSTORAGE] Error setting key "${key}":`, error);
    }
};

export const removeLocalStorageItem = (key: string) => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.removeItem(key);
};
