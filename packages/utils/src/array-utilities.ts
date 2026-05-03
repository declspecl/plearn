/**
 * Array utility functions
 */

export function chunk<T>(array: readonly T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) => array.slice(index * size, index * size + size));
}

export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

export function groupBy<T, K extends string | number>(array: T[], keyFunction: (item: T) => K): Record<K, T[]> {
    return array.reduce(
        (accumulator, item) => {
            const key = keyFunction(item);

            if (!accumulator[key]) {
                accumulator[key] = [];
            }

            accumulator[key]!.push(item);

            return accumulator;
        },
        {} as Record<K, T[]>,
    );
}
