import { useState } from 'react';
import { useContactsContext } from '../../contexts/ContactsContext.tsx';
import { useContactDetail } from '../../hooks/useContactDetail.ts';
import { SidebarPanel } from '../../ui/SidebarPanel.tsx';
import { ContactCard } from '../contacts/ContactCard.tsx';
import { ConversationSidebar } from './ConversationSidebar.tsx';
import { ConversationDetail } from './ConversationDetail.tsx';
import type { Conversation } from '../../types.ts';

export function NotetakerView() {
  const { contacts } = useContactsContext();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);

  // Default to the first contact that actually has conversations.
  const firstWithConvo = contacts.find(c => c.conversations.length > 0) ?? null;
  const activeContactId = selectedContactId ?? firstWithConvo?.id ?? contacts[0]?.id ?? null;

  const { contact } = useContactDetail(activeContactId);
  const convos: Conversation[] = contact?.conversations ?? [];
  const activeConvoId = selectedConvoId ?? convos[0]?.id ?? null;
  const activeConvo = convos.find(c => c.id === activeConvoId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <SidebarPanel title="Contacts">
        {contacts.map(c => (
          <ContactCard key={c.id} contact={c} selected={activeContactId === c.id}
            onClick={() => { setSelectedContactId(c.id); setSelectedConvoId(null); }} />
        ))}
      </SidebarPanel>

      <ConversationSidebar conversations={convos} activeId={activeConvoId} onSelect={setSelectedConvoId} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeConvo
          ? <ConversationDetail key={activeConvo.id} conversation={activeConvo} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a contact and conversation</div>}
      </div>
    </div>
  );
}
