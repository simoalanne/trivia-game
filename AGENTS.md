# Agents

## Architecture

This repo is a TypeScript monorepo managed with `pnpm`.

Current stack:

- `apps/frontend`: Next.js + React frontend
- `apps/backend`: Express backend with WebSocket gameplay endpoints
- `apps/backend/prisma`: Prisma schema, seed script, and seed data
- `packages/contracts`: shared `zod`-based API and WebSocket contracts
- PostgreSQL for persisted trivia card data

At a high level:

- the frontend talks to the backend through a shared contract tree
- the backend mounts those contracts onto Express and WebSocket routes
- Prisma is only used in the backend
- active gameplay sessions are currently held in backend memory
- trivia cards are loaded from Postgres

## Contract-First Abstraction

This project uses a custom `contract-first-api` abstraction to achieve type safety and DRYness end-to-end across the frontend and backend. The shared contract package defines REST and WebSocket API contracts in a single source of truth, and the frontend/backend build typed clients and route handlers from those contracts.

The main practical point for agents is that this gets much easier once there is existing repo code to mimic. Prefer following established local patterns over inventing new usage shapes. Conceptually the abstraction is still close enough to tools like `ts-rest` that prior contract-first experience transfers reasonably well, even if the exact syntax and helpers differ.

In this repo that means:

- contracts are defined in [packages/contracts/src](packages/contracts/src)
- backend route registration starts in [apps/backend/src/index.ts](apps/backend/src/index.ts)
- frontend API client setup lives in [apps/frontend/src/lib/apiClient.ts](apps/frontend/src/lib/apiClient.ts)

Important local docs:

These should be present in `node_modules` after running `pnpm install` from the repo root. The actual paths may vary depending on how pnpm decides to link the packages, but they should be somewhere under `node_modules/.pnpm/`:

- `@contract-first-api/core`:
  `node_modules/.pnpm/@contract-first-api+core@4.4.0/node_modules/@contract-first-api/core/README.md`
- `@contract-first-api/express`:
  `node_modules/.pnpm/@contract-first-api+express@4.4.0_express@5.2.1_ws@8.21.0/node_modules/@contract-first-api/express/README.md`
- `@contract-first-api/api-client`:
  `node_modules/.pnpm/@contract-first-api+api-client@4.4.0/node_modules/@contract-first-api/api-client/README.md`

If you cannot find these files locally, the online documentation is also available on GitHub and per package on npm:
Github:
  - `https://github.com/simoalanne/contract-first-api`

NPM packages:
- `@contract-first-api/core`: https://www.npmjs.com/package/@contract-first-api/core
- `@contract-first-api/api-client`: https://www.npmjs.com/package/@contract-first-api/api-client
- `@contract-first-api/react-query`: https://www.npmjs.com/package/@contract-first-api/react-query
- `@contract-first-api/openapi`: https://www.npmjs.com/package/@contract-first-api/openapi
- `@contract-first-api/express`: https://www.npmjs.com/package/@contract-first-api/express


## Working Expectations

- prefer extending the shared contracts before adding new backend/frontend API behavior
- keep frontend/backend message shapes aligned through `packages/contracts`
- treat Prisma and database concerns as backend-only concerns
- keep `README.md` focused on the current app state and local run instructions
