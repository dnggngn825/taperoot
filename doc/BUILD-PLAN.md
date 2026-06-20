# Taperoot — Build Plan

> Execution checklist for the build. Companion to [DESIGN.md](./DESIGN.md).
> Each phase has: **Goal** · **Tasks** · **Exit checklist** (must all pass before the next phase).
> Build order follows the rule: **backend → server logic → API → UI**, with a cumulative click-through after each.

---

## Conventions

| Thing | Value |
|---|---|
| Runtime | Node 22 LTS; TS run via `tsx` (no build step in dev) |
| Monorepo | npm workspaces — `services/api`, `services/extraction`, `web`; shared `/proto` |
| Extraction gRPC | `localhost:50051` (`EXTRACTION_ADDR`) |
| GraphQL API | `http://localhost:4000/graphql` |
| Web | `http://localhost:5173` (dev) / `:8080` (compose preview) |
| DB | `DATABASE_URL=file:./data/taperoot.db` (dev) / `file:/data/taperoot.db` (docker) |
| Model | `MODEL=claude-haiku-4-5-20251001`; `ANTHROPIC_API_KEY` **optional** (mock fallback) |
| Backend test | `npm run test:api` — `tsx scripts/test-api.ts` against live API |
| E2E test | `npm run test:e2e` — Playwright against running app |

**Legend:** `- [ ]` task/check to tick · ✅ = the cumulative e2e gate for that phase.

