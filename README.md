# Taperoot

> What grows after the tap. A follow-up helper for Blinq.

A Blinq tap *starts* a relationship. But what happens next — who they were, what you talked about, what you said you'd do — usually lives in your head and gets forgotten. Blinq wins when its users actually follow up. Taperoot makes that effortless: it turns what Blinq already captures into a clear list of next steps for each contact.

This README is about *how I thought about the product*, not a list of features.

---

## Run it

```bash
docker compose up --build
# web → http://localhost:8080
# api → http://localhost:4000/graphql
```

- **Recommended: run with an Anthropic API key.** Add `ANTHROPIC_API_KEY` to a `.env` file to use the real Claude Haiku 4.5 model for accurate, context-aware follow-up extraction.
- **No API key? No problem.** Without the key it falls back to a built-in rule-based extractor — the app runs fully offline, but suggestions will be simpler and less accurate.
- The database comes pre-filled with 6 sample contacts.
- No Docker? `npm install`, then `npm run dev:api` / `dev:extraction` / `dev:web`.

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
