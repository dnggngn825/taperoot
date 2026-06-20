import { SidebarPanel } from '../../ui/SidebarPanel.tsx';
import { formatDate } from '../../lib/format.ts';
import type { Conversation } from '../../types.ts';

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationSidebar({ conversations, activeId, onSelect }: Props) {
  return (
    <SidebarPanel title="Conversations" width={260} background="var(--card)">
      {conversations.length === 0 && <div style={{ padding: '8px 8px', color: 'var(--muted)', fontSize: 13 }}>No conversations</div>}
      {conversations.map(c => (
        <div key={c.id} onClick={() => onSelect(c.id)} style={{
          padding: '10px 11px', borderRadius: 'var(--r-row)', cursor: 'pointer', marginBottom: 4,
          background: activeId === c.id ? 'var(--panel)' : 'transparent',
          border: activeId === c.id ? '1px solid var(--border-card-2)' : '1px solid transparent',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{formatDate(c.convoDate)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.speakerCount} speakers</div>
        </div>
      ))}
    </SidebarPanel>
  );
}
