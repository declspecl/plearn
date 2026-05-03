# @plearn/trpc

tRPC package for the Plearn monorepo.

## Responsibilities

- Defines routers and procedures.
- Creates request context with injected repositories/services.
- Exposes a React Query client for web.
- Maps validation/result errors to `TRPCError` in a reusable way.

## Import Examples

```ts
import { api } from "@plearn/trpc/client/react";
import { throwBadRequestFromValidation } from "@plearn/trpc/server/error-mapper";
import { appRouter } from "@plearn/trpc/server/root";
import { createTRPCContext } from "@plearn/trpc/server/trpc";
```

## Rules

- Keep business logic in `@plearn/core`.
- Keep routers thin: validation, auth, orchestration, response mapping.
- Inject dependencies through context instead of constructing infra in routers.
