# @plearn/db

Database layer for Plearn using Drizzle ORM with PostgreSQL.

## Current Surface

- `@plearn/db/client` - database client factory for local Postgres or Neon.
- `@plearn/db/schema/auth` - Better Auth tables.
- `@plearn/db/schema/relations` - Drizzle relations.

The old template `posts` table has been removed.

## Setup

```bash
cd packages/db
pnpm db:start:dev
pnpm db:migrate:dev
```

The local development database defaults to:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/plearn_dev
```

The bundled Docker images use `pgvector`-enabled Postgres so lexical and vector
search work locally and in tests.

`db:migrate:dev` installs the required `vector` and `pg_trgm` extensions through
the initial migration. `db:push:dev` bootstraps those extensions automatically
before Drizzle introspects the schema, so it also works with a fresh or existing
development volume.

## Usage

```typescript
import { createDatabaseClient } from "@plearn/db/client";
import { users } from "@plearn/db/schema/auth";

const db = createDatabaseClient(process.env.DATABASE_URL!);
const allUsers = await db.select().from(users);
```

## Adding Schema

1. Add a new direct schema file under `src/schema`.
2. Export it from `src/schema/index.ts` so the database client includes it.
3. Add direct package exports if another package should import it directly.
4. Generate and run a migration.

```bash
pnpm db:generate:dev
pnpm db:migrate:dev
```

Follow the project rule against package-root barrels in application code. Import
schema from its direct path where possible, such as
`@plearn/db/schema/auth`.
