# Agents

This project is a real-time multiplayer trivia game. Players can join a game session, answer trivia questions, and compete for the highest score.

## Architecture

This repo is a TypeScript monorepo managed with `pnpm`.

Current stack:

- `apps/frontend`: Next.js + React frontend
- `apps/backend`: Hono backend with WebSocket gameplay endpoints running on Bun
- `apps/backend/prisma`: Prisma schema, seed script, and seed data
- `packages/contracts`: shared `zod`-based API and WebSocket contracts
- PostgreSQL for persisted trivia card data
