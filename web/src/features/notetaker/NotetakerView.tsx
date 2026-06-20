import { useState } from 'react';
import { useContactsContext } from '../../contexts/ContactsContext.tsx';
import { useContactDetail } from '../../hooks/useContactDetail.ts';
import { SidebarPanel } from '../../ui/SidebarPanel.tsx';
import { ConversationDetail } from './ConversationDetail.tsx';
import { formatDate } from '../../lib/format.ts';

function firstSentence(summary: string | null): string {
  if (!summary) return 'No summary';
  const match = summary.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : summary.slice(0, 80).trim();
}

export function NotetakerView() {
  const { contacts } = useContactsContext();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);

  const allConvos = contacts
    .flatMap(c => c.conversations.map(cv => ({ ...cv, contactId: c.id, contactName: c.name })))
    .sort((a, b) => b.convoDate.localeCompare(a.convoDate));

  const activeConvoId = selectedConvoId ?? allConvos[0]?.id ?? null;
  const activeConvoMeta = allConvos.find(c => c.id === activeConvoId) ?? null;

  const { contact } = useContactDetail(activeConvoMeta?.contactId ?? null);
  const activeConvo = contact?.conversations.find(c => c.id === activeConvoId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <SidebarPanel title="Conversations">
        {allConvos.length === 0 && (
          <div style={{ padding: '8px 8px', color: 'var(--muted)', fontSize: 13 }}>No conversations yet</div>
        )}
        {allConvos.map(c => {
          const active = activeConvoId === c.id;
          return (
            <button key={c.id} type="button" onClick={() => setSelectedConvoId(c.id)} style={{
              display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit',
              padding: '10px 11px', borderRadius: 'var(--r-row)', cursor: 'pointer', marginBottom: 2,
              background: active ? 'var(--card)' : 'transparent',
              border: active ? '1px solid var(--border-card-2)' : '1px solid transparent',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {firstSentence(c.summary)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {c.contactName} &middot; {formatDate(c.convoDate)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>
                {c.speakerCount} speaker{c.speakerCount !== 1 ? 's' : ''} (unidentified)
              </div>
            </button>
          );
        })}
      </SidebarPanel>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeConvo
          ? <ConversationDetail key={activeConvo.id} conversation={activeConvo} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a conversation</div>}
      </div>
    </div>
  );
}
