import { formatDate } from '../../lib/format.ts';
import type { ContactDetail } from '../../types.ts';

export function StatCards({ contact }: { contact: ContactDetail }) {
  const cards = [
    { label: 'Last activity', value: formatDate(contact.lastActivityAt) },
    { label: 'Open follow-ups', value: String(contact.openFollowupCount), highlight: contact.openFollowupCount > 0 },
    { label: 'AI status', value: contact.aiStatus },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
      {cards.map(({ label, value, highlight }) => (
        <div key={label} style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)', minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-2)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 14, color: highlight ? 'var(--coral-deep)' : 'var(--ink)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
