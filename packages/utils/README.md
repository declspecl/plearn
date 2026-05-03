# @plearn/utils

Shared utility functions with zero dependencies.

## Overview

This package provides common utility functions used across the monorepo:

- **Array utilities** - chunk, unique, groupBy
- **Error handling** - tryCatch, tryCatchSync (Result type pattern)

## Installation

```bash
pnpm add @plearn/utils
```

## Usage

### Array Utilities

```typescript
import { chunk, unique, groupBy } from "@plearn/utils/array-utilities";

// Chunk array into smaller arrays
const numbers = [1, 2, 3, 4, 5];
chunk(numbers, 2); // [[1, 2], [3, 4], [5]]

// Remove duplicates
const withDuplicates = [1, 2, 2, 3, 1];
unique(withDuplicates); // [1, 2, 3]

// Group by key
const items = [
    { type: "a", value: 1 },
    { type: "b", value: 2 },
    { type: "a", value: 3 },
];
groupBy(items, (item) => item.type);
// { a: [{ type: "a", value: 1 }, { type: "a", value: 3 }], b: [{ type: "b", value: 2 }] }
```

### Error Handling

```typescript
import { tryCatch, tryCatchSync } from "@plearn/utils/try-catch";

// Async error handling
const result = await tryCatch(async () => {
    const response = await fetch("/api/data");
    return response.json();
});

if (result.success) {
    console.log("Data:", result.data);
} else {
    console.error("Error:", result.error);
}

// Sync error handling
const syncResult = tryCatchSync(() => {
    return JSON.parse(someString);
});

if (syncResult.success) {
    console.log("Parsed:", syncResult.data);
} else {
    console.error("Parse error:", syncResult.error);
}
```

## API Reference

### `chunk<T>(array: T[], size: number): T[][]`

Splits an array into chunks of specified size.

**Parameters:**

- `array` - Array to chunk
- `size` - Size of each chunk

**Returns:** Array of chunks

**Example:**

```typescript
chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
```

### `unique<T>(array: T[]): T[]`

Removes duplicate values from an array.

**Parameters:**

- `array` - Array to deduplicate

**Returns:** Array with unique values

**Example:**

```typescript
unique([1, 2, 2, 3, 1]); // [1, 2, 3]
```

### `groupBy<T, K>(array: T[], keyFn: (item: T) => K): Record<K, T[]>`

Groups array items by a key function.

**Parameters:**

- `array` - Array to group
- `keyFn` - Function that returns the grouping key

**Returns:** Object with grouped items

**Example:**

```typescript
const items = [
    { type: "a", val: 1 },
    { type: "b", val: 2 },
];
groupBy(items, (item) => item.type); // { a: [...], b: [...] }
```

### `tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, Error>>`

Wraps an async function in try-catch and returns a Result type.

**Parameters:**

- `fn` - Async function to execute

**Returns:** Promise of Result (success or error)

**Example:**

```typescript
const result = await tryCatch(async () => fetchData());
if (result.success) {
    // result.data is available
} else {
    // result.error is available
}
```

### `tryCatchSync<T>(fn: () => T): Result<T, Error>`

Wraps a sync function in try-catch and returns a Result type.

**Parameters:**

- `fn` - Sync function to execute

**Returns:** Result (success or error)

**Example:**

```typescript
const result = tryCatchSync(() => JSON.parse(str));
if (result.success) {
    // result.data is available
} else {
    // result.error is available
}
```

## Testing

This package has 100% test coverage on all functions.

### Running Tests

```bash
# From root
pnpm test

# With coverage
pnpm test:coverage
```

### Test Structure

```
packages/utils/
└── src/
    ├── array-utils.ts
    └── try-catch.ts

tests/local/utils/
├── array-utilities.test.ts
└── try-catch.test.ts
```

### Example Tests

```typescript
import { chunk } from "@plearn/utils/array-utilities";

describe("chunk", () => {
    it("returns empty array for empty input", () => {
        expect(chunk([], 2)).toEqual([]);
    });

    it("chunks array evenly divisible by size", () => {
        expect(chunk([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it("chunks array with remainder", () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
});
```

See [TESTING.md](../../TESTING.md) for comprehensive testing guide.

## Design Principles

- **Zero dependencies** - No external packages
- **Pure functions** - No side effects
- **Type-safe** - Full TypeScript support
- **Well-tested** - 100% coverage
- **Tree-shakeable** - Direct imports only

## Adding New Utilities

When adding new utility functions:

1. Add function to appropriate file in `src/`
2. Export from file (no barrel exports)
3. Add to `package.json` exports
4. Write comprehensive tests
5. Update this README

## Related Packages

- `@plearn/core` - Uses these utilities for business logic
- All other packages can use these utilities

## Further Reading

- [Functional Programming](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)
- [Result Type Pattern](https://www.youtube.com/watch?v=srQt1NAHYC0)
