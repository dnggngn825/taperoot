import { useState } from 'react';
import { useContactsContext } from '../../contexts/ContactsContext.tsx';
import { ContactSidebar } from './ContactSidebar.tsx';
import { ContactDetail } from './ContactDetail.tsx';
import type { ContactSort } from '../../types.ts';

export function ContactsView() {
  const [sort, setSort] = useState<ContactSort>('recent_update');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { contacts, fetching, error, refetch } = useContactsContext();

  const sorted = sort === 'alphabetical'
    ? [...contacts].sort((a, b) => a.name.localeCompare(b.name))
    : contacts;
  const activeId = selectedId ?? sorted[0]?.id ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <ContactSidebar contacts={sorted} fetching={fetching} error={error} activeId={activeId} sort={sort} onSort={setSort} onSelect={setSelectedId} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeId
          ? <ContactDetail contactId={activeId} onMutated={refetch} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a contact</div>}
      </div>
    </div>
  );
}
