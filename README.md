# Taperoot

> What grows after the tap. A follow-up helper for Blinq.

A Blinq tap *starts* a relationship. But what happens next — who they were, what you talked about, what you said you'd do — usually lives in your head and gets forgotten. Blinq wins when its users actually follow up. Taperoot makes that effortless: it turns what Blinq already captures into a clear list of next steps for each contact.

This README is about *how I thought about the product*, not a list of features.

---

## The problem I'm solving

People are great at collecting contacts and bad at following up. The tap is easy; the follow-through is the hard, valuable part — it's where relationships and deals are won or lost. If Blinq makes the follow-up almost automatic, people get more from every contact and keep coming back. That outcome is what I aimed at.

---

## How I read the brief

"Help people follow up" could mean "build another CRM." I don't think that's the win. Blinq already captures the moment really well — the tap, and the recorder that gives you a transcript and summary. The gap is everything *after*.

So Taperoot is a thin follow-up layer on top of what Blinq already does, not a place to manage data. Its one promise to the user: **open a contact, see exactly what to do next.**

---

## What I built — and what I left out

**Built** (because each one directly drives follow-through):

- Turns a contact's notes and conversations into specific next steps, with a due date when it can guess one.
- Marks what the AI suggested vs what you wrote (the ✦), and lets you edit, tick off, or ignore anything. People won't trust an AI they can't override.
- A one-click draft email to act on a follow-up.
- Re-running the AI is safe — it never wipes tasks you finished or wrote yourself.

