import { compositionDomain, resolveCompositionDomains } from "./domain";
import type { CompositionDomain, CompositionDomainList, ExpandCompositionDomains } from "./domain";
import type { Clock } from "@plearn/core/shared/clock";
import type { Logger } from "@plearn/core/shared/logger";
import { TaskService } from "@plearn/core/task/service";
import { createDatabaseClient } from "@plearn/db/client";
import { TaskConverter } from "@plearn/dependency/postgres/task/converter";
import { TaskFacade } from "@plearn/dependency/postgres/task/facade";

export type CompositionClock = Clock;
export type CompositionLogger = Logger;

interface CompositionDomainArtifacts {
    readonly task: {
        readonly clients: object;
        readonly repositories: object;
        readonly services: { readonly taskService: TaskService };
    };
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
    readonly clients: MergeArtifacts<Domains, "clients">;
    readonly clock: Clock;
    readonly repositories: MergeArtifacts<Domains, "repositories">;
    readonly services: MergeArtifacts<Domains, "services">;
};

/** Builds a typed composition for the selected domains and their transitive dependencies. */
export function createComposition<const RequestedDomains extends CompositionDomainList>(
    options: CreateCompositionOptions<RequestedDomains>,
): Composition<ExpandCompositionDomains<RequestedDomains[number]>> {
    const clock = options.clock;
    const resolvedDomains = resolveCompositionDomains(options.domains);
    const resolvedDomainSet = new Set(resolvedDomains);
    const composition: any = {
        clients: {},
        repositories: {},
        services: {},
    };

    const database = createDatabaseClient(options.databaseUrl);

    if (resolvedDomainSet.has(compositionDomain.task)) {
        const taskRepository = new TaskFacade(database, new TaskConverter());
        composition.services.taskService = new TaskService(taskRepository);
    }

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
