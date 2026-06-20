import { useState } from 'react';
import { useQuery, Provider } from 'urql';
import { client } from './lib/urql.ts';
import { CONTACTS_QUERY } from './lib/queries.ts';
import { Avatar } from './ui/Avatar.tsx';
import { Header } from './Header.tsx';

type ContactSort = 'recent_update' | 'alphabetical';

interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  aiStatus: string;
  openFollowupCount: number;
  lastActivityAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function ContactCard({ contact, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px',
      borderRadius: 'var(--r-row)', cursor: 'pointer',
      background: selected ? 'var(--card)' : 'transparent',
      border: selected ? '1px solid var(--border-card-2)' : '1px solid transparent',
      boxShadow: selected ? 'var(--shadow-sm)' : 'none',
    }}>
      <Avatar id={contact.id} name={contact.name} preset="list" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.role}{contact.company ? ` · ${contact.company}` : ''}
        </div>
      </div>
      {contact.openFollowupCount > 0 && (
        <div style={{ background: 'var(--coral)', color: '#fff', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600, padding: '2px 7px', flex: 'none' }}>
          {contact.openFollowupCount}
        </div>
      )}
    </div>
  );
}

function SortToggle({ value, onChange }: { value: ContactSort; onChange: (s: ContactSort) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--panel-track)', borderRadius: 'var(--r-pill)' }}>
      {(['recent_update', 'alphabetical'] as ContactSort[]).map((s) => {
        const active = value === s;
        return (
          <button key={s} onClick={() => onChange(s)} style={{
            padding: '4px 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: active ? '#fff' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--muted-3)',
            boxShadow: active ? 'var(--shadow-nav)' : 'none',
          }}>
            {s === 'recent_update' ? 'Recent' : 'A–Z'}
          </button>
        );
      })}
    </div>
  );
}

function ContactDetail({ contact }: { contact: Contact }) {
  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <Avatar id={contact.id} name={contact.name} preset="detail" />
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--ink)', marginBottom: 4 }}>
            {contact.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
            {contact.role}{contact.company ? ` · ${contact.company}` : ''}
          </div>
          {contact.email && (
            <a href={`mailto:${contact.email}`} style={{ fontSize: 13, color: 'var(--coral-deep)', textDecoration: 'none', display: 'block', marginTop: 2 }}>
              {contact.email}
            </a>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Last activity', value: formatDate(contact.lastActivityAt) },
          { label: 'Open follow-ups', value: String(contact.openFollowupCount), highlight: contact.openFollowupCount > 0 },
          { label: 'AI status', value: contact.aiStatus },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-2)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: highlight ? 'var(--coral-deep)' : 'var(--ink)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsView() {
  const [sort, setSort] = useState<ContactSort>('recent_update');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result] = useQuery({ query: CONTACTS_QUERY, variables: { sort } });

  const { data, fetching, error } = result;
  const contacts: Contact[] = data?.contacts ?? [];
  const activeId = selectedId ?? contacts[0]?.id ?? null;
  const selected = contacts.find(c => c.id === activeId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 'var(--w-sidebar)', flex: 'none', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
        <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Contacts</span>
          <SortToggle value={sort} onChange={setSort} />
        </div>
        <div className="scroll-area" style={{ flex: 1, padding: '0 8px 8px' }}>
          {fetching && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}
          {error && <div style={{ padding: '16px 8px', color: 'var(--coral-deep)', fontSize: 13 }}>Error loading contacts</div>}
          {!fetching && contacts.length === 0 && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>No contacts</div>}
          {contacts.map(c => (
            <ContactCard key={c.id} contact={c} selected={activeId === c.id} onClick={() => setSelectedId(c.id)} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selected
          ? <ContactDetail contact={selected} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>Select a contact</div>
        }
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<'contacts' | 'notetaker'>('contacts');
  return (
    <Provider value={client}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <Header tab={tab} onTabChange={setTab} />
        {tab === 'contacts'
          ? <ContactsView />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Notetaker — Phase 8</div>
        }
      </div>
    </Provider>
  );
}
