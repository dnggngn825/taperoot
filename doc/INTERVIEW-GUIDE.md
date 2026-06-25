# Taperoot — Interview & Upskilling Guide

> A friendly walkthrough of the Taperoot codebase, the questions a principal engineer would ask a mid-level candidate about it, and how to prepare for a Blinq-style system design session.
>
> **Who this is for:** a junior engineer who wants to think like a mid/senior. Read it slowly, follow the file links, and try to answer the questions out loud before reading the model answers.

---

## Part 1 — What Taperoot is, in plain English

**The product idea:** A Blinq tap starts a relationship. Taperoot helps you *keep* it. You open a contact, and it shows you exactly what to do next — turning your notes and conversation transcripts into a short list of follow-up actions, some written by you, some suggested by AI.

That's the whole product in one sentence: **open a contact, see what to do next.**

### The shape of the system

It's a small monorepo with **three running pieces** plus a web app. Think of it as "a website, a brain, and an AI helper."

```
Browser (React + urql)
      │  GraphQL over HTTP
      ▼
API service  :4000        ← the "brain": reads/writes data, decides when to call AI
GraphQL Yoga + Pothos + Prisma
SQLite file (data/taperoot.db)
      │  gRPC (typed contract)
      ▼
Extraction service  :50051  ← the "AI helper": turns text into notes + follow-ups
Anthropic Claude Haiku 4.5  (or a rule-based mock if no API key)
```

### The four parts, one at a time

| Part | Folder | What it does | Key tech |
|---|---|---|---|
| **Web** | `web/` | Two tabs — **Contacts** and **Notetaker**. No router; it's a single page that swaps views. Talks to the API with GraphQL. | React 18, Vite, urql |
| **API** | `services/api/` | The brain. One GraphQL query loads a contact *and* all its notes, conversations, and follow-ups together. Writes data, and kicks off AI generation when it makes sense. | GraphQL Yoga, Pothos (schema), Prisma (DB) |
| **Extraction** | `services/extraction/` | The AI. Takes a contact's text, returns AI notes + follow-up actions. It's its own service so the model is easy to swap. | gRPC, Anthropic SDK (Claude Haiku 4.5) |
| **Data** | `services/api/prisma/` | One owner `User` → many `Contact` → many `Note` / `Conversation` / `Followup`. | Prisma schema, SQLite |

### The data model (the heart of everything)

```
User ──< Contact ──< Note
                 ├──< Conversation
                 └──< Followup
```

A few fields do a lot of work — learn these, because most interview questions hinge on them:

- **`origin`** on Note and Followup: `"ai"` or `"manual"`. This is how the app remembers *who created a thing* — you or the model.
- **`status`** on Followup: `"open"` or `"done"`. Tick a follow-up off and it becomes `done`.
- **`aiStatus`** on Contact: a tiny state machine — `idle → processing → done | failed`. This is what the UI polls to show a spinner.

There are no real database enums — SQLite doesn't support them — so these are plain strings, kept consistent by hand in `services/api/src/lib/constants.ts`. **Remember that:** the "type safety" of these values lives in convention, not the database.

### The one genuinely clever idea: safe re-runs

This is the part to really understand. The AI can be wrong, so the user must be able to edit, tick off, or ignore anything it suggests — and re-running the AI must **never** destroy that work.

The trick is in one transaction in `services/api/src/schema/mutations.ts` (the `triggerGeneration` function, around line 222):

```ts
// before inserting fresh AI output, delete ONLY:
await tx.note.deleteMany({ where: { contactId, origin: 'ai' } });
await tx.followup.deleteMany({ where: { contactId, origin: 'ai', status: 'open' } });
```

Read that carefully:
- It deletes **AI** notes (yours are `manual`, so they survive).
- It deletes only **open AI** follow-ups. A follow-up you ticked **done** is `done`, so it survives. Anything you wrote is `manual`, so it survives.

So re-running the AI just refreshes the open AI suggestions and leaves everything you touched alone. That single `where` clause is the product promise ("you can trust an AI you can override") written as code. **If you understand this line, you understand Taperoot.**

### How the AI runs (and where it's fragile)

