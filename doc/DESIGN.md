# Taperoot — Design Document

> *What grows after the tap.*
> Post-tap relationship memory + follow-up for Blinq.

| | |
|---|---|
| **Author** | Danny Nguyen |
| **Date** | 2026-06-20 |
| **Status** | Design locked — ready to build |
| **Brief** | Blinq take-home: track contacts + context so following up is easy, not forgotten |
| **Time budget** | ~3 hours (see [Phases](#16-phases--time-budget)) |

---

## 1. Problem & product interpretation

A Blinq tap is the *handshake* — the start of a relationship, not the relationship. Today, everything after the tap (who they were, what you discussed, what you said you'd do) is left to memory. Blinq's thesis: the users who win are the ones who **follow up**.

Blinq already ships a feature that **records a conversation and returns a diarised transcript (`Speaker 1/2/3`) + an AI summary**. That solves *capture*. The unsolved problem is the **layer on top**: turning that raw conversation (and any notes the user jots down) into **concrete follow-up actions** the user won't forget.

**Taperoot is that layer.** It takes the context Blinq already captures and answers one question per contact: *"What do I need to do next with this person?"*

This is deliberately built *on* Blinq's existing moat (the recorder), not next to it.

---

## 2. Scope

### In scope
- A pre-seeded single user with a pre-seeded contact list (DB of contacts already exists).
- Per contact, two context sources:
  - **Notes** the user adds about that person on a specific date.
  - **Conversations** (transcript + AI summary) logged under that person, possibly on different days.
- **AI follow-up extraction**: read a contact's notes + conversations → produce concrete follow-up actions (with inferred due dates).
- **Search** across contacts (name, company, note body, conversation summary).
- A React UI to browse contacts, read their timeline, generate follow-ups, tick them off, and draft an email.

### Out of scope (with rationale)
| Out | Why |
|---|---|
| **Speaker → identity resolution** | A 2-person convo *could* be guessed, a 2–3-person one can't. We do not resolve who `Speaker N` is at all. A conversation is logged wholesale under a contact; we never need to know which speaker is the contact. |
| Auth / multi-user | Single seeded owner. Not the interesting slice. |
| Real Blinq recorder integration | We define the **input contract** (transcript JSON) and seed fixtures instead. |
| Sending email | We generate a draft and open a `mailto:` — no SMTP. |
| Semantic search | Keyword (SQL `LIKE`) is enough to prove the slice. |
| Reminders / notifications | We store `due_date` + show a "due" state; no scheduler. |

### Eligibility rule
Follow-ups are only generated for a contact that has **≥1 dated note OR ≥1 conversation**. A contact with no context is just a name — nothing to extract.

---

## 3. Assumptions

1. The contact DB already exists and is seeded.
2. A conversation = anonymous transcript (`Speaker 1/2/3`) + AI summary, **already produced by Blinq**.
3. A conversation is linked to exactly one contact (the user logged it under that person). Other speakers may be present; we don't model them.
4. **We never resolve speaker identity** — the whole conversation is treated as one blob of relationship context. (This is the key simplification — it removes diarisation-mapping from the build entirely.)
5. Because we don't resolve speakers, we do **not** split commitments into "mine vs theirs". We extract follow-up *actions* for the relationship as a whole.
6. We have the contact's email (it came from their Blinq card) → we can prefill a follow-up draft.
7. AI may be wrong; extracted follow-ups are editable and deletable by the user.

---

## 4. Open questions for the PM

- Does the recorder ever output speaker identity, or always `Speaker N`? (Assumed always anonymous — if not, contact auto-fill becomes possible.)
- One conversation = one contact, or should a group convo fan out to several contacts? (Assumed one contact per convo for now.)
- Is "follow up" a reminder, or do we eventually send the message for the user?
- Should "their" commitments (things *they* promised) nudge *them*? (Out of scope, but a strong next step.)
- Retention/privacy: transcripts are sensitive. Who can see them, how long do we keep them?

---

## 5. Architecture

Three runtime services + an embedded database. The seam that matters: **AI extraction is its own service, reached over gRPC.**

```
┌─────────────┐  GraphQL / HTTP   ┌─────────────────────┐   gRPC    ┌──────────────────────┐
│ Web         │ ────────────────► │ API                 │ ────────► │ Extraction Service   │
│ React+urql  │ ◄──────────────── │ GraphQL Yoga+Pothos │ ◄──────── │ gRPC, Haiku 4.5      │
└─────────────┘                   │ + Prisma            │           └──────────┬───────────┘
                                  └─────────┬───────────┘                      │ HTTPS
                                            │ Prisma                           ▼
                                            ▼                          ┌────────────────┐
                                   ┌─────────────────┐                 │ Anthropic API  │
                                   │ SQLite (file)   │                 │ (or mock mode) │
                                   └─────────────────┘                 └────────────────┘
```

### Why these boundaries
- **GraphQL at the edge** — the data is a *graph* (contact → notes / conversations / followups). One nested query feeds the detail page; the same schema, with field selection, feeds the lean list page. No over/under-fetching. (See [§7](#7-graphql-api).)
- **gRPC for extraction** — `generateFollowups` is **service-to-service**, not client-facing. The API service asks the Extraction service to do the LLM work. A typed proto contract, binary transport, and an independent deploy/scale unit suit a step that is **slow, bursty, and swappable** (today Haiku 4.5; tomorrow a fine-tuned model or a different vendor). The client never speaks gRPC — only the API → Extraction hop does.
- **SQLite, embedded** — a single-user PoC has one writer and no concurrency needs. SQLite removes a whole container and connection-pool concern, and since we never query *inside* the transcript JSON (no speaker resolution), Postgres `jsonb` would buy nothing. (See [§6](#6-data-model).)

### Honest trade-off (and fallback)
For a 3-hour build, a separate gRPC microservice is *more* than strictly necessary — it costs one extra container, a `.proto`, and a generated client. It's chosen to show a clean service boundary at the one place the system genuinely has a seam (the model call). **Fallback if time runs short:** the Extraction service is consumed through a single `ExtractionClient` interface in the API. That interface can be backed by either the gRPC client *or* an in-process module with zero call-site changes — so the boundary survives even if the network hop doesn't.

---

## 6. Data model

SQLite, via Prisma. Five tables.

```
users (1) ───< contacts (1) ───< notes
                       (1) ───< conversations
                       (1) ───< followups
```

| Table | Field | Type | Notes |
|---|---|---|---|
| **users** | id | String (uuid) PK | one seeded owner |
| | name | String | |
| | email | String | |
| **contacts** | id | String (uuid) PK | |
| | userId | String FK→users | |
| | name | String | |
| | company | String? | |
| | role | String? | |
| | email | String? | from their Blinq card; used for drafts |
| | aiStatus | String (`idle`\|`processing`\|`done`\|`failed`) | generation status; default `idle`; client polls while `processing` |
| | createdAt | DateTime | |
| **notes** | id | String (uuid) PK | |
| | contactId | String FK→contacts | |
| | body | String | |
| | noteDate | DateTime | the date the user is recording about |
| | origin | String (`manual`\|`ai`) | drives AI icon + meatball edit visibility |
| | sourceConvoId | String? | FK→conversations; set when `origin = ai`, links note to the convo it was generated from |
| | createdAt | DateTime | |
| **conversations** | id | String (uuid) PK | |
| | contactId | String FK→contacts | |
| | convoDate | DateTime | when the conversation happened |
| | summary | String? | Blinq's AI summary; null for manually-added convos |
| | transcript | String (JSON) | `[{ speaker, text }]`, parsed with zod at the boundary |
| | speakerCount | Int | 2 or 3 |
| | createdAt | DateTime | |
| **followups** | id | String (uuid) PK | |
| | contactId | String FK→contacts | |
| | description | String | the action |
| | dueDate | DateTime? | inferred ("next week") or null |
| | status | String (`open`\|`done`) | |
| | sourceType | String (`note`\|`conversation`\|`manual`) | provenance |
| | sourceId | String? | the note/conversation it came from |
| | origin | String (`ai`\|`user`) | drives AI icon + idempotency |
| | createdAt | DateTime | |

**SQLite/Prisma mapping notes** — SQLite has no native `uuid`, `enum`, `date`, or `jsonb`, so:
- ids → `String @default(uuid())`.
- `status` / `sourceType` / `origin` → `String` backed by a **TS/zod union** (Prisma enums aren't supported on SQLite).
- dates → `DateTime` (stored ISO).
- `transcript` → `String` holding JSON, validated/parsed with zod when read or written. We never query inside it (no speaker resolution).

---

## 7. GraphQL API

Code-first with **Pothos** on **GraphQL Yoga**, resolvers typed off the Prisma client (Pothos Prisma plugin). End-to-end TS types, no SDL drift.

```graphql
scalar JSON
scalar Date

type Query {
  "List + keyword search over name, company, note body, convo summary"
  contacts(q: String, sort: ContactSort): [Contact!]!
  "Full contact graph — client polls contact(id){aiStatus} while generating"
  contact(id: ID!): Contact
}

type Mutation {
  addNote(contactId: ID!, body: String!, noteDate: Date!): Note!
  updateNote(id: ID!, body: String, noteDate: Date): Note!

  """
  Testing/demo path — accepts plain-text transcript ('Speaker 1: ...\nSpeaker 2: ...'),
  parses to structured JSON, saves conversation. summary is null (AI summary is out of scope).
  Does NOT auto-trigger generation — user clicks Generate on the contact profile explicitly.
  """
  addConversation(contactId: ID!, rawTranscript: String!, convoDate: Date!): Conversation!

  """
  Async — sets contact.aiStatus: processing, fires gRPC in background, returns immediately.
  Reads ALL conversations + notes for the contact.
  With convos: generates note entries (one per convo, dated to convo date) + followups.
  Notes only (no convos): generates followups only.
  """
  generateForContact(contactId: ID!): Contact!

  updateFollowup(id: ID!, status: FollowupStatus, description: String): Followup!
}

type Contact {
  id: ID!
  name: String!
  company: String
  role: String
  email: String
  aiStatus: AiStatus!              # poll while processing
  notes: [Note!]!
  conversations: [Conversation!]!
  followups: [Followup!]!
  openFollowupCount: Int!          # computed — for the list page
  lastActivityAt: DateTime         # computed — max(latest noteDate, latest convoDate, latest followup createdAt)
}

type Note {
  id: ID!
  body: String!
  noteDate: Date!
  origin: NoteOrigin!              # manual | ai — drives AI icon in UI
  sourceConvoId: ID                # set when origin = ai
}

type Conversation {
  id: ID!
  summary: String                  # null for manually-added convos
  transcript: JSON!
  convoDate: Date!
  speakerCount: Int!
}

type Followup { id: ID! description: String! dueDate: Date status: FollowupStatus! sourceType: SourceType! origin: Origin! }

enum FollowupStatus { open done }
enum SourceType     { note conversation manual }
enum Origin         { ai user }
enum NoteOrigin     { manual ai }
enum ContactSort    { recent_update alphabetical }
enum AiStatus       { idle processing done failed }
```

> Note: GraphQL enums are fine at the API layer even though the DB stores them as strings — Pothos maps the string ↔ enum at the resolver boundary.

**Why GraphQL fits:** `contact(id)` returns the full contact graph in one round trip; client polls the same query for `aiStatus` while generation runs — no separate poll endpoint needed. `generateForContact` is an async command that returns immediately with `aiStatus: processing`.

---

## 8. Extraction service (gRPC)

A small Node gRPC server. One method.

```proto
syntax = "proto3";
package extraction.v1;

service ExtractionService {
  rpc GenerateForContact(GenerateForContactRequest) returns (GenerateForContactResponse);
}

message GenerateForContactRequest {
  string contact_id      = 1;
  ContactContext context  = 2;
}

message ContactContext {
  string name    = 1;
  string company = 2;
  string role    = 3;
  repeated NoteCtx         notes         = 4;
  repeated ConversationCtx conversations = 5;
}

message NoteCtx {
  string id        = 1;
  string body      = 2;
  string note_date = 3;  // ISO date
}

message ConversationCtx {
  string id         = 1;
  string convo_date = 2;  // ISO date
  string summary    = 3;  // empty string if null
  string transcript = 4;  // JSON string [{ speaker, text }]
}

message GenerateForContactResponse {
  repeated ExtractedNote   notes   = 1;  // one per conversation; empty if no convos
  repeated ExtractedAction actions = 2;
}

message ExtractedNote {
  string convo_id = 1;  // source conversation id
  string text     = 2;
  string date     = 3;  // ISO date — matches convo_date
}

message ExtractedAction {
  string description = 1;
  string due_date    = 2;  // ISO date, empty if none
  string source_type = 3;  // "note" | "conversation"
  string source_id   = 4;
}
```

**Library choice:** `@grpc/grpc-js` + `@grpc/proto-loader` — dynamic proto loading, no codegen build step. Call sites stay typed via a hand-written `ExtractionClient` wrapper (the same interface used for the in-process fallback in [§5](#honest-trade-off-and-fallback)).

### `generateForContact` async flow

1. Client → GraphQL `generateForContact(contactId)`.
2. API sets `contact.aiStatus: processing`, returns immediately.
3. API loads all notes + conversations for the contact (Prisma), fires gRPC `GenerateForContact(context)` as a **background promise** (not awaited in HTTP response).
4. Extraction service calls **Haiku 4.5** with a forced tool → `{ notes[], actions[] }`.
5. gRPC resolves → API applies idempotent persistence (§10) → sets `contact.aiStatus: done` (or `failed`).
6. Client polls `contact(id) { aiStatus }` every 2s → when `done`, Generate button re-enables; AI items appear inline.

### Generation rules

| Context available | Trigger | AI reads | AI produces |
|---|---|---|---|
| ≥1 conversation | Explicit **Generate** button | All conversations + all notes | One `Note` per conversation (dated to `convoDate`) + followups |
| Notes only (no conversations) | **Auto** — fires after every `addNote` | **Latest note only** | Followups only — no new note entries (user's own notes stay untouched) |
| Neither | — | — | Nothing; `aiStatus` stays `idle` (eligibility guard) |

**Why latest note only (notes-only path):** older notes already have follow-ups from a prior run. reading only the new note avoids re-extracting stale context and keeps generation fast.

### Idempotency (§10 updated)

On generate: delete `origin = ai` notes + `origin = ai, status = open` followups for this contact, then insert fresh ones. Never touch `origin = manual` notes or `origin = user` / `status = done` followups.

---

## 9. AI extraction logic

- **Model:** `claude-haiku-4-5-20251001` — fast and cheap, right for a demo; swappable to `claude-opus-4-8` by changing one constant.
- **SDK:** `@anthropic-ai/sdk`, Messages API with a forced tool.
- **Structured output:** the model is forced to call an `emit_followups` tool whose JSON schema mirrors `ExtractedAction`. No free-text parsing.
- **Prompt shape:** *"You are helping a Blinq user follow up. Given this contact and the notes + conversation summaries/transcripts below, extract concrete next-step actions the user should take. Infer a due date when language implies one ('next week', 'by Friday'). Attribute each action to the note or conversation it came from. Do not invent actions that aren't supported by the context."*
- **Input:** name/company/role + every note (body + date) + every conversation (summary + transcript + date).
- **Mock mode (important for graders):** the extractor sits behind an `Extractor` interface. With no `ANTHROPIC_API_KEY`, a deterministic heuristic extractor runs (regex over summaries/notes for action-ish phrases + relative-date parsing). **The whole app runs and demos end-to-end without an API key.**

---

## 10. Idempotency of `generateFollowups`

Re-running with no new context must not create duplicates (a hard project constraint).

On generate:
1. Delete the contact's existing followups where `origin = ai AND status = open`.
2. Insert the freshly extracted actions as `origin = ai`.
3. **Never touch** `status = done` (history) or `origin = user` (hand-edited).

So re-running over unchanged context converges to the same set; adding a note then re-running adds only the new action.

---

## 11. Frontend

Vite + React + TS, **urql** client. Minimal hand CSS — clarity over polish (UI is the last priority).

- **Contacts page** — search box (debounced → `contacts(q, sort)`) + sort toggle (Recent / A–Z) + cards (name, company, open-followup count).
- **Contact detail page**
  - Header: name, company, role, email + **Generate** button.
  - **Generate button** → `generateForContact` → sets `aiStatus: processing`; button shows spinner + disabled while polling; re-enables on `done` or `failed`.
  - Client polls `contact(id) { aiStatus }` every 2s while `processing`.
  - **Notes & history** — dated notes sorted by date. AI-generated notes show a sparkle icon. Hover any note → meatball menu → inline edit → `updateNote`. `+ Note` button for manual entry.
  - **Follow-ups** checklist — tick → `done`; hover → meatball → inline edit → `updateFollowup`. AI-generated followups show sparkle icon. `+ Task` for manual entry.
  - **Draft email** per follow-up → `mailto:` prefilled with contact email + action body.
- **Notetaker tab** (per conversation) — two sub-tabs:
  - **AI Summary** — `summary` text (read-only; show "No summary" if null).
  - **Transcript** — structured transcript display; plain-text textarea (`Speaker 1: ...\nSpeaker 2: ...`) + **Save** button → `addConversation` (saves only, does not trigger generation).

Frontend operation types via graphql-codegen are a nicety; manual types are fine if time is tight.

---

## 12. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Brief constraint |
| Runtime | Node 22 LTS, TS run via `tsx` (no build step) | Boring + reliable; "must run on their machine" beats fancy |
| Monorepo | npm workspaces | Ships with Node, no extra global tool to install |
| DB | **SQLite** | Single-user PoC; zero infra; one fewer container; we never query inside transcript JSON so Postgres `jsonb` buys nothing |
| ORM | Prisma (+ Pothos Prisma plugin) | Typed client, migrations, seed; plugin → typed nested resolvers |
| API | GraphQL Yoga + Pothos (code-first) | Graph-shaped data; end-to-end TS types; no SDL drift |
| Internal RPC | gRPC — `@grpc/grpc-js` + `@grpc/proto-loader`, typed via `ExtractionClient` wrapper | Service-to-service seam; dynamic proto load = no codegen step; wrapper keeps call sites typed |
| Model | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), `@anthropic-ai/sdk`, forced-tool output | Fast + cheap for a demo; one-line swap to Opus |
| Mock | Deterministic heuristic extractor (no key needed) | App runs keyless — helps grader run it |
| Validation | zod (transcript JSON boundary) | Guards the one untyped boundary |
| Web | Vite + React + TS + urql | Light, hook-based GraphQL client |
| Styling | Minimal hand CSS (Tailwind optional) | UI is last; clarity over polish |
| Tests | Vitest | One runner across packages |
| Run | docker-compose: api + extraction + web | Brief requires easy local run; SQLite on a mounted volume |

### Why Prisma (over Drizzle / Kysely / raw SQL)

- **The Pothos Prisma plugin is the deciding factor.** The GraphQL story rests on one nested read (contact → notes + conversations + followups, [§7](#7-graphql-api)). The plugin maps `schema.prisma` → GraphQL types, gives fully-typed resolvers, and resolves those relations efficiently (batches to avoid N+1) — so the graph read works without hand-rolled dataloaders.
- **One tool, three jobs** — schema, migrations (`migrate dev`), and seed all from a single `schema.prisma`. Fast to stand up inside a 3h budget.
- **Typed end-to-end** — DB → resolver types with no manual mapping.
- **Trade-off:** Drizzle is lighter (no generated engine binary, smaller image, faster cold start) and SQL-first; for a larger or perf-sensitive service it'd be a real contender. Here Prisma's Pothos integration + DX outweigh the weight for a time-boxed PoC, and a later swap stays contained to the data layer.

---

## 13. Repository structure

```
taperoot/
├─ doc/
│  └─ DESIGN.md                # this file
├─ package.json                # npm workspaces root
├─ proto/
│  └─ extraction.proto         # shared contract: API ↔ Extraction
├─ services/
│  ├─ api/                     # GraphQL Yoga + Pothos + Prisma + gRPC client
│  │  ├─ prisma/schema.prisma  # SQLite datasource
│  │  ├─ prisma/seed.ts        # user, contacts, notes, 2- & 3-speaker convo fixtures
│  │  └─ src/
│  └─ extraction/              # gRPC server + Anthropic/mock extractor
│     └─ src/
├─ web/                        # Vite + React + urql
├─ data/                       # SQLite db file lives here (mounted volume, gitignored)
├─ docker-compose.yml          # api, extraction, web
├─ .env.example                # ANTHROPIC_API_KEY (optional), DATABASE_URL, ports
└─ README.md
```

---

## 14. Running it (Docker)

`docker compose up` starts three services; the SQLite file lives on a mounted volume (`./data`).

| Service | Role |
|---|---|
| `extraction` | gRPC extraction server (Haiku 4.5 or mock) |
| `api` | GraphQL API; runs `prisma migrate deploy` + seed on boot; reads/writes the SQLite file |
| `web` | React app (vite preview) |

- `.env.example` documents every var. **`ANTHROPIC_API_KEY` is optional** — omit it and the mock extractor runs, so the app works out of the box.
- `DATABASE_URL` points at the mounted SQLite file (e.g. `file:/data/taperoot.db`).
- README will list the exact URLs (GraphQL playground, web app) and a sample flow to exercise.

---

## 15. Testing strategy

No unit test framework. Two lightweight layers instead:

**1. Backend test script (`scripts/test-api.ts`, run via `tsx`)**
- Hits the live GraphQL API directly with fetch requests against the running server
- Covers the critical paths: search, addNote (+ auto-trigger), generateForContact (+ poll), idempotency (generate twice = same set), updateFollowup, addConversation
- Prints `PASS` / `FAIL` per case; exits 1 on any failure
- Run with: `npm run test:api` — requires API + extraction services to be up

**2. Playwright e2e (`web/e2e/`)**
- Tests the golden path in a real browser against the running app
- Covers: list → search → contact detail → Generate → AI items appear (sparkle) → meatball edit → tick done → mailto opens
- Run with: `npm run test:e2e` — requires all three services (docker compose or dev)

**Trade-off:** no mocked unit tests = faster MVP, less coverage depth. The backend script catches broken API contracts; Playwright catches broken UI flows. Sufficient for a PoC submission.

---

## 16. Phases & time budget

Build order: **backend → server logic → API → UI**, with a cumulative click-through after each.

| # | Phase | ~Time | Done when |
|---|---|---|---|
| 1 | Scaffold + Docker skeleton + **Playwright install** | 30m | `docker compose up` boots 3 stubs; Playwright runs |
| 2 | Prisma schema + migrate + seed (2- & 3-speaker fixtures) | 20m | Seeded SQLite queryable |
| 3 | Extraction gRPC spine: proto, server, mock extractor | 25m | gRPC returns notes + actions; keyless |
| 4 | Extraction: real Haiku 4.5 + auto-fallback to mock | 20m | With key → real; without → mock |
| 5 | GraphQL API reads: Pothos schema + Prisma resolvers + search | 25m | GraphQL playground: list / detail |
| 6 | GraphQL API writes + generateForContact + backend test script | 30m | `npm run test:api` green |
| 7 | React UI: contacts list + search | 20m | List + search live in browser |
| 8 | React UI: contact detail + generate + notetaker + Playwright e2e | 25m | Playwright golden path passes |
| 9 | README + final e2e in Docker | 15m | `docker compose up` → full flow |

**Total ≈ 190 min (~3h10).** The gRPC service is the main cost. **First cut if needed:** collapse Extraction to an in-process module behind the same `ExtractionClient` interface (drops the 3rd container, keeps the boundary). Semantic search and codegen are already deferred.

---

## 17. Trade-offs accepted

- **SQLite vs Postgres** — less "prod-like", but zero infra and fewer containers for a single-user PoC; Prisma makes the swap to Postgres a one-line datasource change. We lose nothing because we never query inside the transcript JSON.
- **gRPC microservice vs in-process call** — extra infra for one model call, accepted to demonstrate a clean seam at the system's one real boundary; in-process fallback documented.
- **No speaker resolution** — we lose "who promised what", but gain a dramatically smaller, sharper build that still delivers the core value (follow-ups).
- **Keyword search, not semantic** — good enough for the slice; semantic is a clear next step.
- **Mock extractor** — slightly more code, but makes the app runnable without a key, which the "we need to run it" constraint rewards.
- **mailto vs send** — no email infra; the draft is the valuable part.

---

## 18. What's next (with more time)

1. **Speaker → contact resolution** — start with the 2-person case (one speaker is the owner), then group convos; attribute "mine vs theirs" commitments.
2. **Nudge *them*** — surface things the *contact* promised and remind them.
3. **Real Blinq recorder hook** — replace fixtures with the live transcript feed.
4. **Scheduled reminders** — act on `due_date` (push/email) instead of just displaying it.
5. **Semantic search** — embeddings over notes + summaries; "who did I meet in fintech?"
6. **Contact dedupe / merge** — same person across multiple conversations.
7. **Send the follow-up** — real email integration beyond `mailto:`.
8. **Postgres + multi-user + auth** — the obvious productionisation path.

---

## 19. README plan

The README (read first by Blinq) will cover, in order:
1. One-line what + the product insight (build on the recorder, surface the follow-up).
2. How to run (`docker compose up`, URLs, the keyless mock note).
3. How I interpreted the brief.
4. Assumptions made where it was vague.
5. Questions I'd ask the PM.
6. Key technical decisions + *why* (GraphQL for the graph; gRPC for the extraction seam; SQLite for a runnable single-user PoC; Haiku 4.5; no speaker resolution).
7. Trade-offs accepted.
8. What I'd do next.
```

---

## 20. Integration surface — how to connect the pieces

> This section exists to resolve the integration details that are not visible in the architecture diagram but cause the most build failures. An implementer (human or AI) should read this before writing any code.

### 20.1 Dependency versions

Pin these exactly. The major versions listed below have breaking changes that are not obvious from the documentation.

| Package | Pin | Reason |
|---|---|---|
| `prisma` | `5.22.0` | v7 removes `url` from `schema.prisma`; requires `prisma.config.ts` instead |
| `@pothos/core` | latest v3 | v4 API changed; stay on v3 |
| `graphql-yoga` | latest v5 | v4 had different CORS API |
| `@anthropic-ai/sdk` | latest | model name changes; always set `MODEL` env var explicitly |

### 20.2 File path relationships

Every path below is relative to the repository root.

```
proto/extraction.proto
  ↳ services/api/src/extraction-client.ts
      resolves as: path.resolve(__dirname, '../../../proto/extraction.proto')
      (__dirname = services/api/src/, so ../../../ = repo root)
  ↳ services/extraction/src/grpc/proto.ts
      resolves as: path.resolve(__dirname, '../../../../proto/extraction.proto')
      (__dirname = services/extraction/src/grpc/, so ../../../../ = repo root)

data/taperoot.db
  ↳ DATABASE_URL in .env = file:../../../data/taperoot.db
      path is relative to services/api/prisma/schema.prisma
      (3 levels up from services/api/prisma/ = repo root/data/)
  ↳ In Docker: DATABASE_URL = file:/data/taperoot.db (absolute, volume-mounted)
```

### 20.3 Docker build requirements

**API service** — must use `node:22-slim`, not alpine. Prisma's query engine binary requires OpenSSL.

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*
# prisma generate must run at build time (not runtime) so the binary is baked in
RUN cd services/api && npx prisma generate
# migrate + seed at runtime (DB volume may be fresh)
CMD sh -c "cd services/api && npx prisma migrate deploy && npx prisma db seed && cd /app && npx tsx services/api/src/index.ts"
```

**Extraction service** — proto file is not inside the service directory; must be explicitly copied.

```dockerfile
COPY proto ./proto          # ← without this, the gRPC server cannot load the schema
COPY services/extraction ./services/extraction
```

**Web service** — Vite bakes env vars at build time. `VITE_API_URL` must be a build `ARG`, not a runtime `ENV`.

```dockerfile
ARG VITE_API_URL=http://localhost:4000/graphql
RUN VITE_API_URL=$VITE_API_URL npm run build   # baked into the bundle here

# Runtime stage: WORKDIR must be the directory containing vite.config.ts
WORKDIR /app/web
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
```

### 20.4 Framework configuration traps

**Pothos + Prisma plugin**

The builder requires `dmmf` or the schema build silently omits Prisma types:
```typescript
const builder = new SchemaBuilder<{ PrismaTypes: PrismaTypes }>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,   // ← required; omitting this causes cryptic type errors
  },
});
```

Prisma stores enums as strings in SQLite. `t.exposeString` will reject a string-backed enum field. Use:
```typescript
status: t.field({ type: FollowupStatusEnum, resolve: (f) => f.status as 'open' | 'done' }),
```

**urql + Vite**

`import.meta.env` is not typed by default in TypeScript. Access it as:
```typescript
(import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL
```

**gRPC dynamic loading**

Use these exact `loadSync` options or field names will be mangled:
```typescript
protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,   // ← preserves snake_case field names
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
```

### 20.5 Anthropic extraction contract

```typescript
// Model — pin this; haiku changes generation
const MODEL = process.env.MODEL ?? 'claude-haiku-4-5-20251001';

// Force tool use so the response is always structured JSON, never prose
tool_choice: { type: 'tool', name: 'emit_results' }

// Tool output shape
{
  notes:   [{ convo_id: string, text: string, date: string }],
  actions: [{ description: string, due_date: string, source_type: 'note'|'conversation', source_id: string }]
}

// Fallback when ANTHROPIC_API_KEY is absent
// MockExtractor: action-verb heuristic on note/transcript text + relative-date regex
// ("next week" → +7 days, "by Friday" → +5 days, etc.)
```

### 20.6 Environment variables — full reference

| Variable | Service | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | api | `file:../../../data/taperoot.db` | Path relative to `prisma/schema.prisma` |
| `API_PORT` | api | `4000` | |
| `EXTRACTION_ADDR` | api | `localhost:50051` | Use `extraction:50051` inside Docker compose |
| `WEB_ORIGIN` | api | `http://localhost:5173,http://localhost:8080` | Comma-separated CORS allowlist |
| `EXTRACTION_PORT` | extraction | `50051` | |
| `ANTHROPIC_API_KEY` | extraction | *(absent)* | Falls back to MockExtractor when absent |
| `MODEL` | extraction | `claude-haiku-4-5-20251001` | Override to test different models |
| `VITE_API_URL` | web (build) | `http://localhost:4000/graphql` | Baked at build time; pass as Docker build ARG |

### 20.7 Windows / WSL2 port note

On Windows with WSL2, `localhost` resolves to `::1` (IPv6). Docker maps published ports to `0.0.0.0` (IPv4). Use `http://127.0.0.1:8080` in the browser, not `http://localhost:8080`. The WSL relay process (`wslrelay.exe`) often holds `[::1]:8080`, causing a conflict even when Docker appears healthy.
