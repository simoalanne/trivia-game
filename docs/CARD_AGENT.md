# Card Agent: Proposal

Status: draft for discussion. Nothing here is implemented yet.

This replaces the "Scan physical card" feature (`convertImageToQuestionCardDraft`)
with an agent that can create, read, update and delete question cards for the
user.

**v1 is stateless.** The user gives one instruction, the agent runs once, and
the result is one **action**. The user commits that action (reviews the
proposals, or reads the summary of what was applied), then starts the next
action from scratch. There is no chat history: the model only knows what this
instruction says and what it can read through its tools. A multi-turn chat is
planned as later work (§6). It's kept out of v1 so the core idea can be
validated without the extra complexity of a conversation.

There are two modes:

- **Review mode** (default): the agent only proposes changes, and the user
  accepts, edits or rejects each one.
- **Auto mode**: the agent applies every change directly, deletes included, and
  the user gets a summary of what changed.

Work is split into phases. **Phase 1 is the backend only, plus eval tests.**
Its goal is to find out whether this is viable on local models that fit in 16 GB
of VRAM. If it only works well on cloud models, we revisit scope before building
the UI.

---

## 1. User story

> As someone who maintains the question deck, I want to describe a change in
> plain language and get it made for me, either as proposals I review first or
> applied straight away when I trust the request, so I don't have to fill in the
> card form by hand for every card.

### What the user can do

1. Open the Assistant from **Manage questions**. It stays on the same route; the
   exact layout is decided in phase 2. There's an instruction input, a preview
   panel, an **Auto-apply** toggle that is off by default, and a **Reasoning**
   slider (None · Low · Medium · High). The slider trades speed for quality:
   Off is fastest and fine for simple cards, and higher levels help with tricky
   formats or multi-card edits.
2. Write one instruction, such as:
   - "Create a medium card where players name the capital of each Nordic nation."
   - "Make a choices card where you match 5 inventions to their inventors."
   - "Fix the typo in the card about rivers."
   - "Make the hard sports cards medium and add the tag `sports`."
   - "Delete every card tagged `test`."
