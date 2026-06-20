# Taperoot — Frontend UI Implementation

> The concrete build runbook for [FRONTEND-UI-PLAN.md](./FRONTEND-UI-PLAN.md). Exact deps, file contents, component specs, the ported seed mapping, and step-by-step phases. Follows the plan verbatim: **two-tab pixel clone of the mockup, all data behind the `BackendClient` placeholder, no real backend.**

| | |
|---|---|
| **Executes** | [FRONTEND-UI-PLAN.md](./FRONTEND-UI-PLAN.md) |
| **Source of truth (pixels + data)** | `doc/Taperoot Portal Frontend Design.html` (mockup template + `DCLogic`) |
| **Stack** | Vite + React 18 + TypeScript (existing `web/` workspace) |
| **Out of scope** | Real persistence / AI generate / auth (parallel backend) — rendered as no-op stubs |

---

## 1. Starting point & setup

`web/` is **already scaffolded** as a stub in the monorepo (`web/{package.json,vite.config.ts,tsconfig.json,index.html,src/main.tsx,src/App.tsx,e2e/}`). Do **not** re-run `npm create vite` — build on it.

### 1.1 Verify the stub has React
```bash
# from repo root
cat web/package.json   # confirm react + react-dom + @vitejs/plugin-react + typescript present
```
If React isn't there yet: `npm i -w web react react-dom` and `npm i -D -w web @vitejs/plugin-react @types/react @types/react-dom`.

### 1.2 Add UI dependencies
```bash
npm i -w web @fontsource/hanken-grotesk @fontsource/newsreader
npm i -D -w web vitest @testing-library/react @testing-library/user-event jsdom
```

### 1.3 Wire the test runner (`web/vite.config.ts`)
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
})
```
`web/src/test-setup.ts`: `import '@testing-library/jest-dom'` (add `@testing-library/jest-dom` if you want matchers). Add script to `web/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.

---

## 2. Final file tree (target)

```
web/src/
  main.tsx              App mount + font + global style imports
  App.tsx               <AppProvider> + <Header> + (ContactsView | NotetakerView) by tab
  test-setup.ts
  styles/
    tokens.css          all CSS variables (Appendix A/B of the plan)
    global.css          reset, 100% height, scrollbar, base font
  data/
    types.ts            view-model types (plan Appendix C)
    seed.ts             6 contacts + 5 conversations + INITIAL_PEOPLE (ported from DCLogic)
    backend.ts          BackendClient interface + createInMemoryBackend()
    derive.ts           initials(), toneForContact(), AVATAR_TONES, SPEAKER_TONES, AVATAR presets
  store/
    store.tsx           reducer + AppProvider + hooks/selectors
    store.test.tsx      the 8 interaction tests
  ui/
    Avatar.tsx  Pill.tsx  TagChip.tsx  SegmentedControl.tsx  NavTabs.tsx
    icons.tsx           SearchIcon, MailIcon, PhoneIcon, WaveformIcon, etc.
    *.module.css
  features/
    contacts/ ContactsView ContactSidebar ContactDetail StatCards NotesTimeline Followups (+ .module.css)
    notetaker/ NotetakerView ConversationSidebar ConversationDetail PeopleRow SummaryPanel TranscriptPanel (+ .module.css)
  Header.tsx
```

---

## 3. Foundational files (write these first, verbatim)

