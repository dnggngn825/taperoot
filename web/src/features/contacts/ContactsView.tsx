import { useState } from 'react';
import { useContacts } from '../../hooks/useContacts.ts';
import { ContactSidebar } from './ContactSidebar.tsx';
import { ContactDetail } from './ContactDetail.tsx';
import type { ContactSort } from '../../types.ts';

export function ContactsView() {
  const [sort, setSort] = useState<ContactSort>('recent_update');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { contacts, fetching, error } = useContacts(sort);

  const activeId = selectedId ?? contacts[0]?.id ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <ContactSidebar contacts={contacts} fetching={fetching} error={error} activeId={activeId} sort={sort} onSort={setSort} onSelect={setSelectedId} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeId
          ? <ContactDetail contactId={activeId} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a contact</div>}
      </div>
    </div>
  );
}
