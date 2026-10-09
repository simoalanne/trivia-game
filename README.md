# Trivia Game

Turn-based multiplayer trivia game built as a TypeScript monorepo with:

- `apps/frontend`: Next.js frontend
- `apps/backend`: Hono + WebSocket backend running on Bun
- `packages/contracts`: shared oRPC API contract and WebSocket message schemas

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

### Card agent (optional)

The card agent creates, updates and deletes question cards from plain-language
instructions. It works with any OpenAI-compatible server, including local ones
(Ollama, LM Studio, llama.cpp). See [docs/CARD_AGENT.md](docs/CARD_AGENT.md).

Set these backend environment variables:

```bash
AGENT_MODEL=qwen3.5:9b
```

Optional:

```bash
AGENT_BASE_URL=http://localhost:11434/v1   # default: Ollama
AGENT_API_KEY=
AGENT_REASONING_DEFAULT=none                # AI SDK reasoning: none | minimal | low | medium | high | ...
AGENT_MAX_STEPS=8
AGENT_TEMPERATURE=0.2
AGENT_TIMEOUT_MS=180000
```

Ollama loads models with a 4096-token context by default, which multi-step
actions can exceed. Raise it on the Ollama server, for example
`OLLAMA_CONTEXT_LENGTH=16384 ollama serve`.

Run the agent tests against the configured model. They use their own
in-memory cards and need no database:

```bash
pnpm --filter backend test
pnpm --filter backend test -t "pick card for continents"   # one case
```

Run the frontend:

```bash
pnpm --filter frontend dev
```