### 3.1 `styles/tokens.css`
```css
:root {
  /* surfaces */
  --paper:#FAF6EE; --panel:#F1ECE1; --panel-track:#E9E2D5; --card:#FFFFFF;
  /* text */
  --ink:#1B1714; --ink-soft:#22201C; --ink-invert:#F4EFE6;
  --text-2:#3A352E; --text-3:#6E665C; --muted:#9B9284; --muted-2:#A39A8C; --muted-3:#8A8378;
  /* accent */
  --coral:#F7654E; --coral-deep:#C24A33;
  /* tag chips */
  --tag-coral-bg:#FBE0D8; --tag-coral-fg:#C24A33;
  --tag-ink-bg:#22201C;   --tag-ink-fg:#F4EFE6;
  --tag-soft-bg:#ECE5D9;  --tag-soft-fg:#6E665C;
  /* borders */
  --border:#E1D9CA; --border-2:#E8E1D4; --border-card:#ECE5D9; --border-card-2:#E6DFD2;
  --border-line:#E4DDCF; --border-btn:#DCD4C5; --border-dashed:#C9C0B0; --scroll-thumb:#D6CDBC;
  /* shadows */
  --shadow-sm:0 1px 2px rgba(0,0,0,.05);
  --shadow-nav:0 1px 2px rgba(0,0,0,.06);
  --shadow-pop:0 10px 30px rgba(0,0,0,.15);
  /* type */
  --font-sans:'Hanken Grotesk',-apple-system,BlinkMacSystemFont,sans-serif;
  --font-serif:'Newsreader',Georgia,'Times New Roman',serif;
  /* radii */
  --r-pill:999px; --r-card:14px; --r-card-lg:16px; --r-row:12px; --r-logo:6px; --r-convo-icon:10px;
  /* dimensions */
  --h-header:64px; --w-sidebar:308px; --w-followups:360px; --max-readcol:780px;
}
```

### 3.2 `styles/global.css`
```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--paper); color: var(--ink); font-family: var(--font-sans); }
.scroll-area { overflow: auto; }
.scroll-area::-webkit-scrollbar { width: 8px; height: 8px; }
.scroll-area::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 8px; }
```

### 3.3 `main.tsx`
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
// font weights actually used (Appendix A): Hanken 400/500/600/700, Newsreader 400/500/600
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```

### 3.4 `data/types.ts` — plan Appendix C, verbatim
Copy [FRONTEND-UI-PLAN.md Appendix C](./FRONTEND-UI-PLAN.md#appendix-c-view-model-types-sketch) as-is. (`Contact`, `Conversation`, `Note`, `Followup`, `Tag`, `Met`, `Deal`, `TranscriptLine`, `ChipTone`, `FollowupStatus`.)

### 3.5 `data/derive.ts`
```ts
import type { ChipTone } from './types'
import { CONTACT_ORDER } from './seed'

export const AVATAR_TONES = ['#F3D3C7','#CFE0E6','#D7DEC6','#E6D2C2','#DDD4E6','#E8DEC8']
export const SPEAKER_TONES: Record<1 | 2, string> = { 1:'#E2DACB', 2:'#CFE0E6' }

