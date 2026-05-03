# @plearn/core

Business logic for the App Template — the center of the hexagon.

This package holds domain models, services, repository **ports** (interfaces),
and typed IO contracts. It must not import database clients, tRPC, auth
packages, or adapters. Only `@plearn/utils` is allowed as a sibling dependency.

## How code is grouped

Core is split by **purpose**, not by accident of folder name:

1. **Product** — durable concepts users and the workbench reason about. These are long-lived
   domain areas.
2. **Shared** — tiny cross-cutting pieces that stay free of framework imports
   (time, logging, common ID branding).

When adding something new, ask: _Is this a stable product concept or a generic helper?_ Put it in the matching area.

## Public surface

Consumers import via **explicit subpaths** declared in this package’s
`package.json` `exports` field. Each subpath maps to a module (often a small
`index` that re-exports that module’s public symbols).

Do **not** import from the package root (`@plearn/core` alone). That keeps
dependency graphs explicit and avoids “catch-all” barrels. Subpath entry files
that exist solely to satisfy `exports` are not the same as re-exporting the
entire package from one file.

## Patterns per area

Within each area, prefer the usual shape:

- `model/` — entities, value types, branded IDs
- `io/` — one file per service API’s request/response types (where applicable)
- `repository.ts` — port the service needs from persistence or the outside world
- `service.ts` — rules and orchestration over the port

Not every folder needs every file; match what adjacent domains do.

## Boundaries

- Contracts implemented in `@plearn/dependency` (facades, HTTP clients).
- Schema and SQL types in `@plearn/db` (core never imports them).
- Wiring (constructing facades + services) belongs at **composition roots** in
  apps or `@plearn/composition`, not inside services.
