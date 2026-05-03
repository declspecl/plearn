# @plearn/composition

**Wiring only.** This package constructs implementations (converters, facades,
outbound clients) and domain services for runtimes that need a coherent graph.

It is **not** where business rules live. Keep branching and invariants in
`@plearn/core`; keep storage and HTTP details in `@plearn/dependency`; keep schema
in `@plearn/db`.

## Boundaries

- May depend on `core`, `db`, and `dependency`.
- Avoid `trpc`, `auth`, or UI frameworks — those entrypoints assemble their own
  smaller service surfaces when they do not need the full graph.

## Runtimes

Different apps may use **partial** graphs (e.g. a read-only web API vs. a full
CLI). When two places duplicate large constructor blocks, prefer
extending the builder here or extracting a shared factory.
