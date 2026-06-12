# Trivia Game

Turn-based multiplayer trivia game built as a TypeScript monorepo with:

- `apps/frontend`: Next.js frontend
- `apps/backend`: Express + WebSocket backend
- `packages/contracts`: shared contract-first API abstraction using https://www.npmjs.com/package/@contract-first-api/** packages

## Features

- create a game
- join a game
- persist the current player session in a browser cookie
- ready up in the lobby
- start a game when players are ready
- play turn-based trivia rounds over WebSockets
- load trivia cards from Postgres through Prisma

## Run Locally

Install dependencies from the repo root:

```bash
pnpm install
```

Start Postgres:

```bash
docker compose -f apps/backend/docker-compose.yml up -d db
```

Seed the database:

```bash
pnpm --filter backend exec prisma db seed
```

Run the backend:

```bash
pnpm --filter backend start
```

Run the frontend:

```bash
pnpm --filter frontend dev
```
