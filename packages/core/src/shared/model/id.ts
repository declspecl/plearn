declare const idBrand: unique symbol;

export type EntityId<TKind extends string> = string & {
    readonly [idBrand]: TKind;
};

export function createEntityId<TKind extends string>(value: string): EntityId<TKind> {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        throw new Error("Entity ID cannot be empty");
    }

    return trimmedValue as EntityId<TKind>;
}
