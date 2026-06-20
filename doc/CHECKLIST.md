# Taperoot — Phase Exit Checklists

> Living doc. Tick items off here after each phase passes.
> Companion to [BUILD-PLAN.md](./BUILD-PLAN.md) · [DESIGN.md](./DESIGN.md)

---

## Phase 1 — Monorepo scaffold, tooling & Docker skeleton

- [x] `npm install` at root succeeds; workspaces linked
- [x] `npm run typecheck` passes (stubs ok)
- [x] `npx playwright install` succeeds; `npm run test:e2e` runs (stub test ok)
- [x] `docker compose up` boots all 3 services without error
- [x] `./data` volume mounts correctly; SQLite file path reachable inside `api` container
- [x] Env vars from `.env.example` flow into containers
- [x] Repo structure matches [DESIGN §13](./DESIGN.md#13-repository-structure)

---

## Phase 2 — Data layer (Prisma + SQLite + seed)

- [x] `prisma migrate dev` clean; client generated
- [x] `prisma db seed` runs; re-running after `migrate reset` re-seeds cleanly
- [x] Prisma Studio (or a query) shows 6 contacts + children, `followups = 0`
- [x] ≥1 two-speaker AND ≥1 three-speaker conversation present
- [x] Contact F has zero notes/convos
- [x] Every `transcript` parses as valid JSON `[{speaker,text}]`

---

## Phase 3 — Extraction service: contract + gRPC server + mock

- [x] `npm run dev:extraction` boots; logs `listening :50051`
- [x] gRPC smoke call on a context with 1 conversation → returns 1 `ExtractedNote` + ≥1 `ExtractedAction`
- [x] Context with notes only → returns `notes: []` + ≥1 action
- [x] Empty context → `{ notes:[], actions:[] }` (no crash)
- [x] Passes with **no** `ANTHROPIC_API_KEY`

---

## Phase 4 — Extraction service: real Haiku 4.5

- [x] With key: a seeded conversation yields a note + sensible actions (manual eyeball)
- [x] Without key: falls back to mock; service still works
- [x] Startup log states which extractor is active

---

## Phase 5 — GraphQL API: read side

- [x] Server boots; GraphiQL reachable at `:4000/graphql`
- [x] `contacts` (no args) returns all 6 sorted by `lastActivityAt` desc
- [x] `contacts(sort: alphabetical)` returns contacts A→Z by name
- [x] `contacts(q:"<term>")` filters correctly; sort still applies
- [x] Contact F (no activity) appears last under `recent_update` (nulls last)
- [x] `contact(id)` returns nested notes + convos + followups in one query
- [x] `openFollowupCount = 0` for all (none generated yet)
- [x] Nested query does not N+1 (plugin batching — eyeball query log)

---

## Phase 6 — GraphQL API: write side + generateForContact

- [x] `addNote` persists with `origin: manual`; auto-triggers generation on notes-only contact; `aiStatus` transitions `processing` → `done`
- [x] `addNote` on contact with conversations → persists note only, does **not** auto-trigger
- [x] `updateNote` persists edits; does not re-trigger generation
- [x] `addConversation` parses raw text → structured transcript; saved with `summary: null`; does **not** trigger generation
- [x] Explicit `generateForContact` on contact with conversations → AI notes (one per convo, `origin: ai`) + followups appear after `done`
- [x] Notes-only path → no AI notes created; only followups
- [x] Generating twice → same set (no dupes); `done` followups survive; `origin=manual` notes and followups survive
- [x] Eligibility guard: no notes + no convos → `aiStatus` stays `idle`
- [x] `updateFollowup` flips `open ↔ done`
- [x] `npm run test:api` exits 0; all cases print PASS
- [x] ✅ e2e: seed → add conversation → generateForContact → poll `aiStatus` → AI notes + followups appear

---

## Phase 7 — Web: contacts list

- [ ] `npm run dev:web` serves; page lists 6 contacts sorted by recent update by default
- [ ] Toggling sort to alphabetical re-orders the list A→Z
- [ ] Open-followup count renders per card
- [ ] Empty + loading states handled

---

## Phase 8 — Web: contact detail + notetaker

- [ ] Contact detail loads with notes, follow-ups, conversations
- [ ] Generate button visible; disabled while `aiStatus: processing`; re-enables on `done`
- [ ] After generate (with conversations): AI notes appear with sparkle icon; AI followups appear with sparkle icon
- [ ] After `addNote` on notes-only contact: spinner appears automatically; AI followups appear after `done`; no AI notes created
- [ ] Hover AI note → meatball → edit form → save → updated body persists
- [ ] Hover AI followup → meatball → edit → save → updated description persists
- [ ] `+ Note` creates note with `origin: manual` (no sparkle)
- [ ] `+ Task` creates followup with `origin: manual` (no sparkle); survives regeneration
- [ ] Transcript textarea: paste raw text → Save → conversation appears; no auto-trigger
- [ ] `mailto:` opens prefilled with contact email + action body
- [ ] A 3-speaker transcript renders fine
- [ ] ✅ e2e: full click-through (list → search → contact → Generate → poll → AI items → edit → tick done → mailto)

---

## Phase 9 — README + Playwright e2e + final Docker run

- [ ] Fresh `docker compose up` from clean checkout → all 3 services healthy
- [ ] API auto-migrates + seeds on first boot
- [ ] Web reachable; full flow works **in containers**
- [ ] Works with **no** `ANTHROPIC_API_KEY` (mock path)
- [ ] Works **with** key (real Haiku) — noted in README
- [ ] `npm run test:api` exits 0
- [ ] `npm run test:e2e` (Playwright) golden path passes
- [ ] README run steps, followed verbatim, succeed
- [ ] `git bundle create taperoot.bundle --all` produced for submission
