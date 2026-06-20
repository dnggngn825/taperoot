import { useState } from 'react';
import { Header } from '../Header.tsx';
import { ContactsView } from '../features/contacts/ContactsView.tsx';
import { NotetakerView } from '../features/notetaker/NotetakerView.tsx';

type Tab = 'contacts' | 'notetaker';

export function AppShell() {
  const [tab, setTab] = useState<Tab>('contacts');
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <Header tab={tab} onTabChange={setTab} />
      {tab === 'contacts' ? <ContactsView /> : <NotetakerView />}
    </div>
  );
}
