import { useState } from 'react';
import { useContactsContext } from '../../contexts/ContactsContext.tsx';
import { useContactDetail } from '../../hooks/useContactDetail.ts';
import { SidebarPanel } from '../../ui/SidebarPanel.tsx';
import { ConversationDetail } from './ConversationDetail.tsx';
import { formatDate } from '../../lib/format.ts';

function firstSentence(summary: string | null): string {
  if (!summary) return 'Untitled conversation';
  const match = summary.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : summary.slice(0, 80).trim();
}

function WaveformIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flex: 'none' }}>
      <rect x="3" y="10" width="3.5" height="8" rx="1.5" fill="var(--coral)" />
      <rect x="8.5" y="7" width="3.5" height="14" rx="1.5" fill="var(--coral)" />
      <rect x="14" y="9" width="3.5" height="10" rx="1.5" fill="var(--coral)" />
      <rect x="19.5" y="12" width="3.5" height="5" rx="1.5" fill="var(--coral)" />
    </svg>
  );
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
              display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left',
              fontFamily: 'inherit', padding: '10px 11px', borderRadius: 'var(--r-row)', cursor: 'pointer', marginBottom: 2,
              background: active ? 'var(--card)' : 'transparent',
              border: active ? '1px solid var(--border-card-2)' : '1px solid transparent',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}>
              <WaveformIcon />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {firstSentence(c.summary)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {formatDate(c.convoDate)} &middot; {c.speakerCount} speaker{c.speakerCount !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
          );
        })}
      </SidebarPanel>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeConvo && activeConvoMeta
          ? <ConversationDetail key={activeConvo.id} conversation={activeConvo} contactName={activeConvoMeta.contactName} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a conversation</div>}
      </div>
    </div>
  );
}
