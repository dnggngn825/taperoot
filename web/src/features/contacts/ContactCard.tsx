import { Avatar } from '../../ui/Avatar.tsx';
import { Badge } from '../../ui/Badge.tsx';
import type { ContactSummary } from '../../types.ts';

export function ContactCard({ contact, selected, onClick }: { contact: ContactSummary; selected: boolean; onClick: () => void }) {
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
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contact.role}{contact.company ? ` · ${contact.company}` : ''}
        </div>
      </div>
      {contact.openFollowupCount > 0 && <Badge>{contact.openFollowupCount}</Badge>}
    </div>
  );
}