**Time:** ~9 phases, ~3h total (gRPC service is the overage; see [DESIGN §16](./DESIGN.md#16-phases--time-budget)). **If over budget, the first cut is P3+P4 → an in-process extractor behind the same `ExtractionClient` interface** — drops a container, keeps the boundary.

**Dependency order:** P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9. P5 depends on P2 (data) only; P6 depends on P3/P4 (extraction) + P5 (schema).

---

## Phase 1 — Monorepo scaffold, tooling & Docker skeleton

**Goal:** a runnable TS monorepo skeleton + a working `docker compose up` that boots all three service stubs. Docker issues caught here, not in P9.

**Tasks**

- [ ] Root `package.json` with `workspaces: ["services/*", "web"]`
- [ ] Base `tsconfig.json` at root; per-package `tsconfig.json` extends it
- [ ] Root dev deps: `typescript`, `tsx`, `@playwright/test`
- [ ] Stub `package.json` + minimal entry (health/ping) for `services/api`, `services/extraction`, `web`
- [ ] Create `/proto`, `/data` (gitignored), `scripts/` (backend test), `.env.example`, `.gitignore` (`node_modules`, `data/*.db`, `.env`)
- [ ] Root scripts: `dev:api`, `dev:extraction`, `dev:web`, `test:api`, `test:e2e`, `typecheck`
- [ ] `Dockerfile` per service (multi-stage: install → copy → run via `tsx`); web uses `vite preview`
- [ ] `docker-compose.yml`: 3 services, shared network, `./data` volume for SQLite, env wiring, `EXTRACTION_ADDR`
- [ ] `.env.example`: `DATABASE_URL`, `ANTHROPIC_API_KEY` (optional), `EXTRACTION_ADDR`, ports

**Exit checklist**

- [ ] `npm install` at root succeeds; workspaces linked
- [ ] `npm run typecheck` passes (stubs ok)
- [ ] `npx playwright install` succeeds; `npm run test:e2e` runs (stub test ok)
- [ ] `docker compose up` boots all 3 services without error (stubs may just print "ok")
- [ ] `./data` volume mounts correctly; SQLite file path reachable inside `api` container
- [ ] Env vars from `.env.example` flow into containers
- [ ] Repo structure matches [DESIGN §13](./DESIGN.md#13-repository-structure)

---

## Phase 2 — Data layer (Prisma + SQLite + seed)

**Goal:** persistent schema + representative seed data covering **every eligibility case**, queryable.

**Tasks**

- [ ] Add Prisma to `services/api`; `schema.prisma` datasource = `sqlite`, `url = env("DATABASE_URL")`
- [ ] Models `User`, `Contact`, `Note`, `Conversation`, `Followup` per [DESIGN §6](./DESIGN.md#6-data-model) — `String @id @default(uuid())`, `DateTime` dates, `transcript String`, `status`/`sourceType`/`origin` as `String`
- [ ] Shared TS union consts for `status` (`open|done`), `sourceType` (`note|conversation|manual`), `origin` (`ai|user`)
- [ ] `prisma migrate dev --name init` → migration + client generated
- [ ] `seed.ts` — 1 owner user + **6 contacts** spanning all cases (below)
- [ ] Author one **2-speaker** and one **3-speaker** transcript fixture — realistic, each with a clear commitment + a relative-date phrase ("next week")
- [ ] Wire `prisma db seed`

**Seed coverage (assert each exists)**

| Contact | Notes | Conversations | Tests |
|---|---|---|---|
| A | ✔ multiple dated | ✔ 1× 2-speaker | both sources |
| B | ✔ | ✔ 1× 3-speaker | 3-speaker path |
| C | ✔ multiple dated | — | notes-only |
| D | — | ✔ 2 convos, different days | convos-only / multi-day |
| E | — | ✔ 1 convo, strong commitments | clean extraction case |
| F | — | — | **eligibility negative** (generate → `[]`) |

**Exit checklist**

- [ ] `prisma migrate dev` clean; client generated
- [ ] `prisma db seed` runs; re-running after `migrate reset` re-seeds cleanly
- [ ] Prisma Studio (or a query) shows 6 contacts + children, `followups = 0`
- [ ] ≥1 two-speaker AND ≥1 three-speaker conversation present
- [ ] Contact F has zero notes/convos
- [ ] Every `transcript` parses as valid JSON `[{speaker,text}]`

---

## Phase 3 — Extraction service: contract + gRPC server + mock (runnable spine)

**Goal:** a working gRPC `ExtractionService` that returns notes + actions via a **deterministic mock** — no LLM, no API key.

**Tasks**

- [ ] `/proto/extraction.proto` per [DESIGN §8](./DESIGN.md#8-extraction-service-grpc) — `GenerateForContact` RPC, `ExtractedNote` + `ExtractedAction` messages
- [ ] `services/extraction`: gRPC server (`@grpc/grpc-js` + `@grpc/proto-loader`) on `:50051`
- [ ] `Extractor` interface: `generate(context) → { notes: ExtractedNote[], actions: ExtractedAction[] }`
- [ ] `MockExtractor` — for each convo: generate one note (use first 15 words of summary/transcript); extract actions via action-verb heuristic; relative-date parse ("next week" → ISO date)
- [ ] `GenerateForContact` handler: request → `Extractor` → response

**Exit checklist**

- [ ] `npm run dev:extraction` boots; logs `listening :50051`
- [ ] gRPC smoke call on a context with 1 conversation → returns 1 `ExtractedNote` + ≥1 `ExtractedAction`
- [ ] Context with notes only → returns `notes: []` + ≥1 action
- [ ] Empty context → `{ notes:[], actions:[] }` (no crash)
- [ ] Passes with **no** `ANTHROPIC_API_KEY`

---

## Phase 4 — Extraction service: real Haiku 4.5

**Goal:** swap in the real model behind the same interface; auto-fallback to mock when no key.

**Tasks**

- [ ] `AnthropicExtractor` — `@anthropic-ai/sdk`, model `claude-haiku-4-5-20251001`
- [ ] Forced tool `emit_results` with JSON schema mirroring `{ notes: ExtractedNote[], actions: ExtractedAction[] }`
- [ ] Prompt per [DESIGN §9](./DESIGN.md#9-ai-extraction-logic)
- [ ] Selector: `ANTHROPIC_API_KEY` present → Anthropic, else Mock (log which)
- [ ] Parse tool output → `{ notes[], actions[] }`; tolerate missing `due_date`; tolerate empty `notes` when no conversations

**Exit checklist**

- [ ] With key: a seeded conversation yields a note + sensible actions (manual eyeball)
- [ ] Without key: falls back to mock; service still works
- [ ] Startup log states which extractor is active

---

## Phase 5 — GraphQL API: read side

**Goal:** query the contact graph + search, end-to-end from SQLite.

**Tasks**

- [ ] `services/api`: GraphQL Yoga server on `:4000/graphql`
- [ ] Pothos + Prisma plugin; builder wired to `PrismaClient`
- [ ] Types: `Contact` (+ `aiStatus`, computed `openFollowupCount`, `lastActivityAt`), `Note` (+ `origin`, `sourceConvoId`), `Conversation`, `Followup`; all enums incl. `ContactSort`, `AiStatus`, `NoteOrigin`
- [ ] `lastActivityAt` resolver — `max(latest noteDate, latest convoDate, latest followup createdAt)`; null if no activity
- [ ] `Query.contacts(q, sort)` — keyword filter over name/company/note.body/convo.summary via `lower() LIKE`; sort: `recent_update` (desc by `lastActivityAt`, nulls last) or `alphabetical` (asc by name); **default `recent_update`**
- [ ] `Query.contact(id)` — nested notes/conversations/followups
- [ ] Single owner user hardcoded from seed

**Exit checklist**

- [ ] Server boots; GraphiQL reachable at `:4000/graphql`
- [ ] `contacts` (no args) returns all 6 sorted by `lastActivityAt` desc
- [ ] `contacts(sort: alphabetical)` returns contacts A→Z by name
- [ ] `contacts(q:"<term>")` filters correctly; sort still applies
- [ ] Contact F (no activity) appears last under `recent_update` (nulls last)
- [ ] `contact(id)` returns nested notes + convos + followups in **one** query
- [ ] `openFollowupCount = 0` for all (none generated yet)
- [ ] Nested query does not N+1 (plugin batching — eyeball query log)

---

## Phase 6 — GraphQL API: write side + async generateForContact + idempotency

**Goal:** all mutations work; `generateForContact` is async (fire-and-forget gRPC), persists AI notes + followups idempotently.

**Tasks**

- [ ] `ExtractionClient` wrapper (gRPC client → `:50051`) behind an interface (in-process fallback ready)
- [ ] `Mutation.addNote` / `Mutation.updateNote` / `Mutation.updateFollowup`
- [ ] Plain-text transcript parser: `"Speaker 1: hi\nSpeaker 2: hello"` → `[{speaker, text}]`; derive `speakerCount` from distinct speakers
- [ ] `Mutation.addConversation(contactId, rawTranscript, convoDate)` — parse → persist (`summary: null`); does **not** trigger generation
- [ ] `Mutation.generateForContact(contactId, mode)` — internal helper used by both paths below; eligibility guard (no notes + no convos → stay `idle`); set `contact.aiStatus: processing`; return immediately; spawn gRPC as background promise; on resolve persist + set `aiStatus: done|failed`
- [ ] **Convo path** (explicit button): passes all conversations + all notes to extractor → produces AI notes (one per convo) + followups
- [ ] **Notes-only path** (auto-trigger): `addNote` resolver calls `generateForContact` after saving; passes **latest note only** to extractor → produces followups only (no new note entries)
- [ ] Idempotency on persist: delete `origin=ai` notes + `origin=ai, status=open` followups for contact; insert fresh; never touch `origin=manual` notes or `origin=user`/`status=done` followups
- [ ] `scripts/test-api.ts` — backend test script covering: search, addNote (auto-trigger on notes-only), generateForContact (poll until done), idempotency (generate twice = same set), updateFollowup, addConversation, eligibility guard

**Exit checklist**

- [ ] `addNote` persists with `origin: manual`; **auto-triggers generation** on notes-only contact; `aiStatus` transitions to `processing` then `done`
- [ ] `addNote` on contact with conversations → persists note only, does **not** auto-trigger
- [ ] `updateNote` persists edits; does not re-trigger generation
- [ ] `addConversation` parses raw text → structured transcript; saved with `summary: null`; does **not** trigger generation
- [ ] Explicit `generateForContact` on contact with conversations → AI notes (one per conversation, `origin: ai`) + followups appear after `done`
- [ ] Notes-only path → no AI notes created; only followups
- [ ] Generating twice → same set (no dupes); `done` followups survive; manual notes survive
- [ ] Eligibility guard: no notes + no conversations → `aiStatus` stays `idle`
- [ ] `updateFollowup` flips `open ↔ done`
- [ ] `npm run test:api` exits 0; all cases print PASS
- [ ] ✅ **e2e:** seed → add conversation (raw text) → generateForContact → poll `aiStatus` → AI notes + followups appear on contact

---

## Phase 7 — Web: contacts list + search

**Goal:** browse + search contacts in the browser, wired to GraphQL.

**Tasks**

- [ ] `web`: Vite + React + TS + urql; client → `:4000/graphql`
- [ ] Contacts page: `contacts(q, sort)`; cards (name, company, `openFollowupCount`, `lastActivityAt`)
- [ ] Debounced search box → refetch
- [ ] Sort toggle: **Recent update** / **Alphabetical** — passes `sort` arg; default `recent_update`
- [ ] Minimal CSS; loading + empty states

**Exit checklist**

- [ ] `npm run dev:web` serves; page lists 6 contacts sorted by recent update by default
- [ ] Toggling sort to alphabetical re-orders the list A→Z
- [ ] Typing in search filters the list; sort is preserved
- [ ] Open-followup count renders per card
- [ ] Empty + loading states handled

---

## Phase 8 — Web: contact detail + notetaker

**Goal:** full contact workflow — notes, follow-ups, Generate button, async polling, AI icons, meatball edit, transcript input, email draft.

**Tasks**

- [ ] Route to contact detail; fetch `contact(id)`
- [ ] **Generate button** in contact header → `generateForContact`; disabled + spinner while `contact.aiStatus = processing`; polls `contact(id) { aiStatus }` every 2s; stops polling on `done` or `failed`
- [ ] **Notes & history**: dated notes sorted by date; AI-generated notes show sparkle icon; hover → meatball menu → inline edit form → `updateNote`; `+ Note` inline form → `addNote` (auto-triggers generation on notes-only contacts — spinner appears automatically)
- [ ] **Follow-ups checklist**: tick → `done` (`updateFollowup`); AI-generated items show sparkle icon; hover → meatball → inline edit → `updateFollowup`; `+ Task` manual entry (`origin: user`); **Draft email** per item → `mailto:` prefilled with contact email + action body
- [ ] **Notetaker tab**: conversation sidebar; selecting a conversation shows 2 sub-tabs:
  - **AI Summary** — `summary` text (read-only; "No summary" if null)
  - **Transcript** — structured transcript; plain-text textarea + **Save** button → `addConversation` (no auto-trigger; user clicks Generate separately if needed)

**Exit checklist**

- [ ] Contact detail loads with notes, follow-ups, conversations
- [ ] Generate button visible; disabled while `aiStatus: processing`; re-enables on `done`
- [ ] After generate (with conversations): AI notes appear with sparkle icon; AI followups appear with sparkle icon
- [ ] After `addNote` on notes-only contact: spinner appears automatically (auto-trigger); AI followups appear after `done`; no AI notes created
- [ ] Hover AI note → meatball → edit form → save → updated body persists
- [ ] Hover AI followup → meatball → edit → save → updated description persists
- [ ] `+ Note` creates note with `origin: manual` (no sparkle)
- [ ] `+ Task` creates followup with `origin: user` (no sparkle); survives regeneration
- [ ] Transcript textarea: paste `Speaker 1: hi\nSpeaker 2: hello` → Save → conversation appears in sidebar; no auto-trigger
- [ ] `mailto:` opens prefilled with contact email + action body
- [ ] A 3-speaker transcript renders fine
- [ ] ✅ **e2e:** full click-through in browser (list → search → contact → Generate → poll → AI items appear with sparkle → hover → edit → save → tick done → mailto)

---

## Phase 9 — README + Playwright e2e + final Docker run

**Goal:** README lets a grader run the app; Playwright golden path passes; full flow verified in Docker.

**Tasks**

- [ ] `api` Dockerfile: add `prisma migrate deploy && prisma db seed` on boot
- [ ] README per [DESIGN §19](./DESIGN.md#19-readme-plan) (run steps, URLs, keyless-mock note, decisions, trade-offs, next)
- [ ] Finalize `.env.example` (`ANTHROPIC_API_KEY` optional; document all vars)
- [ ] Playwright test (`web/e2e/golden-path.spec.ts`): list loads → search → open contact → Generate → wait for AI items (sparkle visible) → meatball edit → tick followup done → Draft email → mailto opens
- [ ] Run `npm run test:api` against live services

**Exit checklist**

- [ ] Fresh `docker compose up` from clean checkout → all 3 services healthy
- [ ] API auto-migrates + seeds on first boot
- [ ] Web reachable; full flow works **in containers**
- [ ] Works with **no** `ANTHROPIC_API_KEY` (mock path)
- [ ] Works **with** key (real Haiku) — noted in README
- [ ] `npm run test:api` exits 0
- [ ] `npm run test:e2e` (Playwright) golden path passes
- [ ] README run steps, followed verbatim, succeed
- [ ] `git bundle create taperoot.bundle --all` produced for submission

---

## Definition of done (whole project)

- [ ] All 9 phase exit checklists pass
- [ ] One command (`docker compose up`) runs the app with zero extra setup and no API key
- [ ] `npm run test:api` exits 0 against running services
- [ ] `npm run test:e2e` (Playwright) passes golden path
- [ ] Search, generate (idempotent), and follow-up workflow demonstrably work
- [ ] DESIGN.md + README explain the *why*; trade-offs and next-steps written down
- [ ] Git bundle builds and is emailable

## Cut list (if time runs out, in this order)

1. P3+P4 → in-process extractor (drop gRPC container), same `ExtractionClient` interface
2. Followup edit/delete in UI (keep toggle done)
3. Search debounce polish / empty-state styling
4. Real Haiku (ship mock-only) — note it in README