**Left out on purpose** (didn't add enough user value to justify the cost):

- Working out who each speaker is. Nice to have, but the follow-ups don't need it.
- Sending the email for you — a draft is enough to prove the value.
- Multi-contact conversations. In Blinq, a user can tag multiple contacts in one conversation so each person sees it on their device. Taperoot scopes each conversation to a single contact — the data model would need a many-to-many join to support it fully.
- Editing the speaker list on a conversation.

---

## Assumptions (where the brief was unclear)

1. Contacts already exist.
2. A conversation comes from Blinq's recorder (an anonymous transcript + summary). I use it as-is.
3. A conversation can involve multiple speakers and, in Blinq, can be tagged to multiple contacts. Taperoot simplifies this: each conversation belongs to one contact.
4. The AI will sometimes be wrong, so everything it makes can be edited and re-runs are safe.
5. I have the contact's email, so I can pre-fill a draft message.

---

## Directions to explore

- Does the recorder ever tell us who each speaker is? (Changes how much we can auto-fill.)
- Is "follow up" just a reminder, or should we send the message for them?
- Transcripts are private — who can see them, and for how long?
- The follow-up extraction could run automatically in the background — triggered by a GCP Pub/Sub event whenever a new conversation or note is added — so suggestions appear without any user action. The "Generate follow-ups" button in this repo exists to demo the feature; in a real integration it would be replaced by an async pipeline.

---

## How I'd know it's working

- Share of contacts that get at least one follow-up suggested.
- Share of follow-ups actually marked done.
- People coming back to a contact after the first meeting.
- AI suggestions kept vs deleted — a simple quality signal.

---

## Under the hood (kept simple on purpose)

So it runs anywhere and stays easy to change:

- A GraphQL API over a small SQLite database — one query loads a contact and everything attached to it.
- The AI runs as its own small service, so the model is easy to swap. With no API key it falls back to a rule-based version, so the app always runs.
- **Trade-offs I accepted:**
  - *SQLite over a hosted database:* SQLite lives in a single file alongside the app — no server to run, no credentials to manage. It's the right call for a single-user prototype; switching to Postgres later is a one-line Prisma change.
  - *AI as a separate service:* running the extractor as its own process is slightly more infrastructure than a prototype needs. The payoff is that the rest of the app never knows which model is running — swapping the model, or folding the service back into the API, requires no changes outside the AI service itself.

(Full design notes: [`doc/DESIGN.md`](./doc/DESIGN.md).)

---

## What I'd do next

1. Auto-fill which speaker is the contact in a multi-speaker call.
2. Nudge the other person about what they promised.
3. Plug in the real recorder instead of sample data.
4. Turn due dates into real reminders.
5. Smarter search ("who did I meet in fintech?").
6. Actually send the follow-up.
7. Multiple users and login.

---

## Run it

**Recommended: run with an Anthropic API key** (`ANTHROPIC_API_KEY` in `.env`) to use Claude Haiku 4.5 for accurate follow-up extraction. Without it the app still runs using a built-in rule-based extractor, but suggestions will be simpler and less accurate.

The database comes pre-filled with 6 sample contacts.

### With Docker

```bash
cp .env.example .env          # add ANTHROPIC_API_KEY if you have one
docker compose up --build
# web → http://localhost:8080
# api → http://localhost:4000/graphql
```

### Without Docker

```bash
cp .env.example .env          # set DATABASE_URL=file:./data/taperoot.db
npm install
npm run db:setup              # migrate + seed (run once, or after resetting the DB)

# run each in a separate terminal
npm run dev:api               # GraphQL API  → :4000
npm run dev:extraction        # gRPC service → :50051
npm run dev:web               # Vite dev server → :5173
```

---

## Technical overview

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, urql (GraphQL client) |
| API | Node.js, TypeScript, GraphQL Yoga, Pothos (schema builder), Prisma |
| Database | SQLite (file-based, Prisma-managed) |
| Extraction service | Node.js, TypeScript, gRPC server, Anthropic SDK (Claude Haiku 4.5) |
| API ↔ Extraction transport | gRPC / Protocol Buffers |
| Monorepo tooling | npm workspaces, tsx |
| E2E tests | Playwright |

### Folder structure

```
taperoot/
├── services/
│   ├── api/                  # GraphQL API (Yoga + Prisma + Pothos)
│   │   ├── prisma/           # Schema, migrations, seed data
│   │   └── src/
│   │       ├── schema/       # GraphQL types and resolvers (Pothos)
│   │       ├── lib/          # Utilities (logger, transcript helpers)
│   │       └── extraction-client.ts  # gRPC client wrapper
│   └── extraction/           # gRPC extraction service
│       └── src/
│           ├── extractors/   # Anthropic extractor + mock fallback
│           └── grpc/         # gRPC server setup
├── web/                      # React SPA (Vite)
│   └── src/
│       └── features/         # contacts list, notetaker view
├── proto/                    # Shared protobuf definition (extraction.proto)
├── data/                     # SQLite database (volume-mounted, git-ignored)
├── scripts/                  # Dev and test scripts
└── docker-compose.yml
```

### Architecture

```
┌──────────────────────────────┐
│  Browser                     │
│  React + urql                │
└──────────┬───────────────────┘
           │ GraphQL over HTTP
┌──────────▼───────────────────┐
│  API service  :4000          │
│  GraphQL Yoga + Prisma       │
│  SQLite  (./data/taperoot.db)│
└──────────┬───────────────────┘
           │ gRPC (protobuf)
┌──────────▼───────────────────┐
│  Extraction service  :50051  │
│  Anthropic SDK / mock        │
└──────────────────────────────┘
```

### Data flow — generating follow-ups

1. User opens a contact and clicks **Generate follow-ups**.
2. Web sends a `generateFollowups` GraphQL mutation to the API.
3. API loads the contact's notes and conversations from SQLite.
4. API serialises the context and calls the Extraction service over gRPC.
5. Extraction service sends the context to Claude Haiku (or the mock extractor if no API key is set).
6. Model returns extracted actions (with optional due dates) and AI-generated conversation notes.
7. API persists the results to SQLite — skipping any follow-ups already marked done or manually written.
8. Web re-queries and renders the updated follow-up list.

