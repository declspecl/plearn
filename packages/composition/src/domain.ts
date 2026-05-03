export const compositionDomain = {
    task: "task",
} as const;

export type CompositionDomain = (typeof compositionDomain)[keyof typeof compositionDomain];

export type ExpandCompositionDomains<Domain extends CompositionDomain> = Domain;

export type CompositionDomainList = readonly [CompositionDomain, ...CompositionDomain[]];

const compositionDomainOrder: readonly CompositionDomain[] = [compositionDomain.task];

/** Resolves transitive domain dependencies and returns a deterministic domain order. */
export function resolveCompositionDomains(domains: readonly CompositionDomain[]): readonly CompositionDomain[] {
    const resolvedDomains = new Set<CompositionDomain>(domains);
    return compositionDomainOrder.filter((domain) => resolvedDomains.has(domain));
}
