import { SidebarPanel } from '../../ui/SidebarPanel.tsx';
import { ContactCard } from './ContactCard.tsx';
import { SortToggle } from './SortToggle.tsx';
import type { ContactSummary, ContactSort } from '../../types.ts';

type Props = {
  contacts: ContactSummary[];
  fetching: boolean;
  error: unknown;
  activeId: string | null;
  sort: ContactSort;
  onSort: (s: ContactSort) => void;
  onSelect: (id: string) => void;
};

export function ContactSidebar({ contacts, fetching, error, activeId, sort, onSort, onSelect }: Props) {
  return (
    <SidebarPanel title="Contacts" headerRight={<SortToggle value={sort} onChange={onSort} />}>
      {fetching && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}
      {error != null && <div style={{ padding: '16px 8px', color: 'var(--coral-deep)', fontSize: 13 }}>Error loading contacts</div>}
      {!fetching && contacts.length === 0 && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>No contacts</div>}
      {contacts.map(c => (
        <ContactCard key={c.id} contact={c} selected={activeId === c.id} onClick={() => onSelect(c.id)} />
      ))}
    </SidebarPanel>
  );
}