/** Avatar size+font presets from plan Appendix B. */
export const AVATAR = {
  list:    { size:36, font:14, radius:'50%' as const },
  detail:  { size:60, font:23, radius:'50%' as const },
  chip:    { size:24, font:11, radius:'50%' as const },
  add:     { size:30, font:12, radius:'50%' as const },
  speaker: { size:36, font:13, radius:'50%' as const },
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

/** Tone keyed on the contact's STABLE position, not its rendered index —
 *  so search/filtering never recolours an avatar. */
export function toneForContact(id: string): string {
  const i = CONTACT_ORDER.indexOf(id)
  return AVATAR_TONES[(i < 0 ? 0 : i) % AVATAR_TONES.length]
}

export const CHIP_CLASS: Record<ChipTone, string> = { coral:'coral', ink:'ink', soft:'soft' }
```
> **Why `toneForContact(id)` not `toneFor(index)`:** the mockup colours avatars by the contact's index in the full list. If we used the rendered-row index, filtering the list would shift colours. Keying on the stable seed order fixes that. This is the one place the plan's "derive by index" needs care.

### 3.6 `data/backend.ts` — plan §5, verbatim
Copy the `BackendClient` interface ([§5.1](./FRONTEND-UI-PLAN.md#51-one-seam-backendclient)) and `createInMemoryBackend()` ([§5.2](./FRONTEND-UI-PLAN.md#52-todays-implementation-in-memory-stub)). Keep the `// TODO(backend): <urql op> — DESIGN §n` markers — they are the swap checklist. Add `getConversation(id)` if a detail fetch is wanted; otherwise the store holds the loaded list and selects by id.

### 3.7 `data/seed.ts` — ported from the mockup `DCLogic`

Structure + the mockup→view-model mapping. **Port all 6 contacts and 5 conversations verbatim from the mockup's `DCLogic.contacts()` / `conversations()`** (in `Taperoot Portal Frontend Design.html`).

**ID + tone assignment (stable order):**

| idx | Contact (mockup) | id | role · company |
|---|---|---|---|
| 0 | Grant Sullivan | `cnt-grant` | Bouldering Instructor · Vertex Climbing Co. |
| 1 | Maya Okafor | `cnt-maya` | Head of Partnerships · Lumen Health |
| 2 | Daniel Reyes | `cnt-daniel` | Founder & CEO · Northwind Studio |
| 3 | Priya Nair | `cnt-priya` | Product Lead · Tessellate |
| 4 | Tom Lindqvist | `cnt-tom` | VP Sales · Carta Logistics |
| 5 | Aisha Bello | `cnt-aisha` | Brand Director · Field & Form |

| idx | Conversation (mockup) | id |
|---|---|---|
| 0 | Vertex onboarding walkthrough | `cnv-vertex` |
| 1 | Lumen co-marketing sync | `cnv-lumen` |
| 2 | Northwind API deep dive | `cnv-northwind` |
| 3 | Carta security review | `cnv-carta` |
| 4 | Field & Form kickoff | `cnv-field` |

**Field mapping (DCLogic → `types.ts`):**

| Mockup | View-model | Note |
|---|---|---|
| `name/role/company/email/phone` | same | direct |
| `tags:[{label,tone}]` | `tags` | `tone` ∈ coral\|ink\|soft |
| `met:{event,where,date}` | `met` | direct |
| `lastTouch` | `lastTouch` | string |
| `deal:{name,stage,value}` | `deal` | direct |
| `notes:[{date,text}]` | `notes:[{id,date,text}]` | add `id:'note-<c>-<n>'` |
| `followups:[{text,due}]` | `followups:[{id,text,due,status:'open'}]` | add `id`, default status |
| convo `title/date/duration/channel/summary/keyPoints` | same | direct |
| convo `transcript:[{sp,time,text}]` | `transcript:[{speaker:sp,time,text}]` | rename `sp`→`speaker` |
| `initials`, `tone` | — | **derived**, never stored |

**Worked example (one contact + one conversation), the rest follow identically:**
```ts
import type { Contact, Conversation } from './types'

export const seedContacts: Contact[] = [
  {
    id: 'cnt-grant', name: 'Grant Sullivan', role: 'Bouldering Instructor',
    company: 'Vertex Climbing Co.', email: 'grant@vertexclimb.co', phone: '+1 303 555 0142',
    tags: [{ label:'Warm lead', tone:'coral' }, { label:'Climbing', tone:'soft' }],
    met: { event:'Outdoor Retailer Expo', where:'Denver, CO', date:'Jan 18, 2026' },
    lastTouch: '4 days ago',
    deal: { name:'Vertex — Team (12 seats)', stage:'Proposal sent', value:'$4,200/yr' },
    notes: [
      { id:'note-grant-1', date:'Jan 18, 2026', text:'Met at the Vertex booth. Demoed the team plan …' },
      // … port remaining notes verbatim
    ],
    followups: [
      { id:'fu-grant-1', text:'Send onboarding deck', due:'Due Fri', status:'open' },
      // … port remaining followups
    ],
  },
  // … cnt-maya, cnt-daniel, cnt-priya, cnt-tom, cnt-aisha
]

export const seedConversations: Conversation[] = [
  {
    id: 'cnv-vertex', title:'Vertex onboarding walkthrough', date:'Feb 2, 2026',
    duration:'32 min', channel:'Zoom',
    summary:'The call covered a plan to issue digital cards to instructors …',
    keyPoints: ['Rolling cards out to instructors at 3 new locations this spring.', /* … */],
    transcript: [
      { speaker:1, time:'00:12', text:"Thanks for hopping on. Want to start with how you're thinking about rolling cards out…" },
      { speaker:2, time:'00:31', text:"Yeah — we've got three locations opening this spring…" },
      // … port remaining lines verbatim
    ],
  },
  // … cnv-lumen, cnv-northwind, cnv-carta, cnv-field
]

/** Stable contact order — drives avatar tone (see derive.ts). */
export const CONTACT_ORDER = seedContacts.map(c => c.id)

/** Initial conversation→contact attachments (mockup people {0:[0],1:[1],2:[2],3:[4],4:[5]}). */
export const INITIAL_PEOPLE: Record<string, string[]> = {
  'cnv-vertex':   ['cnt-grant'],
  'cnv-lumen':    ['cnt-maya'],
  'cnv-northwind':['cnt-daniel'],
  'cnv-carta':    ['cnt-tom'],
  'cnv-field':    ['cnt-aisha'],
}
```

### 3.8 `store/store.tsx`
```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { Contact, Conversation } from '../data/types'
import { createInMemoryBackend, type BackendClient } from '../data/backend'
import { CONTACT_ORDER, INITIAL_PEOPLE, seedConversations } from '../data/seed'

type Tab = 'contacts' | 'notetaker'
type NoteTab = 'summary' | 'transcript'

interface UIState {
  tab: Tab
  selectedContactId: string
  selectedConversationId: string
  noteTab: NoteTab
  peopleByConversation: Record<string, string[]>
  addPersonOpen: boolean
}

type Action =
  | { type:'SET_TAB'; tab: Tab }
  | { type:'SELECT_CONTACT'; id: string }
  | { type:'SELECT_CONVERSATION'; id: string }
  | { type:'SET_NOTE_TAB'; tab: NoteTab }
  | { type:'TOGGLE_ADD' }
  | { type:'ATTACH_PERSON'; conversationId: string; contactId: string }
  | { type:'DETACH_PERSON'; conversationId: string; contactId: string }

const INITIAL_UI: UIState = {
  tab: 'contacts',
  selectedContactId: CONTACT_ORDER[0],
  selectedConversationId: seedConversations[0].id,
  noteTab: 'summary',
  peopleByConversation: INITIAL_PEOPLE,
  addPersonOpen: false,
}

function reducer(s: UIState, a: Action): UIState {
  switch (a.type) {
    case 'SET_TAB': return { ...s, tab: a.tab }
    case 'SELECT_CONTACT': return { ...s, selectedContactId: a.id }
    case 'SELECT_CONVERSATION': return { ...s, selectedConversationId: a.id, addPersonOpen: false }
    case 'SET_NOTE_TAB': return { ...s, noteTab: a.tab }
    case 'TOGGLE_ADD': return { ...s, addPersonOpen: !s.addPersonOpen }
    case 'ATTACH_PERSON': {
      const cur = s.peopleByConversation[a.conversationId] ?? []
      const next = cur.includes(a.contactId) ? cur : [...cur, a.contactId]
      return { ...s, addPersonOpen: false, peopleByConversation: { ...s.peopleByConversation, [a.conversationId]: next } }
    }
    case 'DETACH_PERSON': {
      const cur = s.peopleByConversation[a.conversationId] ?? []
      return { ...s, peopleByConversation: { ...s.peopleByConversation, [a.conversationId]: cur.filter(id => id !== a.contactId) } }
    }
    default: return s
  }
}

const backend: BackendClient = createInMemoryBackend()  // swap → createUrqlBackend(client) later

interface AppCtx {
  ui: UIState
  dispatch: React.Dispatch<Action>
  contacts: Contact[]
  conversations: Conversation[]
  backend: BackendClient
  reload: () => Promise<void>
}
const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ui, dispatch] = useReducer(reducer, INITIAL_UI)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])

  const reload = useCallback(async () => {
    const [c, cv] = await Promise.all([backend.listContacts(), backend.listConversations()])
    setContacts(c); setConversations(cv)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const value = useMemo(() => ({ ui, dispatch, contacts, conversations, backend, reload }),
    [ui, contacts, conversations, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within <AppProvider>')
  return v
}

// selectors
export function useSelectedContact() {
  const { contacts, ui } = useApp()
  return contacts.find(c => c.id === ui.selectedContactId) ?? null
}
export function useSelectedConversation() {
  const { conversations, ui } = useApp()
  return conversations.find(c => c.id === ui.selectedConversationId) ?? null
}
export function useCurrentPeople(): Contact[] {
  const { contacts, ui } = useApp()
  const ids = ui.peopleByConversation[ui.selectedConversationId] ?? []
  return ids.map(id => contacts.find(c => c.id === id)).filter(Boolean) as Contact[]
}
export function useAvailableContacts(): Contact[] {
  const { contacts, ui } = useApp()
  const ids = new Set(ui.peopleByConversation[ui.selectedConversationId] ?? [])
  return contacts.filter(c => !ids.has(c.id))
}
```

### 3.9 `App.tsx`
```tsx
import { AppProvider, useApp } from './store/store'
import Header from './Header'
import ContactsView from './features/contacts/ContactsView'
import NotetakerView from './features/notetaker/NotetakerView'

function Shell() {
  const { ui, contacts } = useApp()
  if (!contacts.length) return null // in-memory resolves immediately; guards the first paint
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--paper)', fontFamily:'var(--font-sans)' }}>
      <Header />
      {ui.tab === 'contacts' ? <ContactsView /> : <NotetakerView />}
    </div>
  )
}
export default function App() { return <AppProvider><Shell /></AppProvider> }
```

---

## 4. Shared UI primitives (`ui/`)

| Component | Props | Renders / fidelity notes |
|---|---|---|
| `Avatar` | `{ tone:string; initials:string; preset:'list'\|'detail'\|'chip'\|'add'\|'speaker' }` | circle (`AVATAR[preset]` size+font), serif initials, `color:var(--ink-soft)`, `flex:none` |
| `Pill` | `{ variant:'primary'\|'outline'\|'ghost'; onClick?; children }` | radius `var(--r-pill)`, 13/600; primary `bg var(--coral) color #fff`; outline `bg var(--card) border var(--border-btn)`; ghost transparent |
| `TagChip` | `{ tone:ChipTone; children }` | radius pill, 12/600, `data-tone` → bg/fg from `--tag-*` tokens |
| `SegmentedControl` | `{ value; options:[{value,label}]; onChange }` | track `bg var(--panel-track)` radius pill pad 3; active `bg var(--ink) color var(--ink-invert)` |
| `NavTabs` | `{ value:Tab; onChange }` | track `bg var(--panel-track)`; active pill `bg #fff shadow var(--shadow-nav)`; inactive `color var(--muted-3)` |
| `icons.tsx` | per-icon | inline SVG copied 1:1 from mockup: search (magnifier), mail, phone, waveform bars (CSS divs ok), × |

**`Avatar` skeleton:**
```tsx
import { AVATAR } from '../data/derive'
type P = { tone: string; initials: string; preset?: keyof typeof AVATAR }
export function Avatar({ tone, initials, preset = 'list' }: P) {
  const a = AVATAR[preset]
  return (
    <div style={{ width:a.size, height:a.size, borderRadius:a.radius, background:tone,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-serif)', fontSize:a.font, color:'var(--ink-soft)', flex:'none' }}>
      {initials}
    </div>
  )
}
```

---

## 5. Contacts feature (`features/contacts/`)

Layout: `<div flex:1 display:flex>` → `<ContactSidebar 308px>` + `<ContactDetail flex:1>`.

| Component | Props (from store/selectors) | Renders |
|---|---|---|
| `ContactsView` | — | sidebar + detail wrapper |
| `ContactSidebar` | `contacts`, `ui.selectedContactId`, `dispatch` | **static** search box (see note) + `.scroll-area` list of `ContactRow` |
| `ContactRow` | `{ contact; selected; onClick }` | `Avatar list` + name(14/600) + role(12/muted); selected → `bg #fff border var(--border-card-2) shadow var(--shadow-sm)`, else transparent |
| `ContactDetail` | `useSelectedContact()` | header (Avatar detail, name 28 serif, `TagChip`s, role·company, email/phone `Pill` links, **Log note**/**Edit**), `StatCards`, body |
| `StatCards` | `contact.met/lastTouch/deal` | 3 cards: "Where we met", "Last touch", "Open deal"; label 11/700 uppercase `var(--muted-2)` |
| `NotesTimeline` | `contact.notes` | "Notes & history" + `+ Note` ghost pill; coral-dot timeline + vertical `var(--border-line)` line |
| `Followups` | `contact.followups` | 360px col; "Follow-ups" + `+ Task`; cards with checkbox box + text + `due`(coral-deep 12/600) |

**Fidelity notes**
- The mockup search box is a **static, non-functional** element (a styled `div`, not an `<input>` — `DCLogic` has no search handler). Render it visually identical; **do not** add filtering. `backend.listContacts(q)` exists for when search becomes real.
- Selected-row style comes from `DCLogic` `rowOn`/`rowOff` — reproduce exactly.
- **Log note / Edit / + Note / + Task / + Add contact** → named no-op handlers (`onLogNote`, …), never dead clicks.

**`ContactRow` skeleton:**
```tsx
import { Avatar } from '../../ui/Avatar'
import { initials, toneForContact } from '../../data/derive'
import type { Contact } from '../../data/types'

export function ContactRow({ contact, selected, onClick }:
  { contact: Contact; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:11, padding:'10px 11px',
      borderRadius:'var(--r-row)', cursor:'pointer',
      background: selected ? 'var(--card)' : 'transparent',
      border: selected ? '1px solid var(--border-card-2)' : '1px solid transparent',
      boxShadow: selected ? 'var(--shadow-sm)' : 'none',
    }}>
      <Avatar preset="list" tone={toneForContact(contact.id)} initials={initials(contact.name)} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contact.name}</div>
        <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contact.role}</div>
      </div>
    </div>
  )
}
```
Wire click: `dispatch({ type:'SELECT_CONTACT', id: contact.id })`.

---

## 6. Notetaker feature (`features/notetaker/`)

Layout mirrors Contacts: `<ConversationSidebar 308px>` + `<ConversationDetail flex:1>`.

| Component | Props | Renders |
|---|---|---|
| `NotetakerView` | — | sidebar + detail |
| `ConversationSidebar` | `conversations`, `ui.selectedConversationId`, `dispatch` | "Conversations" label + `.scroll-area` rows (waveform icon, title 14/600, date·duration 12) |
| `ConversationDetail` | `useSelectedConversation()`, `ui.noteTab` | header (waveform 52/r14, title 25 serif, date·duration·channel, **Ask AI**/**Share**), `PeopleRow`, `SegmentedControl`, then `SummaryPanel` or `TranscriptPanel` |
| `PeopleRow` | `useCurrentPeople()`, `useAvailableContacts()`, `ui.addPersonOpen`, `dispatch` | "People" label + person chips (Avatar chip + name + `×`) + dashed **+ Add person** button + dropdown |
| `SummaryPanel` | `conversation.summary`, `.keyPoints` | summary card (diamond + "AI summary" label + paragraph) + "Key points" coral-dot bullets |
| `TranscriptPanel` | `conversation.transcript` | per line: `Avatar speaker` (tone `SPEAKER_TONES[line.speaker]`, initials `S1/S2`), speaker label 14/700, time 12, text |

**`PeopleRow` (the most complex interaction) — skeleton:**
```tsx
import { useApp, useAvailableContacts, useCurrentPeople } from '../../store/store'
import { Avatar } from '../../ui/Avatar'
import { initials, toneForContact } from '../../data/derive'

export function PeopleRow() {
  const { ui, dispatch, backend } = useApp()
  const people = useCurrentPeople()
  const available = useAvailableContacts()
  const convId = ui.selectedConversationId

  const add = (contactId: string) => {
    dispatch({ type:'ATTACH_PERSON', conversationId: convId, contactId })
    void backend.attachPerson(convId, contactId)        // stub no-op today
  }
  const remove = (contactId: string) => {
    dispatch({ type:'DETACH_PERSON', conversationId: convId, contactId })
    void backend.detachPerson(convId, contactId)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      {/* "People" label … */}
      {people.map(p => (
        <span key={p.id} /* chip styles */>
          <Avatar preset="chip" tone={toneForContact(p.id)} initials={initials(p.name)} />
          <span>{p.name}</span>
          <button onClick={() => remove(p.id)}>×</button>
        </span>
      ))}
      <div style={{ position:'relative' }}>
        <button onClick={() => dispatch({ type:'TOGGLE_ADD' })} /* dashed pill */>+ Add person</button>
        {ui.addPersonOpen && (
          <div /* dropdown: absolute, shadow-pop, list of available */>
            {available.map(a => (
              <div key={a.id} onClick={() => add(a.id)} /* row */>
                <Avatar preset="add" tone={toneForContact(a.id)} initials={initials(a.name)} />
                <div>{a.name}<div>{a.role}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Fidelity notes**
- Tab/panel show-hide: the mockup toggles `display:none`; we render conditionally (same visual result). Keep both tabs mounted only if you need to match scroll-position retention — not required.
- Waveform icons: copy the mockup's small `<div>` bars (widths/heights/colours) exactly; coral `var(--coral)` in the convo header, `var(--coral-deep)` in the list rows.

---

## 7. Build order (phases → concrete steps)

Each phase ends green before the next ([plan §10](./FRONTEND-UI-PLAN.md#10-implementation-phases)).

### P0 — Scaffold + tokens + fonts
1. §1 setup (deps, vitest config).
2. Write `tokens.css`, `global.css`, `main.tsx`.
3. Temporary `App.tsx` rendering the 64px header bar (logo only) on `--paper`.
4. **Exit:** `npm run dev -w web` serves; bg `#FAF6EE`; both fonts load (check Network); header bar `64px`/`#F1ECE1`; zero console errors.

### P1 — Data layer + placeholder backend
1. `types.ts` (Appendix C), `seed.ts` (port all 6 contacts + 5 convos + `INITIAL_PEOPLE` + `CONTACT_ORDER`), `derive.ts`, `backend.ts`.
2. **Exit:** a throwaway `console.log(await createInMemoryBackend().listContacts())` shows 6; `listConversations()` shows 5; `tsc -b web` clean. (Optional unit test now or in P5.)

### P2 — Store + Header + tab switch
1. `store/store.tsx`; wrap `App` in `<AppProvider>`.
2. `ui/NavTabs.tsx`, `Header.tsx` (logo wordmark, NavTabs, right-side count: `126 contacts` on Contacts tab / `42 conversations` on Notetaker, primary CTA `+ Add contact` / `+ New note`).
3. `App.tsx` switches view on `ui.tab`.
4. **Exit:** clicking Contacts/Notetaker swaps view; nav pill on/off exact; counts + CTA change per tab.
> The header counts (`126`, `42`) are literal mockup strings, not `contacts.length` (6). Keep them literal to match pixels (or note them as static).

### P3 — Contacts tab (full slice)
1. `ui/Avatar`, `Pill`, `TagChip`, `icons`.
2. `ContactSidebar` (+ static search box) → `ContactRow`; wire `SELECT_CONTACT`.
3. `ContactDetail` + `StatCards` + `NotesTimeline` + `Followups`.
4. **Exit:** side-by-side with mockup Contacts tab = indistinguishable; row select updates detail + highlight; all 6 contacts render notes/followups; scrollbar matches.

### P4 — Notetaker tab (full slice)
1. `ui/SegmentedControl`.
2. `ConversationSidebar` → rows; wire `SELECT_CONVERSATION`.
3. `ConversationDetail` header; `PeopleRow` (attach/detach + dropdown); `SummaryPanel`; `TranscriptPanel`.
4. **Exit:** indistinguishable; segmented toggles summary/transcript; add/remove person works and persists per conversation when switching; dropdown lists only unattached; 3-speaker-free transcript renders (mockup is 2-speaker).

### P5 — Pixel QA + stub wiring + tests
1. Route every no-op button to a named handler; confirm no dead `onClick`/`href`.
2. `store/store.test.tsx` — the 8 interactions (§8).
3. DevTools side-by-side diff at 1280 & 1440; token audit (`grep` for stray hex/px).
4. **Exit:** visual diff negligible; 8 tests green; every server call goes through `BackendClient`.

---

## 8. Tests (`store/store.test.tsx`)

Cover the 8 interactions from [plan §1](./FRONTEND-UI-PLAN.md#1-fidelity-bar). Reducer-level (pure, fast) for 1–8; one RTL render test for the dropdown.

```ts
import { describe, it, expect } from 'vitest'
// import { reducer, INITIAL_UI } from './store'  // export them for testing

describe('UI reducer', () => {
  it('switches tab', () => expect(reducer(INITIAL_UI, {type:'SET_TAB',tab:'notetaker'}).tab).toBe('notetaker'))
  it('selects contact', () => expect(reducer(INITIAL_UI, {type:'SELECT_CONTACT',id:'cnt-maya'}).selectedContactId).toBe('cnt-maya'))
  it('selecting a conversation closes the add dropdown', () => {
    const open = { ...INITIAL_UI, addPersonOpen:true }
    expect(reducer(open, {type:'SELECT_CONVERSATION',id:'cnv-lumen'}).addPersonOpen).toBe(false)
  })
  it('toggles note tab', () => expect(reducer(INITIAL_UI, {type:'SET_NOTE_TAB',tab:'transcript'}).noteTab).toBe('transcript'))
  it('attach adds + closes dropdown', () => {
    const s = reducer(INITIAL_UI, {type:'ATTACH_PERSON',conversationId:'cnv-vertex',contactId:'cnt-maya'})
    expect(s.peopleByConversation['cnv-vertex']).toContain('cnt-maya'); expect(s.addPersonOpen).toBe(false)
  })
  it('attach is idempotent', () => {
    const s = reducer(INITIAL_UI, {type:'ATTACH_PERSON',conversationId:'cnv-vertex',contactId:'cnt-grant'})
    expect(s.peopleByConversation['cnv-vertex']).toEqual(['cnt-grant'])  // already present, no dupe
  })
  it('detach removes', () => {
    const s = reducer(INITIAL_UI, {type:'DETACH_PERSON',conversationId:'cnv-vertex',contactId:'cnt-grant'})
    expect(s.peopleByConversation['cnv-vertex']).toEqual([])
  })
  it('people persist per conversation', () => {
    let s = reducer(INITIAL_UI, {type:'ATTACH_PERSON',conversationId:'cnv-vertex',contactId:'cnt-maya'})
    s = reducer(s, {type:'SELECT_CONVERSATION',id:'cnv-lumen'})
    s = reducer(s, {type:'SELECT_CONVERSATION',id:'cnv-vertex'})
    expect(s.peopleByConversation['cnv-vertex']).toEqual(['cnt-grant','cnt-maya'])
  })
})
```
> Export `reducer` and `INITIAL_UI` from `store.tsx` for these (or move them to `store/reducer.ts`).

---

## 9. Verification (pixel fidelity)

- Open `Taperoot Portal Frontend Design.html` and `localhost:5173` side-by-side at the same width; compare per tab.
- Chrome DevTools MCP: screenshot + overlay; spot-check computed `font-family`, hex, `border-radius`, padding on header, a contact row, a stat card, a tag chip, the segmented control.
- Token audit: `grep -rnE "#[0-9A-Fa-f]{6}" web/src/features web/src/ui` — anything not a token is suspect.
- `npm run test -w web` green.

---

## 10. Definition of done

- [ ] Both tabs visually indistinguishable from the mockup at 1280–1440px.
- [ ] All 8 interactions work; 8 reducer tests green.
- [ ] Every read/mutation goes through `BackendClient`; components never import `seed.ts` (except `derive`/`store` for ids/defaults).
- [ ] All mockup buttons present; none dead — each calls a named handler or stub.
- [ ] Mockup-only fields render from seed; `// TODO(backend)` markers in place for the urql swap (P6).
- [ ] No raw hex/px that should be a token.

## 11. Carry-over for the backend swap (P6, later)
The [open questions in plan §12](./FRONTEND-UI-PLAN.md#12-open-questions) — esp. **people-on-a-conversation vs one-contact-per-convo** and the **mockup-only fields** — must be resolved with the backend team before `createUrqlBackend` replaces the stub. Until then the UI is fully functional on seed data.
