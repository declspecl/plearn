export const getLocalStorageItem = <T>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    const item = window.localStorage.getItem(key);
    if (!item) return null;
    try {
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`[LOCALSTORAGE] Error parsing key "${key}":`, error);
        return null;
    }
};

export const setLocalStorageItem = <T>(key: string, value: T) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`[LOCALSTORAGE] Error setting key "${key}":`, error);
    }
};

export const removeLocalStorageItem = (key: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
};
