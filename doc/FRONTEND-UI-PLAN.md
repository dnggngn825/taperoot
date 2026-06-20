# Taperoot — Frontend UI Plan

> How to rebuild **`Taperoot Portal Frontend Design.html`** as a real, pixel-faithful React app.
> Companion to [DESIGN.md](./DESIGN.md) (product + backend architecture) and [BUILD-PLAN.md](./BUILD-PLAN.md) (backend execution).

| | |
|---|---|
| **Author** | Danny Nguyen |
| **Date** | 2026-06-20 |
| **Status** | Plan — ready to build |
| **Scope** | UI only. Pixel-faithful clone of the mockup + its existing interactions. **No backend** — every data/mutation call sits behind a typed placeholder stub. |
| **Stack** | Vite + React + TypeScript (as fixed in [DESIGN §11–§12](./DESIGN.md#11-frontend)) |
| **Source of truth** | `doc/Taperoot Portal Frontend Design.html` (the bundled mockup — template + `DCLogic` state class) |

---

## 0. Working assumption (per request)

> *"The backend will be done in parallel; right now focus on the UI and leave a placeholder for backend functions."*

Therefore:
- The UI is built **complete and pixel-exact now**, against **hardcoded seed data ported verbatim from the mockup's `DCLogic` class** — so it renders identically on day one with zero backend.
- Every read and every mutation goes through **one `BackendClient` interface** ([§5](#5-backend-placeholder-strategy)). Today it's backed by an in-memory stub; later it's backed by **urql against the GraphQL schema in [DESIGN §7](./DESIGN.md#7-graphql-api)** — **with no change to any component**. This mirrors the `ExtractionClient` seam the backend already uses ([DESIGN §5](./DESIGN.md#honest-trade-off-and-fallback)).
- Where the mockup shows data the backend doesn't model yet, it's flagged in [§6](#6-ui--backend-schema-reconciliation) rather than silently invented.

---

## 1. Fidelity bar

The rebuilt UI must be **visually indistinguishable** from the mockup at desktop width and reproduce **every** interaction:

| # | Interaction | Current source (`DCLogic`) |
|---|---|---|
| 1 | Top nav switches Contacts ↔ Notetaker | `setContacts` / `setNote`, `tab` |
| 2 | Click a contact row → detail updates; row shows selected style | `c.pick`, `sel`, `rowOn`/`rowOff` |
| 3 | Click a conversation row → detail updates | `cv.pick`, `conv` |
| 4 | Segmented control toggles AI summary ↔ Transcript | `setSummary`/`setTranscript`, `noteTab` |
| 5 | "+ Add person" opens a dropdown of contacts not already attached | `toggleAdd`, `addOpen`, `availableContacts` |
| 6 | Add a person → chip appears, dropdown closes | `a.add`, `people[conv]` |
| 7 | Remove a person (×) → chip disappears | `p.remove` |
| 8 | Per-conversation people persist while you switch convos | `people: Record<convIdx, contactIdx[]>` |

Out of scope for *this* plan: real persistence, the AI generate flow, email drafts, auth — all owned by the parallel backend ([DESIGN §7–§10](./DESIGN.md#7-graphql-api)). UI affordances for them (buttons like **Log note**, **Ask AI**, **+ Note**, **Generate**) are rendered and wired to **stub handlers** so the layout is exact and the seam is ready.

---

## 2. What the mockup is (so we rebuild the right thing)

A two-tab portal on a warm paper palette, full-viewport (`100vh`, flex column).

```
Header (64px):  [Taper•t logo]  ( Contacts | Notetaker )            <count>   [+ primary CTA]
├─ CONTACTS tab
│   ├─ Sidebar 308px: search box + scrollable contact list (avatar · name · role)
│   └─ Main: contact header (avatar, name, tag chips, role·company, email/phone pills, Log note/Edit)
│            3 stat cards (Where we met · Last touch · Open deal)
│            two columns → Notes & history (timeline) | Follow-ups (task list, 360px)
└─ NOTETAKER tab
    ├─ Sidebar 308px: "Conversations" list (waveform icon · title · date·duration)
    └─ Main: convo header (waveform, title, date·duration·channel, Ask AI/Share)
             People row: attendee chips (×) + "+ Add person" dropdown
             Segmented: ( AI summary | Transcript )
             AI summary → summary card + Key points  /  Transcript → speaker turns (avatar, time, text)
```

Full token + layout values are extracted in [Appendix A](#appendix-a-exact-design-tokens) and [Appendix B](#appendix-b-exact-layout--sizes).

---

## 3. Tech stack & key decisions

| Concern | Choice | Why |
|---|---|---|
| Tooling | **Vite** + React 18 + **TypeScript** | Fixed in [DESIGN §11–§12](./DESIGN.md#11-frontend); Vite = fast HMR, matches the React-18 runtime the mockup already used |
| Data client (later) | **urql** | Already the chosen GraphQL client ([DESIGN §11](./DESIGN.md#11-frontend)); introduced only when the backend lands |
| Styling | **CSS Modules + CSS custom-property tokens** | Mockup is 100% inline styles; tokens give an exact, single-source palette; Modules scope layout without a runtime. See [§8](#8-styling-approach) |
| Fonts | **`@fontsource/hanken-grotesk` + `@fontsource/newsreader`** (self-hosted via npm) | Mockup self-hosts these exact families; npm self-host = offline, no FOUT from a CDN |
| Icons | **Inline SVG** (copied from the mockup) | Mockup uses hand-rolled SVGs/CSS bars; copy them 1:1 — no icon lib, no visual drift |
| State | **React `useReducer` in one store + Context** | Mirrors the single `DCLogic` state object exactly; see [§7](#7-state-model) |
| Routing | **None now** (tab = state). React Router optional later | Mockup has no URLs; keep it a state toggle to stay faithful |
| Tests | **Vitest + React Testing Library** | One runner across the repo ([DESIGN §12](./DESIGN.md#12-tech-stack)); cover the 8 interactions in [§1](#1-fidelity-bar) |

**No component/UI library** (no MUI/Chakra/Tailwind preset). The aesthetic is bespoke; a library would fight the exact spacing, radii, and palette. Tailwind is *optional* but tokens-as-CSS-vars is simpler for a 1:1 clone.

---

## 4. Project structure (the `web/` workspace)

Lives at `web/` in the npm-workspaces monorepo from [DESIGN §13](./DESIGN.md#13-repository-structure).

```
web/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ src/
   ├─ main.tsx                      # React root
   ├─ App.tsx                       # store provider + tab switch + <Header/> + <ContactsView/> | <NotetakerView/>
   ├─ styles/
   │  ├─ tokens.css                 # :root CSS variables — the entire palette/typography/radii (Appendix A/B)
   │  └─ global.css                 # reset, html/body 100%, .scroll-area scrollbar, font wiring
   ├─ data/
   │  ├─ types.ts                   # view-model types (Appendix C)
   │  ├─ seed.ts                    # data ported verbatim from the mockup DCLogic
   │  ├─ backend.ts                 # ★ BackendClient interface + InMemoryBackend stub (the placeholder)
   │  └─ derive.ts                  # initials(name), toneFor(index), chipStyle(tone) — UI-only helpers
   ├─ store/
   │  ├─ store.tsx                  # useReducer state + Context + typed actions/selectors
   │  └─ store.test.tsx             # the 8 interactions from §1
   ├─ ui/                           # shared primitives
   │  ├─ Avatar.tsx                 # initials + tone, sizes (36/60/52/24/30)
   │  ├─ Pill.tsx                   # pill button (primary coral / outline / ghost)
   │  ├─ TagChip.tsx                # coral | ink | soft
   │  ├─ SegmentedControl.tsx       # AI summary | Transcript
   │  ├─ NavTabs.tsx                # Contacts | Notetaker
   │  ├─ icons/                     # SearchIcon, MailIcon, PhoneIcon, WaveformBars, etc. (inline SVG)
   │  └─ *.module.css
   ├─ features/
   │  ├─ contacts/
   │  │  ├─ ContactsView.tsx
   │  │  ├─ ContactSidebar.tsx      # search + ContactList → ContactRow
   │  │  ├─ ContactDetail.tsx       # header + StatCards + body
   │  │  ├─ StatCards.tsx           # Where we met / Last touch / Open deal
   │  │  ├─ NotesTimeline.tsx       # coral-dot timeline
   │  │  ├─ Followups.tsx           # checkbox tasks + due
   │  │  └─ *.module.css
   │  └─ notetaker/
   │     ├─ NotetakerView.tsx
   │     ├─ ConversationSidebar.tsx
   │     ├─ ConversationDetail.tsx  # header + PeopleRow + Segmented + body
   │     ├─ PeopleRow.tsx           # chips + AddPerson dropdown
   │     ├─ SummaryPanel.tsx        # summary card + key points
   │     ├─ TranscriptPanel.tsx     # speaker turns
   │     └─ *.module.css
   └─ Header.tsx                    # logo + NavTabs + right-side count + CTA
```

---

## 5. Backend placeholder strategy

The whole point of this plan: **build the UI now, swap in the backend later, change zero components.**

### 5.1 One seam: `BackendClient`

`src/data/backend.ts` defines an interface whose method names and shapes track the GraphQL operations in [DESIGN §7](./DESIGN.md#7-graphql-api):

```ts
// src/data/backend.ts
import type { Contact, Conversation, Followup, FollowupStatus } from './types'

export interface BackendClient {
  // reads — map 1:1 to GraphQL Query
  listContacts(q?: string): Promise<Contact[]>          // → query contacts(q)
  getContact(id: string): Promise<Contact | null>       // → query contact(id)
  listConversations(): Promise<Conversation[]>          // → (see §6 — convos hang off a contact in the schema)

  // mutations — map 1:1 to GraphQL Mutation
  addNote(contactId: string, body: string, noteDate: string): Promise<void>     // → mutation addNote
  generateFollowups(contactId: string): Promise<Followup[]>                      // → mutation generateFollowups
  updateFollowup(id: string, patch: { status?: FollowupStatus; description?: string }): Promise<void> // → mutation updateFollowup

  // UI-only for now — NOT in the backend schema yet (see §6, flagged)
  attachPerson(conversationId: string, contactId: string): Promise<void>
  detachPerson(conversationId: string, contactId: string): Promise<void>
}
```

### 5.2 Today's implementation: in-memory stub

```ts
// src/data/backend.ts (cont.)
import { seedContacts, seedConversations } from './seed'

/** Placeholder backend — resolves from ported mockup data. Swap for UrqlBackend later. */
export function createInMemoryBackend(): BackendClient {
  let contacts = structuredClone(seedContacts)
  let conversations = structuredClone(seedConversations)

  return {
    async listContacts(q) {
      if (!q) return contacts
      const t = q.toLowerCase()
      return contacts.filter(c =>
        [c.name, c.company, c.role].some(s => s?.toLowerCase().includes(t)))
    },
    async getContact(id) { return contacts.find(c => c.id === id) ?? null },
    async listConversations() { return conversations },

    // TODO(backend): replace body with urql mutation addNote — see DESIGN §7
    async addNote(contactId, body, noteDate) {
      const c = contacts.find(x => x.id === contactId)
      c?.notes.unshift({ id: crypto.randomUUID(), text: body, date: noteDate })
    },
    // TODO(backend): replace with urql mutation generateFollowups — DESIGN §9/§10. No-op stub for now.
    async generateFollowups(contactId) {
      return contacts.find(c => c.id === contactId)?.followups ?? []
    },
    // TODO(backend): replace with urql mutation updateFollowup — DESIGN §7
    async updateFollowup() { /* no-op stub */ },

    // UI-only state (see §6): persisted in component/store today, no server call.
    async attachPerson() {},
    async detachPerson() {},
  }
}
```

The app constructs **one** client and passes it via context:

```ts
// later, the only change needed to go live:
// const backend = createUrqlBackend(urqlClient)   // implements the same interface
const backend = createInMemoryBackend()
```

### 5.3 Rules for placeholders
- **Every** server interaction routes through `BackendClient` — components never read `seed.ts` directly (they read through the client / store).
- Each stub method carries a `// TODO(backend): <urql op> — DESIGN §<n>` marker so the swap list is greppable.
- Buttons with no backing data yet (**Log note**, **Edit**, **Ask AI**, **Share**, **+ Note**, **+ Task**, **+ Add contact/New note**) render exactly as in the mockup and call **named no-op handlers** (`onLogNote`, …) — never dead `href`/`onClick`. Layout stays pixel-exact; intent is documented.

---

## 6. UI ↔ backend schema reconciliation

The mockup is **richer than the backend model** in [DESIGN §6/§7](./DESIGN.md#6-data-model). This must be explicit so the parallel backend either grows to match or we treat fields as UI-only.

### 6.1 Contact

| Mockup field | Backend (`Contact`) | Resolution |
|---|---|---|
| `name`, `role`, `company`, `email` | ✅ same | Direct map |
| `notes[].text` / `.date` | ✅ `Note.body` / `Note.noteDate` | Direct map |
| `followups[].text` / `.due` | ✅ `Followup.description` / `Followup.dueDate` | Map; `due` ("Due Fri") is display of `dueDate` |
| `initials`, `tone` | ❌ | **UI-derived** (`initials(name)`, `toneFor(index)`), never stored |
| `tags[]` (Warm lead, Hot, …) | ❌ | **Mockup-only.** Flag → propose `Contact.tags`. Seeded for now |
| `met{event,where,date}` | ❌ | **Mockup-only.** Flag → schema extension. Seeded for now |
| `lastTouch` ("4 days ago") | ❌ (derivable) | Could be computed from latest note/convo date later; seeded string for now |
| `phone` | ❌ | **Mockup-only.** Flag → `Contact.phone`. Seeded for now |
| `deal{name,stage,value}` | ❌ | **Mockup-only.** Flag → separate `Deal` model. Seeded for now |

### 6.2 Conversation

| Mockup field | Backend (`Conversation`) | Resolution |
|---|---|---|
| `summary` | ✅ same | Direct map |
| `transcript[].speaker` / `.text` | ✅ `transcript` JSON `[{speaker,text}]` | Map; mockup renders `Speaker 1/2` + tone (no identity — matches [DESIGN assumption #4](./DESIGN.md#3-assumptions)) |
| `transcript[].time` ("00:12") | ❌ | **Mockup-only.** Flag → add to transcript segment. Seeded for now |
| `title`, `duration`, `channel` | ❌ | **Mockup-only.** Flag → `Conversation.title/durationMin/channel`. Seeded for now |
| `keyPoints[]` | ❌ | **Mockup-only** (part of "AI summary"). Flag → `Conversation.keyPoints`. Seeded for now |
| `date` (`convoDate`) | ✅ `convoDate` | Direct map |
| **attached people** (multi) | ⚠️ **conflict** | Backend models **one contact per conversation** ([DESIGN assumption #3](./DESIGN.md#3-assumptions)). The mockup attaches *several* contacts to a convo. **Open question for product/backend.** Today: UI-only state, no server call. |

> ⚠️ The **People-on-a-conversation** feature is the one genuine model conflict. The UI keeps it (faithful clone, local state), but it must be raised — either the schema gains a `Conversation ↔ Contact` many-to-many, or the feature is reframed. Listed in [§12](#12-open-questions).

### 6.3 Net
For a faithful clone *now*, mockup-only fields live in `seed.ts` and the view-model types. None block the UI. They become a **backend follow-up list** (extend schema, or formally mark UI-only).

---

## 7. State model

One reducer, one store — a direct port of the `DCLogic` state object:

```ts
interface UIState {
  tab: 'contacts' | 'notetaker'         // mockup: state.tab
  selectedContactId: string             // mockup: state.sel (index → id here)
  selectedConversationId: string        // mockup: state.conv
  noteTab: 'summary' | 'transcript'     // mockup: state.noteTab
  peopleByConversation: Record<string, string[]>  // mockup: state.people
  addPersonOpen: boolean                // mockup: state.addOpen
}
```

Actions: `SET_TAB`, `SELECT_CONTACT`, `SELECT_CONVERSATION` (also closes add), `SET_NOTE_TAB`, `TOGGLE_ADD`, `ATTACH_PERSON` (closes add), `DETACH_PERSON`.
Initial `peopleByConversation` is seeded to match the mockup (`{conv0:[c0], conv1:[c1], conv2:[c2], conv3:[c4], conv4:[c5]}`).
`availableContacts` (the add-dropdown source) is a **selector**: all contacts minus those already attached to the current conversation — exactly the mockup's `availableContacts`.

Data (contacts/conversations) is loaded once from `BackendClient` into the store on mount; mutations call the client then update local state.

---

## 8. Styling approach

**Goal: the exact same pixels, with the inline-style soup turned into something maintainable.**

1. **Tokens** → `styles/tokens.css` as `:root` CSS variables for every colour, font, radius, and the recurring sizes ([Appendix A/B](#appendix-a-exact-design-tokens)). Single source of truth for the palette.
2. **Static layout/appearance** → **CSS Modules** per component, consuming the tokens (`background: var(--paper)`, `border-radius: var(--r-pill)`). This replaces the bulk of inline styles with scoped classes — same output, no specificity wars.
3. **Truly dynamic styles** stay inline (as the mockup does): avatar `tone` background, selected-row on/off, `display:none` tab/panel toggles, segmented on/off. Driven by props/`data-` attributes.
4. **Global** → `styles/global.css`: box-sizing reset, `html,body{height:100%;margin:0}`, and the custom scrollbar (`.scroll-area::-webkit-scrollbar{width:8px;height:8px}` thumb `var(--scroll-thumb)`), matching the mockup's `.sa` class.

> Faster alternative (documented, not chosen): port the inline `style="…"` strings 1:1 into JSX `style={{…}}` objects for a literal clone, then refactor to Modules. CSS Modules + tokens is preferred for maintainability and because the backend swap will add real interactivity worth clean styling for.

Match checklist to avoid drift: font families + weights, letter-spacing on labels/logo, exact hex values, `border-radius:999px` pills, the three shadow recipes, and the 64px / 308px / 360px / 780px fixed dimensions.

---

## 9. Fonts

The mockup embeds **Hanken Grotesk** (400/500/600/700) and **Newsreader** (400/500/600) as woff2 subsets.

- Install `@fontsource/hanken-grotesk` and `@fontsource/newsreader`; import the needed weights in `main.tsx`. Self-hosted, offline, no CDN FOUT.
- `--font-sans: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;`
- `--font-serif: 'Newsreader', Georgia, 'Times New Roman', serif;`
- Newsreader is used **only** for: logo wordmark, contact/conversation `<h2>` names, section headings, and all avatar initials. Everything else is Hanken Grotesk.
- Fallback stacks above are deliberate so the layout holds even before fonts load.

---

## 10. Implementation phases

Vertical slices — each tab is built **end-to-end and verified against the mockup before the next** (per the slice-by-slice rule). UI-only, but the same discipline: data layer → store → components → verify.

| # | Phase | Tasks | Exit checklist |
|---|---|---|---|
| **P0** | **Scaffold + tokens + fonts** | Vite react-ts in `web/`; add `@fontsource/*`; write `tokens.css` + `global.css`; render an empty `--paper` page with the 64px header bar (logo only) | `npm run dev` serves; bg `#FAF6EE`; fonts load; header bar correct height/colour; no console errors |
| **P1** | **Data layer + placeholder backend** | `types.ts`; `seed.ts` (port **all** contact + conversation data verbatim from `DCLogic`); `backend.ts` (`BackendClient` + `createInMemoryBackend`); `derive.ts` (initials/tone/chipStyle) | Stub returns 6 contacts + 5 conversations; unit test: `listContacts('vertex')` filters; types compile |
| **P2** | **Store + Header + tab switch** | `store.tsx` (reducer + context, seeded state); `Header.tsx` (logo, `NavTabs`, right-side count + CTA); App renders the two views by `tab` | Clicking Contacts/Notetaker swaps views; nav pill on/off styling exact; counts ("126 contacts"/"42 conversations") show per tab |
| **P3** | **Contacts tab (full slice)** | `ContactSidebar` (search box + list + selected row style), `ContactDetail` (avatar, name, tag chips, role·company, email/phone pills, Log note/Edit), `StatCards`, `NotesTimeline`, `Followups` | Side-by-side with mockup Contacts tab = indistinguishable; selecting a row updates detail + highlight; timeline + follow-ups render for all 6 contacts; scrollbars match |
| **P4** | **Notetaker tab (full slice)** | `ConversationSidebar` (waveform rows), `ConversationDetail` header, `PeopleRow` (chips + remove + AddPerson dropdown), `SegmentedControl`, `SummaryPanel`, `TranscriptPanel` | Side-by-side = indistinguishable; segmented toggles summary/transcript; add/remove person works + persists per convo; dropdown shows only unattached contacts; speaker turns render |
| **P5** | **Pixel QA + stub wiring + tests** | Wire all no-op handlers (Log note, Ask AI, +Note, Generate, …) to named stubs; DevTools side-by-side diff pass; Vitest for the 8 interactions ([§1](#1-fidelity-bar)); decide fixed-width vs responsive ([§12](#12-open-questions)) | Visual diff negligible at 1280–1440px; all 8 interaction tests green; every backend call goes through `BackendClient`; no dead handlers |
| **P6** *(later, not now)* | **Swap stub → urql** | `createUrqlBackend` implementing `BackendClient` against [DESIGN §7](./DESIGN.md#7-graphql-api); resolve [§6](#6-ui--backend-schema-reconciliation) flags with backend | App runs on real data with **no component changes**; mockup-only fields handled per agreed schema |

---

## 11. Verification (pixel fidelity)

- **Side-by-side**: open the original bundle (`Taperoot Portal Frontend Design.html`) and the running app in two windows at the same width; compare per tab.
- **Chrome DevTools MCP** ([browser-testing-with-devtools](./DESIGN.md)): screenshot both, overlay/diff; spot-check computed styles (font, colour, radius, spacing) on key nodes.
- **Token audit**: grep the app for raw hex/px that *should* be a token — drift usually hides in a stray literal.
- **Interaction tests**: Vitest + RTL cover the [§1](#1-fidelity-bar) table.

---

## 12. Open questions

1. **People-on-a-conversation vs one-contact-per-convo** — the mockup's multi-attach UI conflicts with [DESIGN assumption #3](./DESIGN.md#3-assumptions). Extend schema (many-to-many) or reframe? *(Blocks only P6, not the UI.)*
2. **Mockup-only fields** ([§6](#6-ui--backend-schema-reconciliation)): `tags`, `met`, `phone`, `deal`, conversation `title/duration/channel/keyPoints`, transcript `time` — add to the schema, derive, or keep UI-only?
3. **Responsive?** The mockup is a fixed `100vh` desktop layout (308px / 360px / 780px fixed). Keep fixed for an exact clone, or add breakpoints? Recommend **fixed now**, responsive as a later pass.
4. **`lastTouch`** — seed a string, or compute from the latest note/conversation date once data is real?

---

## Appendix A. Exact design tokens

Ported verbatim from the mockup. These become `styles/tokens.css`.

### Colour
| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#FAF6EE` | page / sidebar / main background |
| `--panel` | `#F1ECE1` | header background |
| `--panel-track` | `#E9E2D5` | nav pill track + segmented track |
| `--card` | `#FFFFFF` | cards, search box, pills, selected row |
| `--ink` | `#1B1714` | primary text; segmented-on background |
| `--ink-soft` | `#22201C` | avatar initials; ink chip background |
| `--ink-invert` | `#F4EFE6` | text on ink |
| `--text-2` | `#3A352E` | note / body copy |
| `--text-3` | `#6E665C` | secondary text |
| `--muted` | `#9B9284` | tertiary text |
| `--muted-2` | `#A39A8C` | labels, placeholders, muted icons |
| `--muted-3` | `#8A8378` | nav-off text |
| `--coral` | `#F7654E` | primary buttons, accent dots, summary waveform |
| `--coral-deep` | `#C24A33` | link/icon strokes, due dates, conv-list waveform |
| `--tag-coral-bg` / `--tag-coral-fg` | `#FBE0D8` / `#C24A33` | "coral" chip |
| `--tag-ink-bg` / `--tag-ink-fg` | `#22201C` / `#F4EFE6` | "ink" chip |
| `--tag-soft-bg` / `--tag-soft-fg` | `#ECE5D9` / `#6E665C` | "soft" chip |
| `--border` | `#E1D9CA` | header border, search border |
| `--border-2` | `#E8E1D4` | sidebar / section dividers |
| `--border-card` | `#ECE5D9` | card borders |
| `--border-card-2` | `#E6DFD2` | pill links, selected-row border |
| `--border-line` | `#E4DDCF` | note timeline line |
| `--border-btn` | `#DCD4C5` | outline-button border |
| `--border-dashed` | `#C9C0B0` | checkbox border, dashed "+ Add person" |
| `--scroll-thumb` | `#D6CDBC` | custom scrollbar thumb |

**Avatar tones** (per contact, in order): `#F3D3C7`, `#CFE0E6`, `#D7DEC6`, `#E6D2C2`, `#DDD4E6`, `#E8DEC8`. **Speaker tones**: S1 `#E2DACB`, S2 `#CFE0E6`.

**Shadows**: `--shadow-sm: 0 1px 2px rgba(0,0,0,.05)` (cards/rows) · `0 1px 2px rgba(0,0,0,.06)` (nav-on) · `--shadow-pop: 0 10px 30px rgba(0,0,0,.15)` (add-person dropdown).

### Typography
| Token | Value |
|---|---|
| `--font-sans` | `'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif` |
| `--font-serif` | `'Newsreader', Georgia, 'Times New Roman', serif` |

Key sizes — logo 24/600 serif (`-0.005em`); contact name 28/500 serif; convo title 25/500 serif; section headings 19–20/500 serif; body 14–15 (line-height 1.58–1.62); nav/buttons 13/600; meta 12; uppercase labels 11/700 (`letter-spacing .07–.09em`). Avatar initials always serif.

## Appendix B. Exact layout & sizes

| Element | Value |
|---|---|
| Header height | `64px`, padding `0 24px` |
| Sidebar width | `308px` |
| Follow-ups column | `360px` |
| Summary / transcript max-width | `780px` |
| Avatars | list `36`, detail `60`, convo header `52` (radius `14`), person chip `24`, add-list `30`, transcript `36` — all `border-radius:50%` except convo-header |
| Radii | pills `999px`; cards `12 / 14 / 16px`; logo badge `6px`; convo icon `10px` |
| Stat / followup cards | `border:1px solid var(--border-card)`, radius `12–14px`, padding `14px 16px` |

## Appendix C. View-model types (sketch)

`src/data/types.ts` — shaped for the UI; `id` added (the mockup used array indices).

```ts
export type ChipTone = 'coral' | 'ink' | 'soft'
export type FollowupStatus = 'open' | 'done'

export interface Tag    { label: string; tone: ChipTone }            // mockup-only (§6)
export interface Note   { id: string; date: string; text: string }   // → backend Note
export interface Followup { id: string; text: string; due: string; status?: FollowupStatus } // → backend Followup
export interface Met    { event: string; where: string; date: string }   // mockup-only (§6)
export interface Deal   { name: string; stage: string; value: string }   // mockup-only (§6)

export interface Contact {
  id: string
  name: string; role: string; company: string; email: string
  phone: string                 // mockup-only (§6)
  tags: Tag[]                   // mockup-only (§6)
  met: Met                      // mockup-only (§6)
  lastTouch: string             // mockup-only / derivable (§6)
  deal: Deal                    // mockup-only (§6)
  notes: Note[]
  followups: Followup[]
}

export interface TranscriptLine { speaker: 1 | 2; time: string; text: string } // time mockup-only (§6)
export interface Conversation {
  id: string
  title: string; date: string; duration: string; channel: string  // title/duration/channel mockup-only (§6)
  summary: string
  keyPoints: string[]                                              // mockup-only (§6)
  transcript: TranscriptLine[]
}
```

> `initials` and `tone` are **not** stored — computed in `derive.ts` (`initials(name)`, `toneFor(index)`), matching the mockup's per-row values.
