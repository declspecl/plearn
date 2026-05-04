import { resolveCompositionDomains } from "./domain";
import type { CompositionDomain, CompositionDomainList, ExpandCompositionDomains } from "./domain";
import type { Clock } from "@plearn/core/shared/clock";
import type { Logger } from "@plearn/core/shared/logger";
import { createDatabaseClient } from "@plearn/db/client";

export type CompositionClock = Clock;
export type CompositionLogger = Logger;

interface CompositionDomainArtifacts {
    // Add domain-specific artifacts here
}

type UnionToIntersection<Union> = (Union extends unknown ? (input: Union) => void : never) extends (input: infer Intersection) => void
    ? Intersection
    : never;

type MergeArtifacts<
    Domains extends CompositionDomain,
    Artifact extends keyof CompositionDomainArtifacts[CompositionDomain],
> = UnionToIntersection<CompositionDomainArtifacts[Domains][Artifact]>;

export interface CreateCompositionOptions<RequestedDomains extends CompositionDomainList> {
    readonly clock: Clock;
    readonly databaseUrl: string;
    readonly domains: RequestedDomains;
    readonly logger: Logger;
}

export type Composition<Domains extends CompositionDomain> = {
    readonly capabilities: {
        readonly domains: readonly CompositionDomain[];
        readonly has: Readonly<Record<Domains, true>>;
    };
    readonly clients: object;
    readonly repositories: object;
    readonly services: object;
};

/** Builds a typed composition for the selected domains and their transitive dependencies. */
export function createComposition<const RequestedDomains extends CompositionDomainList>(
    options: CreateCompositionOptions<RequestedDomains>,
): Composition<ExpandCompositionDomains<RequestedDomains[number]>> {
    const clock = options.clock;
    const resolvedDomains = resolveCompositionDomains(options.domains);
    const composition: any = {
        clients: {},
        repositories: {},
        services: {},
    };

    // const database = createDatabaseClient(options.databaseUrl);

    return {
        capabilities: {
            domains: resolvedDomains,
            has: Object.fromEntries(resolvedDomains.map((domain) => [domain, true])) as Record<
                ExpandCompositionDomains<RequestedDomains[number]>,
                true
            >,
        },
        clients: composition.clients,
        clock,
        repositories: composition.repositories,
        services: composition.services,
    } as any;
}