When you click **Generate follow-ups**:
1. The API flips the contact to `aiStatus: 'processing'` and returns *immediately*.
2. It calls the AI **fire-and-forget** — `void triggerGeneration(...)` — meaning it doesn't wait for it.
3. The browser **polls** every 2 seconds (`web/src/hooks/useContactDetail.ts`) asking "are we done yet?" until `aiStatus` becomes `done` or `failed`.

This is a clean, simple design — but it's also where the system is brittle, and the author knew it. If the API process dies mid-generation, the work is lost and the contact is stuck on `processing` forever (the browser would poll forever too). There is a thorough design doc, `doc/pubsub-generation-design.md`, that proposes replacing the in-memory promise with a durable Pub/Sub queue. **It is design-only — not built.** That gap is gold for interviews and system design (see Parts 2 and 3).

### The honest trade-offs the author made (and wrote down)

Good engineering is as much about what you *don't* build. The README is upfront about this:

- **No search.** The brief literally calls search "the problem" as a list grows — but with ~6 contacts and 3 hours, a list + detail view proves the value. Search is "the first thing I'd add next."
- **No auth.** There's one hard-coded owner. (And note: the single-`contact` query doesn't even check ownership — any UUID works. Fine for a demo, not for production.)
- **One contact per conversation.** In real Blinq, one conversation can involve many people. Taperoot simplifies to one — supporting many would need a join table.
- **SQLite, not Postgres.** A single file, no server, no credentials. The README notes switching to Postgres is "a one-line Prisma change."
- **AI as a separate service.** Slightly more infrastructure than a 3-hour PoC needs — but it means the rest of the app never knows which model is running. Swapping models touches only that one service.

> **The meta-lesson for upskilling:** notice that every "left out" item has a *reason tied to user value and time budget*. That's the difference between "I ran out of time" and "I made a scoping decision." Interviewers love the second one.

---

## Part 2 — Questions to ask the candidate

The goal isn't trivia. It's to see whether they (a) actually understand what they built, (b) can defend their tech choices, and (c) can tailor a sensible solution to a *new* requirement under a time budget — the same skill the take-home tested.

Use it as a conversation. Start easy, follow the threads. The model answers below tell you what **junior / mid / senior** sounds like.

### Round 1 — Do they understand their own system? (warm-up, ~10 min)

1. **"Walk me through what happens, end to end, when I click *Generate follow-ups*."**
   *Looking for:* GraphQL mutation → API flips `aiStatus` to `processing` and returns → fire-and-forget call over gRPC → extraction calls Claude (or mock) → results saved in a transaction → browser polling notices `done`. A strong answer mentions the polling loop *without* prompting.

2. **"If the AI is wrong and I fix a follow-up, then click Generate again — what happens to my edit? Why?"**
   *Looking for:* They point to the `deleteMany` with `origin: 'ai'` / `status: 'open'`. **This is the single best question to separate "I understand my design" from "the AI wrote it for me."**
   *Follow-up trap:* "What about a follow-up I *edited* but didn't tick done — does my edit survive a re-run?" (Answer: **no** — it's still `open` + `origin: 'ai'`, so it gets wiped and re-created. That's a real, subtle hole. A great candidate spots it.)

3. **"Why is there a separate extraction service at all? Why not call Claude straight from the API?"**
   *Looking for:* The boundary keeps the API ignorant of which model runs — swap the model, or the whole provider, and nothing outside that service changes. The mock-vs-real fallback lives behind the same gRPC contract, so the app always runs with no API key.

### Round 2 — Can they defend the tech stack? (~10 min)

These are "why" questions. There are no wrong tools, only undefended ones.

4. **"You picked GraphQL. What did it buy you here, and when would it have been the wrong call?"**
   *Good answer:* one round-trip loads a contact + all its children (no N+1, no over-fetching on the client); the schema is the contract. *Senior signal:* names the cost — GraphQL is overkill for a tiny single-client app; a couple of REST endpoints would've been simpler, and GraphQL caching/auth is more work to get right.