3. While the agent works, see a live status ("searching cards tagged
   geography…", "creating card…"), followed by a short final message from the
   agent.

**With Auto-apply off (review mode):**

4. When the agent finishes, see its proposed changes in the preview panel:
   - **Create**: the new card, rendered the way it looks in the game.
   - **Update**: the card before and after, with changed fields highlighted.
   - **Delete**: the card that will be removed.
5. For each proposal:
   - **Accept** saves it.
   - **Edit** opens the existing card form, filled in with the proposal. Saving
     the form accepts it.
   - **Reject** discards it.
   - **Accept all / Reject all** act on every open proposal at once.
6. The action is **committed** once every proposal is accepted or rejected.
   Until then, the instruction input stays locked.
7. To change a result, the user edits the proposal in the form, or rejects it
   and writes a new, more specific instruction. The agent doesn't remember the
   previous action.

**With Auto-apply on:**

4. The agent's changes, deletes included, are saved as it makes them.
5. When the agent finishes, the preview panel shows a summary of what changed:
   "Created 3 · Updated 2 · Deleted 1". Below that is a read-only list of every
   change, with an **Open** link on each card for follow-up edits.
6. If a change fails (for example, the card was modified in the meantime), the
   change appears in the summary as failed with the reason, and nothing is
   written for that change.
7. The action is committed as soon as the summary appears, and the input is free
   again.

**In both modes:**

8. Run everything against a **local model** (Ollama, LM Studio, llama.cpp) or a
   hosted one, chosen with backend env vars.

### Known limitation of stateless mode

The agent has no memory of earlier actions. An instruction like "make the card
you just created harder" won't work. The user has to say which card they mean
("make the Nordic capitals card harder"), and the agent finds it with
`searchCards`. This is the trade-off for keeping v1 simple.

### Guarantees

- In review mode, nothing changes in the database until the user clicks Accept or
  saves the form.
- In auto mode, every change the agent made appears in the final summary.
- Every change, whether proposed or applied, passes `questionCardInputSchema`
  first. Invalid cards are never shown as proposals and never written.
- An update or delete never overwrites a card that changed after the agent read
  it. In review mode, Accept warns the user. In auto mode, the change fails and
  the model is told why.

---

## 2. Proposed architecture

```
┌──────────────────────── frontend (Next.js), phase 2 ────────────────┐
│  InstructionPanel                   PreviewPanel                    │
│   instruction + Auto-apply          review: proposals → Accept / Edit / Reject
│   live status from the stream       auto:   summary of applied changes
│   RPCLink client (types inferred    Accept → existing questionsCrud calls
│   from backend router)                                              │
└───────────────▲─────────────────────────────────┬───────────────────┘
                │ oRPC RPC protocol (event iterator)  normal CRUD calls
┌───────────────┴─────────────────────────────────▼───────────────────┐
│ backend (Hono), phase 1                                             │
│  /rpc/*  RPCHandler → cardAgent.run({ instruction, autoApply,       │
│                                      reasoning })                   │
│                         └→ runCardAgent()                           │
│  cardAgent.test.ts ────────→ runCardAgent()  (no HTTP)              │
│                                                                     │
│  runCardAgent: streamText(system + 1 user message, tools,           │
│                           stopWhen: N steps)                        │
│     read tools:  searchCards, getCard, listTags      → Prisma       │
│     write tools: createCard, updateCard, deleteCard                 │
│       review → validate, return proposal, no db write               │
│       auto   → validate, write through questionCards.repo          │
│  /api/*  OpenAPIHandler (unchanged: questionsCrud, gameplay)        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Library: Vercel AI SDK v7 (decided)

- The backend uses `ai` with `@ai-sdk/openai-compatible`. oRPC streams the
  result through `streamToAsyncIteratorObject(toUIMessageStream(result))`
  (`/docs/integrations/ai-sdk`).
- There's no chat, so the frontend doesn't need `useChat`. It turns the iterator
  back into a stream with `asyncIteratorToUnproxiedDataStream` and folds it into
  a single `UIMessage` with AI SDK's `readUIMessageStream`. That message holds
  the status text and the tool outputs, i.e. the changes.
- `useChat` comes in with the later chat work.

### 2.2 Model provider and target hardware

Use one OpenAI-compatible provider, configured by env vars. This replaces the
current `OLLAMA_*` vars:

```bash
AGENT_BASE_URL=http://localhost:11434/v1   # Ollama / LM Studio / llama.cpp / OpenAI / OpenRouter
AGENT_MODEL=qwen3.5:9b
AGENT_API_KEY=                              # optional for local
AGENT_MAX_STEPS=8
AGENT_REASONING_DEFAULT=none                # AI SDK reasoning level: the slider's starting value, see §3
AGENT_TEMPERATURE=0.2
AGENT_TIMEOUT_MS=180000
```

**Target hardware:** RX 9070 (16 GB VRAM) with 16 GB DDR4. The model has to fit
entirely in VRAM, because spilling into DDR4 makes tool loops far too slow.

| Candidate | Weights (rough) | VRAM left for KV cache | Realistic context |
|---|---|---|---|
| `qwen3.5:9b` at Q4–Q6 | ~6–8 GB | ~8 GB | 16k–32k |
| `qwen3.8:27b` at an aggressive quant (IQ3/Q3) | ~12–13 GB | ~3 GB | ~8k, more with q8_0 KV cache |

The locally installed `qwen3.8:27b-q4_K_M` is 17.7 GB, so it doesn't fit in
VRAM. Testing the 27B as intended needs an IQ3/Q3 quant.

Without chat history, one action only fills the context with the system prompt,
one instruction, and that action's tool calls and results. That fits within 8k,
which is good news for the 27B. The eval tests (§4) decide between the two
models. Switching models is only an env change.

AMD note: run Ollama with ROCm or llama.cpp with Vulkan. Both expose an
OpenAI-compatible `/v1`, so nothing in the code changes.

**Ollama context length:** Ollama loads models with a 4096-token context by
default, and its OpenAI-compatible API can't change that per request. A single
create already uses about 2k tokens per step, so multi-step actions can go past
4096, and Ollama silently truncates the overflow. Set the context on the server,
either with `OLLAMA_CONTEXT_LENGTH=16384` or with a Modelfile variant that sets
`num_ctx`.

### 2.3 Transport: oRPC RPC, no contract

The agent is internal to this app. It isn't a public REST resource, so there's no
point in an OpenAPI contract in `packages/contracts`.

- **Backend:** the router is defined directly with `os` (contract-less) in
  `apps/backend/src/features/cardAgent/cardAgent.router.ts`.
  - It's mounted with an `RPCHandler` on `/rpc/*`, next to the existing
    `OpenAPIHandler` on `/api/*`.
  - The file exports `type CardAgentRouter = typeof cardAgentRouter`.
  - Input: `z.object({ instruction: z.string().trim().min(1).max(2000), autoApply: z.boolean(), reasoning: reasoningSchema.optional() })`.
    `reasoningSchema` lists the AI SDK's own `reasoning` values (`none`,
    `low`, `medium`, `high` and so on), and the server default is used when
    `reasoning` is omitted. The input is simple
    without chat, so it can have a real schema.
- **Frontend (phase 2):** a second client, `RPCLink({ url: `${baseUrl}/rpc` })`,
  typed as `RouterClient<CardAgentRouter>`. The type comes from a type-only
  import of the backend. This client is used only for the agent; CRUD keeps
  using the existing OpenAPI client.
- **Wiring the type import:**
  - Add `backend` as a `workspace:*` devDependency of `frontend`.
  - Add an `exports` entry in the backend `package.json` for a small `types.ts`
    that re-exports only `CardAgentRouter`.
  - Risk: the frontend `tsc` then type-checks backend source through that import,
    including Bun globals and Prisma's generated client. If that's noisy, add
    `@types/bun` to the frontend devDeps, or emit declarations for that one
    file.
- **Shared types:** the `CardChange` type is inferred from the backend tool
  outputs through the `UIMessage` generic.

### 2.4 Backend

New feature folder `apps/backend/src/features/cardAgent/`:

- `cardAgent.agent.ts` has `runCardAgent({ instruction, autoApply, reasoning, config, signal })`.
  - It calls `streamText` with the system prompt, a single user message, the
    tools built for the current mode, and `stopWhen`.
  - It returns the `streamText` result.
  - It has no HTTP or oRPC dependency, so the router and the eval tests share
    it.
- `cardAgent.router.ts` defines the `run` procedure, which streams the result.
- `cardAgent.tools.ts` holds `createTools({ autoApply })`, which returns six
  tools:

| Tool | Kind | Input | Output to model |
|---|---|---|---|
| `searchCards` | read | `query?`, `tags?`, `difficulty?`, `answerMode?`, `limit ≤ 20`, `offset` | `{ total, items: [{ id, prompt (≤80 chars), difficulty, tags, answerMode, entryCount }] }` |
| `getCard` | read | `id` | full card, compact JSON |
| `listTags` | read | none | `[{ tag, count }]` |
| `createCard` | write | one card (card kind format, see §3) | `{ ok: true, ids }` or `{ ok: false, errors: [...] }` |
| `updateCard` | write | `id`, `changes` (only the fields to change) | same |
| `deleteCard` | write | `ids[]` | same |

How the write tools work:
- They always validate first:
  - `updateCard` loads the card, merges `changes` into it and validates the
    result with `questionCardInputSchema`.
  - If validation fails, the tool sends short error messages back to the model,
    for example `entries[2].answer: must match one of the choices`. The model can
    then fix the card on its next step.
- In **review mode**, they return a proposal and write nothing.
- In **auto mode**, they write through the repo with an `updatedAt` check. On a
  mismatch they return `{ ok: false, errors: ["card changed since it was read"] }`.
- Either way, the full change record goes into the tool **output** in the UI
  stream. The model only gets back `ok` and an id. The change record is a
  discriminated union with `status: "proposed" | "applied" | "failed"`:
  - `{ kind: "create", changeId, card }`
  - `{ kind: "update", changeId, id, before, after, baseUpdatedAt }`
  - `{ kind: "delete", changeId, cards, baseUpdatedAt }`
- If the model updates a card more than once in a single action, those changes
  merge into one change record. Proposed deletes and updates are tracked in
  memory for the length of the request, so later reads see them. This state
  only lives as long as the request.
- The tool names don't mention the mode. One line in the system prompt tells the
  model whether its changes are proposals or applied.

**Shared write logic:** the Prisma code and `toCardData`/`toQuestionCard` move
from `questionsCrud.service.ts` into a small `questionCards.repo.ts`. The CRUD
handlers and the auto-mode tools both use it, so there is one write path.

---

## 3. Making it work on small local models

The goal is for one card creation to be fast and right the first time on a
9B–27B model within an 8k context. "Right" means the card passes validation
**and** uses the format the user meant.

### Fast, correct single-card creation (priority)

1. **Reasoning as a per-action setting.** Qwen 3.x reasons at length unless told
   not to, and that is likely most of the latency on a single card. It's also
   unknown whether tool calling works reliably with reasoning off at all, so
   neither is assumed. The user picks the level per action with the slider, and
   the default is chosen once testing shows how each level behaves.
   - Levels are the AI SDK's `reasoning` option as is: `none`, `minimal`,
     `low`, `medium`, `high` and so on. The provider maps it to the request
     (`reasoning_effort` on OpenAI-compatible servers, which Ollama accepts).
     There is no custom mapping code.
   - A server that ignores `reasoning_effort` uses its own default. Supporting
     such servers (for example llama.cpp's `enable_thinking`) is left until
     one is actually used.
   - The eval tests run once per level, to compare correctness between
     levels.
2. **Constrained tool arguments.** Use JSON-schema-constrained decoding for tool
   calls where the server supports it (llama.cpp grammars, Ollama structured
   outputs). Then the arguments always parse, and retries only deal with
   meaning, not syntax.
3. **Flat card schema for the write tools.** Tool input must be one JSON
   object, which a discriminated union isn't.
   - `questionCardFlatInputSchema` in contracts is the union with every
     variant's fields in one object, and the variant-only fields (`choices`,
     `choicesAreUnique`) optional. It's defined next to the union from the
     same pieces.
   - The invariant: a flat card is valid when `questionCardInputSchema`
     parses it. The write tools do exactly that, and the errors go back to the
     model. There is no other conversion.
4. **Make the format choice explicit.** The system prompt shows one JSON
   example per common card style: true/false, ordering and shared choices
   (all `CHOICES`), and `TEXT`.
5. **Retry budget.** A failed validation costs one step. Use about 3 steps for a
   single create, and `AGENT_MAX_STEPS` caps the whole action.
6. **Temperature around 0.2.**

### Keeping context small

Stateless mode already removes most of the context problem, because there's no
history to prune. What's left:

7. **Small, fixed toolset.** Six short tool descriptions, the same in both
   modes. The existing CRUD contracts are not exposed as tools directly.
8. **Whole-card updates.** `updateCard` takes `{ id, card }`, where `card` is
   the same flat schema as `createCard`. This costs more output tokens than a
   patch, but needs no merge logic. The card is nested on purpose: Qwen writes
   tool parameters as XML, and with the card's fields as top-level parameters
   it often wrote `<prompt>` instead of `<parameter=prompt>` right after
   `id`. Ollama then fails to parse the call and ends the stream without a
   finish reason (3/10 valid calls, against 10/10 nested).
9. **Summaries before details.** `searchCards` returns one short line per card
   and a page size of at most 20. The model calls `getCard` only for cards it
   actually needs to change. The full deck is never in context.
10. **Small model-facing tool outputs.** The write tools return `ok`/`errors` to
    the model. The full change record goes only to the UI.
11. **Short system prompt (about 300–400 tokens).** It covers the card rules,
    the current mode in one line, and tells the model to "always use tools to
    change cards, never write cards in text".

---

## 4. Phases and scope

### Phase 1: backend and viability (do first)

1. **Remove the image-scan feature:**
   - the `convertImageToQuestionCardDraft` contract and handler, and the Ollama
     code;
   - `questionImageSchema`/`questionImageContentTypes`;
   - the scan button and `scanImageToDraft`;
   - the README env section.
2. **Move the card persistence code** into `questionCards.repo.ts`.
3. **Build `runCardAgent`** with the six tools and both modes.
4. **Add the endpoint:** `cardAgent.run`, mounted with `RPCHandler` on `/rpc/*`,
   plus the exported `CardAgentRouter` type.
5. **Write the eval as tests.** `cardAgent.test.ts` runs with vitest
   (`pnpm --filter backend test`). Each test is one named instruction, the same
   as an action in the UI, so one case can be run on its own with `-t`.
   - It calls `runCardAgent` directly in review mode. The tools read an
     in-memory deck defined in the test file, passed in as the `repo` option,
     so the tests need no database.
   - Tests check only the result: the changes made (kind, answer mode, entry
     count, difficulty, tags, which cards were targeted) and, for off-topic
     requests, that no tools were called. Speed is checked by hand.
   - The model and reasoning level come from the `AGENT_*` env vars, so
     comparing models or levels means running the suite once per setting.
     `--repeats <n>` reruns every test to catch flaky ones.
6. **Test and decide.** Run the eval on `qwen3.5:9b` and the 27B quant, with one
   cloud model as a baseline. There's no pass bar set in advance, because it's
   too hard to guess before seeing real numbers. The results should answer:
   - Does tool calling work with reasoning off, or is some reasoning needed?
   - Where does a single create spend its time, and which of §3's measures
     actually help?
   - Is the quality and wait time acceptable on a local model? If not, we
     revisit scope, for example by going cloud-first, before building the UI.
   - What should the slider's default level be?

#### Phase 1 status

Steps 1–5 are implemented. Step 6 is done for `qwen3.5:9b`. The 27B still
needs a quant that fits in VRAM.

- Command: `pnpm --filter backend test`, or
  `AGENT_REASONING_DEFAULT=low pnpm --filter backend test` for another level.
- Change ids are `new-<n>` for creates and `card-<id>` for updates and deletes.
  Repeated changes to the same card in one action merge into one record.
- There's also a `cardAgent.settings` procedure, which returns the model and
  the default reasoning level for the phase 2 slider.
- Results on `qwen3.5:9b` through Ollama:
  - Tool calling works with reasoning off. Speed is acceptable at both off
    (single creates about 2.5s) and low (about 6s).
  - Most validation retries came from an answer mode that has
    since been removed from the game.
  - With reasoning off, the model sometimes writes free-text answers instead
    of shared choices for "match to a category" cards such as continents.
  - Off-topic or nonsense requests are turned down with a short reply and no
    tool calls.

### Phase 2: frontend (stateless actions)

- Add the Assistant to the existing manage-questions route. Its exact placement
  is decided then.
- Add the `RPCLink` client and the type import of the backend router.
- The instruction panel:
  - the Auto-apply toggle;
  - the Reasoning slider, defaulting to the server default and saved in
    `localStorage`;
  - the live status from the stream, including a collapsed "thinking…" section
    when reasoning is on (AI SDK streams reasoning as its own message part);
  - the input locks while an action is uncommitted.
- The preview panel:
  - In review mode, proposals with accept, edit and reject, per proposal and for
    all proposals. Edit reuses `QuestionCardModal`, and cards render with
    `TriviaCard`.
  - In auto mode, the summary of applied changes.
- The stale-card check on Accept.
- An updated README with setup steps for a local model.

---

## 5. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | AI SDK or TanStack AI | AI SDK v7 |
| 2 | Where the UI lives | Same manage-questions route. Layout is deferred to phase 2, after viability is proven |
| 3 | Chat vs single actions | v1 is stateless: one instruction is one action, which the user commits before the next. Chat is later work (§6) |
| 4 | Batch creation | One card per call. Optimize speed and first-try correctness first |
| 5 | Target models | `qwen3.5:9b` or `qwen3.8:27b` at an aggressive quant, on an RX 9070 (16 GB VRAM). Must fit in VRAM |
| 6 | Deletes in auto mode | Fully automatic, deletes included |
| 7 | Transport | oRPC RPC with types inferred from the backend router, no contract |
| 8 | Response time vs quality | User-facing Reasoning slider per action (the AI SDK's levels, from none to high). The server default comes from env and is chosen after testing |
| 9 | Phase 1 pass bar | None set in advance. The eval tests check results only; speed was judged by hand |

### Open questions

None right now. The next questions come from the phase 1 eval results.

---

## 6. Later work

### Chat mode (multi-turn)

Chat turns stateless actions into a conversation, so the agent remembers what
the user has been doing ("make the second one harder", "now do the same for
rivers"). Most of v1 carries over as-is: the tools, both modes, the change
records and the preview panel. Chat adds:

- **Transport:** the procedure input becomes `{ messages: UIMessage[], autoApply, drafts }`,
  typed with `type<>()`, because `useChat` owns the message shape. On the
  frontend, `useChat` replaces `readUIMessageStream`, with a custom transport:
  `asyncIteratorToUnproxiedDataStream(await agentClient.chat(...))`.
- **Proposals on a new message:** they're **replaced** (decided). The new reply's
  proposals replace the earlier ones in the preview.
- **Refining unsaved proposals.** "Make it harder" has to edit a card that
  doesn't exist in the database yet. There are two options.

  **A. In-memory draft ids (recommended)**
  1. Each proposal gets a short id: `d1`, `d2`, and so on.
  2. The frontend sends the open proposals back with the next message as
     `drafts`.
  3. The server lists them for the model in one line each, for example
     `d1: create · "Nordic capitals" · TEXT · MEDIUM`.
  4. `getCard` and `updateCard` accept `d1` the same way as a numeric id.
  5. A refined draft keeps its id and replaces the old version in the preview.

  Pros: no schema change, no gameplay filtering, no orphaned rows, and the
  server stays stateless. Cons: drafts are lost on page reload, and the frontend
  has to send them with each request.

  **B. Store drafts in the database with a status flag**
  1. Add a `status` column to `TriviaCard`, with the values `PENDING` and
     `APPROVED`.
  2. Review-mode creates are saved as `PENDING`. Accept flips them to
     `APPROVED`, and Reject deletes them.

  Pros: every id is a plain database id, and drafts survive a reload. Cons:
  gameplay (`cardSource.ts`) and the CRUD list have to filter out `PENDING`
  cards, "replace" needs cleanup of `PENDING` rows, and proposed **updates** to
  existing cards would still need in-memory handling.

  Open question at that point: A or B.
- **History pruning on every request:**
  - Keep the system prompt, the last N user and assistant turns, and the final
    text of earlier turns.
  - Drop old tool calls and results with `pruneMessages`.
  - Pass open drafts as one line each, not as full tool outputs.
  - The budget comes from `AGENT_CONTEXT_TOKENS`, using a rough chars/4
    estimate.

  This matters most for the 27B and its ~8k context.
- **Eval:** add multi-turn cases, such as refining a draft or referring to the
  previous turn.

### Other

- Showing proposals while the agent is still running. AI SDK already streams
  partial tool input.
- Saving action or chat history, or keeping drafts across page reloads.
- Undo for auto-applied changes or accepted proposals. Change records keep
  `before`, so undo is a natural follow-up.
- Batch creation in one tool call.
- Image input, i.e. bringing scanning back as one tool of a multimodal agent.
- Auth and per-user permissions.
- Agent access to gameplay or sessions.
