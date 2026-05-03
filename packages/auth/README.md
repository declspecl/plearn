# @plearn/auth

Authentication layer using [better-auth](https://better-auth.com) for web applications.

## Overview

This package provides:

- **Server-side auth** - Better-auth instance with Drizzle adapter
- **Web client** - React/Next.js auth client
- **Type-safe** - Full TypeScript support across server and client

## Architecture Pattern

This package follows the **Authentication Layer** pattern:

- Wraps better-auth with configuration for Plearn
- Uses `@plearn/db` for database persistence via Drizzle adapter
- Provides a typed web client for browser apps
- Integrates with `@plearn/trpc` for protected tRPC procedures

## Setup

### 1. Generate Better-Auth Schema

The repo ships a dedicated CLI config at
[packages/auth/auth.ts](/Users/dec/programming/projects/plearn/packages/auth/auth.ts:1)
that Better Auth can load directly.

#### Recommended

From the project root:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/plearn_dev" pnpm auth:generate
```

The CLI will:

1. Read the auth configuration from `packages/auth/auth.ts`
2. Generate the required schema (user, session, account, verification tables)
3. Create Drizzle schema files in `packages/db/src/schema/`

#### Option B: Manual Schema Setup

If the CLI doesn't work in your environment, you can manually create the schema files. See the [better-auth database documentation](https://better-auth.com/docs/concepts/database#core-schema) for the required tables.

### 2. Run Migrations

After schema generation:

```bash
cd packages/db
pnpm db:migrate:dev
```

### 3. Set Environment Variables

Create a `.env.local` file in your app:

```env
# Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SERVER_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/plearn_dev
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

## Usage

### Server-Side (Next.js API Route)

```typescript
// app/api/auth/[...all]/route.ts
import { createAuth, toNextJsHandler } from "@plearn/auth/server";
import { createDatabaseClient } from "@plearn/db/client";

const db = createDatabaseClient(process.env.DATABASE_URL!);

export const auth = createAuth({
    webUrl: new URL(process.env.BETTER_AUTH_URL!),
    serverUrl: new URL(process.env.BETTER_AUTH_SERVER_URL ?? process.env.BETTER_AUTH_URL!),
    apiPath: "/api",
    authSecret: process.env.BETTER_AUTH_SECRET!,
    db,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

export const { POST, GET } = toNextJsHandler(auth);
```

### Web Client (React/Next.js)

```typescript
import { authClient, useSession } from "@plearn/auth/client";

function ProfileButton() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;

  if (!session) {
    return (
      <button onClick={() => authClient.signIn.email({
        email: "user@example.com",
        password: "password123",
      })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {session.user.name}!</p>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  );
}
```

## Authentication Methods

### Email & Password

Enabled by default:

```typescript
// Sign up
await authClient.signUp.email({
    email: "user@example.com",
    password: "password123",
    name: "John Doe",
});

// Sign in
await authClient.signIn.email({
    email: "user@example.com",
    password: "password123",
});
```

### Google OAuth

Configure in `createAuth`:

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
}
```

Use in client:

```typescript
await authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard",
});
```

## Integration with tRPC

The auth instance is passed to tRPC context for protected procedures:

```typescript
// In @plearn/trpc
export const createTRPCContext = async ({ headers }: { headers: Headers }) => {
    const session = await auth.api.getSession({ headers });

    return {
        auth,
        session,
        // ... other context
    };
};

// Protected procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
});
```

## Monorepo CLI Entry Point

Better Auth CLI can load a config explicitly via `--config`. This repository
keeps a dedicated [packages/auth/auth.ts](/Users/dec/programming/projects/plearn/packages/auth/auth.ts:1)
file that uses only relative imports so the CLI can resolve it reliably.

## Session Management

Better-auth handles sessions automatically:

- **Web**: Uses HTTP-only cookies
- **Cache**: 10-minute cookie cache for performance
- **Refresh**: `deferSessionRefresh` keeps `GET /get-session` read-only and
  lets the client refresh with a follow-up `POST` when needed
- **Database**: Drizzle join optimization is enabled for auth tables and
  relations

Session data is available via `useSession()` hook or `auth.api.getSession()` on the server.

## Extending Auth

### Add Custom Fields to User

Update the schema in `packages/db/src/schema/auth.ts`:

```typescript
export const user = pgTable("user", {
    // ... default fields
    role: text("role").default("user"),
    bio: text("bio"),
});
```

Then regenerate and migrate:

```bash
cd packages/db
pnpm db:generate:dev
pnpm db:migrate:dev
```

### Add More OAuth Providers

Update `createAuth` configuration:

```typescript
socialProviders: {
  google: { /* ... */ },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
}
```

See [better-auth providers documentation](https://better-auth.com/docs/authentication/social) for all available providers.

## Troubleshooting

### CLI can't find the Better Auth config

Make sure `packages/auth/auth.ts` exists and `DATABASE_URL` is set:

```bash
# From project root
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/plearn_dev
pnpm auth:generate
```

### Session not persisting

Check that:

1. Cookies are enabled in your browser
2. `BETTER_AUTH_SECRET` is set and at least 32 characters
3. `BETTER_AUTH_URL` matches your app's URL

## Related Packages

- `@plearn/db` - Database layer with auth schema
- `@plearn/trpc` - tRPC API with auth context
- `better-auth` - [Documentation](https://better-auth.com)