5. **"Why gRPC between the API and the AI service instead of plain HTTP/REST?"**
   *Good answer:* a typed request/response contract (the `.proto` file) for a service-to-service call; cheap, strict, language-agnostic. *Senior signal:* admits it's a heavier choice for a PoC and notes the proto must stay in sync by hand.

6. **"SQLite. Defend it. Now tell me the first thing that breaks when this becomes real."**
   *Good answer:* perfect for a single-user, single-file prototype — no server, no creds. *The break:* SQLite is single-writer. The moment you add a second writer (e.g. the proposed Pub/Sub worker writing results while the API writes status), you can hit `database is locked`. The fix is WAL mode + busy timeout, or move to Postgres.

7. **"There's no code generation between the database, the GraphQL types, and the React types. What's the risk?"**
   *Looking for:* the same shape is hand-written in `schema.prisma`, the GraphQL types, **and** `web/src/types.ts`, plus the gRPC `.proto`. Nothing forces them to agree — add a field and forget one place, and it silently drifts (TypeScript won't catch a missing field in a GraphQL query string). *Senior signal:* proposes `graphql-codegen` / typed documents as the real fix.

### Round 3 — Tailor a solution to a NEW requirement (the main event, ~25–30 min)

This is the part that matches the take-home: **"here's a new feature, you've got ~3 hours, how do you build it on top of what exists?"** Pick **one** challenge below based on the level you're probing. Make them reason *across the layers* — schema → API → gRPC → web — not just edit one file.

Difficulty ladder: **#A and #B are good mid-level core. #C is the discriminator. #D is a senior stretch.**

---

#### Challenge A — "Add a *priority* (high/normal/low) to follow-ups, end to end."
*The model should emit it, it should persist, and the UI should show/sort by it. Manual follow-ups default to normal.*

**Why it's a good test:** it's the classic "add one field through every layer" task, and this repo has **no codegen and no DB enums**, so the candidate has to find every boundary by hand: the `.proto`, the gRPC TypeScript mirror, *both* extractors (Anthropic tool schema + the mock), the Prisma model + a migration, the `createMany` that saves AI results, the GraphQL type, the React type, the query string, and the component.

**What good looks like:**
- They **list the path before coding** and treat the `.proto` + the two TS type files as "the contract."
- They add the Prisma column as a `String` with `@default('normal')` (not `NOT NULL` with no default — that breaks existing rows) and write the migration.
- In the Anthropic path they add `priority` to the tool schema *and* map it with a `?? 'normal'` fallback — mirroring the existing defensive `due_date ?? ''` pattern.
- They keep `web/src/types.ts` and the query selection in sync, and *say out loud* that nothing enforces this — it's silent-drift risk.

**Follow-up probes (these are where juniors and mids separate):**
- *"The model returns `priority: 'Critical'`, outside your three values. Where does that get caught today?"* (Answer: **nowhere** — no DB constraint, GraphQL exposes it as a plain `String`. You need app-side validation.)
- *"On re-run, only `open` AI follow-ups get deleted. If I bumped an AI follow-up's priority but left it open, what happens next Generate?"* (It's wiped and re-created from the model — **the edit is lost**, unlike a `done` one.)
- *"You added the column but forgot it in the GraphQL query string. What does the user see, and why didn't TypeScript catch it?"*

---

#### Challenge B — "Let me *dismiss* an AI follow-up so it doesn't come back on the next Generate."
*A dismissed AI follow-up must survive future runs, the same way `done` ones do.*

**Why it's a good test:** the obvious solution ("add a dismiss button that deletes the row") is **wrong**, because the model will just re-suggest it next run. The candidate has to realize the *preservation mechanism is the `status` field*, and that the one line `deleteMany({ origin: 'ai', status: 'open' })` is what decides survival.

**What good looks like:**
- They identify `mutations.ts` line ~224 as **the** invariant, and change the delete to exclude both `done` **and** a new `dismissed` status (e.g. `status: { notIn: ['done', 'dismissed'] }`).
- They **update** the row (reusing `updateFollowup`) rather than deleting it, so it stays in the DB to block re-emission.
- **Senior signal:** they spot the residual hole — the *model* has no memory of dismissals, so a content-identical action can still come back as a brand-new `open` row. They propose feeding dismissed text back to the extractor as "don't re-suggest these" (which touches the `.proto` and the prompt) or content-hashing.

**Follow-up probes:**
- *"Trace it: I dismiss X, click Generate, the model re-emits the same action. What rows exist now?"*
- *"Should dismiss be a status change or a delete? Defend it against the regeneration logic."*

---

#### Challenge C — "Add real server-side search with pagination." *(the discriminator)*
*Replace today's load-everything-and-sort-in-JS with a real filter + sort + pagination in the database, and wire a search box into the header.*

**Why it's a good test:** the current `contacts` resolver (`services/api/src/schema/queries.ts`) is the worst-scaling code in the repo, and it's instructive: it `include`s **all** notes/conversations/followups for **every** contact just to compute "last activity" and sort *in JavaScript*, it ignores Pothos's efficient `query` selection, and its search uses case-sensitive `contains` (SQLite has no `mode: 'insensitive'`).

**What good looks like:**
- They realize "last activity" is a `max()` across **three** relations, so it can't be a simple Prisma `orderBy`. They propose either **denormalizing** a `lastActivityAt` column updated on write, or sorting by a proxy — and name the trade-off (write cost vs. read cost).
- They stop `include`-ing full children for the *list* view, add `take`/`skip` or cursor pagination, and call out SQLite case-sensitivity (lowercase compare, or "FTS5 is the real answer").
- On the frontend they lift `q`/`sort` into state (today the context **hardcodes** sort and has no setter), debounce the input, and remove the now-redundant client-side sort.

**Follow-up probes:**
- *"Search for 'Alice' misses a contact named 'alice'. Why, given SQLite, and what are your options short of FTS5?"*
- *"With server pagination, why is the client-side sort now actively wrong?"*

---

#### Challenge D — "Make generation crash-proof." *(senior stretch)*
*A contact must never be stuck on `processing` forever if the API dies mid-generation. Show a failed/stuck state with a Retry button.*

**Why it's a good test:** generation is fire-and-forget (`void triggerGeneration`), detached from the request, with no queue. A crash leaves `aiStatus: 'processing'` forever, and the browser polls forever with no timeout. There's a whole Pub/Sub design doc for the *production* version — this asks for a pragmatic **3-hour subset** of it.

**What good looks like:**
- They distinguish two failure modes: **(a)** generation threw — already caught and set to `failed`; **(b)** the process *died* — nothing recovers it.
- They add a `processingStartedAt` timestamp and a **sweep** (on boot, or periodic) that flips stale `processing` rows older than N minutes to `failed`. Self-healing.
- They spot the **race**: `generateForContact` does `findUnique` then `update` — two fast clicks can both pass the "already processing?" check. The fix is a single conditional write (`updateMany where aiStatus != 'processing'`).
- They cap frontend polling with a max-attempts/timeout and add a Retry button.
- **Senior signal:** they raise the **fencing** problem — if the sweep marks a job `failed` and the hung gRPC call *then* returns and writes `done` + new rows, you've resurrected stale data. They propose a generation id / compare-and-set so a late writer can't clobber a finalized status. (This is exactly what the Pub/Sub doc's "sticky terminal status via CAS" solves.)

> There's also **Challenge E — multi-participant conversations** (a conversation belongs to 2+ contacts via a join table, and regenerating one contact must not wipe the others' AI data). It's a genuinely senior, cross-layer challenge with a tricky SQLite migration (you can't drop a column in one step; you backfill a join table first). Use it as a *design discussion*, not a full build — ask them to design the schema and explain the regeneration risk, and only expect a senior to nail the migration sequencing and per-contact idempotency under sharing.

### What separates the levels (quick rubric)

| | Junior | Mid-level | Senior |
|---|---|---|---|
| **Layers** | Edits one layer; forgets the others (silent drift) | Threads all layers correctly; respects defensive defaults | Treats the gRPC contract + the re-run invariant as living contracts |
| **The re-run line** | Ignores it | Identifies `deleteMany(origin:'ai', status:'open')` as THE invariant | Protects it under concurrency, crashes, and late responses |
| **Dismiss (B)** | Deletes the row (model re-emits it) | Uses a new status, excludes it from delete | Closes the loop by feeding dismissals back to the model |
| **Stuck jobs (D)** | Only handles the throw path | Adds a timeout + a sweep + names the race | Fixes the race with a CAS and adds a fencing token |
| **SQLite** | Doesn't think about it | Knows single-writer + case-sensitivity | Sequences a safe two-step migration; weighs Postgres |

---

## Part 3 — System design prep for a Blinq session

Blinq's world is **mobile-first, read-heavy (millions of taps), event-driven, and increasingly AI-assisted.** A system design interview there will probe how you handle scale, failure, and the messy real world — especially **unreliable mobile networks.** Below are five design problems to practice, each tied to something concrete in Taperoot so the link feels real, plus the open questions you should be ready to answer.

> **How to use these:** for each one, sketch the boxes, then *attack your own design* with the "open questions." The best system design candidates spend half their time on failure and edge cases, not the happy path.

### Concepts worth studying first (the toolbox)

- **Caching & CDNs** — read-heavy profile views; cache invalidation.
- **Async work: queues & pub/sub** — at-least-once delivery, idempotency, dead-letter queues, backpressure, ordering. (Taperoot's `doc/pubsub-generation-design.md` is a free, worked example — read it.)
- **Offline-first / local-first** — optimistic UI, local queues, sync, conflict resolution (last-write-wins vs CRDTs).
- **Search** — inverted indexes, full-text search, typeahead, ranking.
- **Idempotency & state machines** — making retries safe; "exactly-once effects on at-least-once delivery."
- **Data modeling & migrations** — indexes, denormalization, zero-downtime schema changes.

### Problem 1 — "Design viewing a Blinq card at the moment of a tap." *(read-heavy + the network)*
**Relevant because:** this *is* Blinq's core moment, and it's where weak networks bite hardest. *Taperoot link:* the web app loads a contact graph in one request — now imagine that at millions of taps a day.

**Practice the design of:** edge caching / CDN for profile data, a fast read path, image/asset optimization, and graceful degradation.

**Open questions to be ready for:**
- *"I tap a card on the subway with one bar of signal. What do I see?"* (Talk about: cached last-known profile, skeleton/optimistic render, retry with backoff, showing a clearly "offline" state instead of a spinner-of-death.)
- *"The profile was updated 5 seconds ago but my cache is stale. What does the viewer see, and is that OK?"* (Eventual consistency, TTLs, cache busting.)
- *"NFC tap vs QR scan vs a link — how does the entry point change your fallback?"*

### Problem 2 — "Design the durable AI follow-up pipeline." *(async + idempotency + failure)*
**Relevant because:** Taperoot already has the brittle version and a written cure. *Taperoot link:* turn the fire-and-forget `triggerGeneration` into something that survives a crash. **Read `doc/pubsub-generation-design.md` first — then defend or critique it.**

**Practice the design of:** API publishes an event → a worker consumes it → calls the model → persists idempotently → sets a terminal status; plus retries, a dead-letter queue, and a "sweeper" backstop.

**Open questions to be ready for:**
- *"The queue delivers the same message twice, at the same time, for one contact. What goes wrong, and how do you stop double-writes?"* (Ordering key per contact, or a per-contact lock; the doc uses ordering keys.)
- *"The worker dies after calling the model but before saving. What happens?"* (At-least-once redelivery; the work re-runs; idempotent persist makes it safe.)
- *"How do you guarantee a job *always* reaches done or failed and never hangs on processing forever?"* (DLQ subscriber + a periodic sweeper with a TTL longer than the whole retry window.)
- *"Anthropic is rate-limiting you during a burst of 500 generations. What protects you?"* (Backpressure — cap concurrent in-flight messages; the queue smooths the spike.)
- *"A slow, hung model call finishes *after* you've already marked the job failed. How do you stop it resurrecting stale data?"* (Fencing / compare-and-set on a "still processing?" guard — "sticky terminal status.")

### Problem 3 — "Design contact search as the list grows to thousands." *(the feature Taperoot cut)*
**Relevant because:** the brief calls search "*the* problem" and Taperoot deliberately skipped it. *Taperoot link:* replace the in-memory filter/sort in `queries.ts`.

**Practice the design of:** full-text search (Postgres FTS / FTS5 / a search engine), an index, typeahead with debounce, pagination, and ranking ("who did I meet in fintech?").

**Open questions to be ready for:**
- *"Typo: I search 'Catherine' but typed 'Katherine'. Now what?"* (Fuzzy matching, trigrams, phonetic search.)
- *"Search needs to cover names, companies, *and* note/transcript text. How do you keep the index fresh as notes are added?"* (Write-time indexing vs. async re-indexing; staleness trade-offs.)
- *"Ten thousand contacts, typeahead on every keystroke. How do you not melt the server?"* (Debounce, min query length, caching, pagination/cursors.)

### Problem 4 — "Design due-dates → real reminders." *(scheduling + fan-out + failure)*
**Relevant because:** Taperoot guesses due dates but does nothing with them; "turn due dates into real reminders" is on its roadmap. *Taperoot link:* `Followup.dueDate` exists but is unused and unindexed.

**Practice the design of:** a scheduler that scans for due reminders and fans out notifications (push/email), without sending duplicates.

**Open questions to be ready for:**
- *"How do you avoid sending the same reminder twice if your scheduler runs twice?"* (Idempotency keys, a "sent" marker, exactly-once *effects*.)
- *"The user's phone is offline when the reminder fires. Then what?"* (Push retries, server-side queue, show on next open.)
- *"Time zones and 'tomorrow'. I set 'follow up tomorrow' in Sydney; when does it fire?"* (Store UTC, render local; be explicit about which clock 'due' means.)
- *"`dueDate` is nullable and unindexed. What does the scan cost at scale, and what do you add?"*

### Problem 5 — "Design capturing a contact with no signal." *(offline-first — the weak-network problem)*
**Relevant because:** this directly answers "*how do you scan a profile when the network is weak?*" — the most Blinq-shaped question of all. *Taperoot link:* every Taperoot mutation assumes the network is up and refetches immediately; reality on a conference floor is not that.

**Practice the design of:** a local-first capture flow — write to local storage first, queue the change, sync when connectivity returns, and resolve conflicts.

**Open questions to be ready for:**
- *"I scan a card and add a note in airplane mode. Where does it live, and what does the UI say?"* (Local store + an outbox queue; show "will sync" not an error.)
- *"My phone and the server both changed the same contact while I was offline. Who wins?"* (Conflict resolution: last-write-wins with timestamps, field-level merge, or CRDTs — and the trade-offs.)
- *"The sync request half-succeeds — the server saved it but my phone never got the ack. What happens on retry?"* (Idempotent writes with a client-generated id, so a retry doesn't create a duplicate.)
- *"How long do you keep unsynced data, and what if the app is force-closed before it syncs?"* (Durable local storage, sync-on-launch, surfacing pending state.)

### A note on *how* to answer in the room

1. **Clarify scope first.** Ask what scale, what platform, what's in/out — exactly the muscle the take-home rewarded.
2. **Happy path, then break it.** Draw the boxes, then immediately ask "what happens when this fails?" Interviewers score the failure thinking highest.
3. **Name your trade-offs out loud.** "I'd use last-write-wins because it's simple, at the cost of losing concurrent edits" beats a silent perfect-looking diagram.
4. **Tie it back to the product.** Blinq is a product company — connect every technical choice to user value (the follow-up that doesn't get forgotten).

---

### Appendix — the five files to read before any Taperoot interview

| File | Why |
|---|---|
| `services/api/src/schema/mutations.ts` | The re-run invariant + fire-and-forget generation live here. |
| `services/api/src/schema/queries.ts` | The in-memory search/sort that doesn't scale — a built-in discussion. |
| `web/src/hooks/useContactDetail.ts` | The 2-second polling loop and its missing timeout. |
| `services/api/prisma/schema.prisma` | The whole data model on one page (`origin`, `status`, `aiStatus`). |
| `doc/pubsub-generation-design.md` | A worked, production-grade async/idempotency/failure design — the best free study material in the repo. |
