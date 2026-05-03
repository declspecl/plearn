# @plearn/dependency

Adapters for the hexagonal architecture.

This package implements **ports declared in `@plearn/core`** using real
infrastructure: Drizzle-backed facades, HTTP clients, and converters
that translate rows and API payloads into domain models.

## Shape

- **Postgres** — one folder per persisted domain: converter + facade implementing
  the matching core repository port.
- **External APIs** — clients, converters, and facades per provider. Names follow the integration, not the
  product UI.

## Adding an adapter

1. Define or reuse domain models and **core** ports when the persistence story is
   part of the product graph.
2. Add or extend schema in `@plearn/db` when storing new rows.
3. Implement `Converter` + `Facade` (or the established pattern for that
   technology) under the right technology folder.
4. Register **new** public modules in this package’s `package.json` `exports`
   so consumers use stable subpaths, not deep relative imports across packages.
5. Instantiate converters and facades at a **composition root**; inject them
   into services.

## Rules

- No business rules that belong in core (validation of domain invariants,
  orchestration policy, etc.).
- Do not import tRPC or app-layer code.
- Keep facades thin: translate, call the DB or client, map back.
- Prefer explicit subpath imports over a single package-root barrel.
