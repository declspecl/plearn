# Tests

`tests/local` mirrors the production package structure. Local tests should work
through public service or facade interfaces and mock only the boundary that
cannot reasonably run locally. Postgres-backed service tests use the local
Postgres test database; Yahoo Finance tests use mocked `fetch`.

Run the local test database before tests that exercise Postgres facades:

```bash
pnpm --filter @plearn/db db:test:up
pnpm --filter @plearn/db db:test:push
pnpm test
```

`tests/integration` contains smoke tests against a real running application.

`tests/clearbox` contains live clearbox tests. These tests:

- call real upstream APIs (no mocked HTTP clients)
- run through core services and dependency adapters
- use explicit environment variables for database and provider config
- are isolated from the default unit/local test run

Run clearbox tests explicitly:

```bash
pnpm test:clearbox
pnpm test:clearbox:dev
```

Use `tests/clearbox/.env.example` as the environment variable checklist. The
`test:clearbox:dev` script loads `apps/pipeline/.env.development`. Provider
test inputs are defined as constants in each clearbox test file.
