import { Avatar } from '../../ui/Avatar.tsx';
import type { ContactDetail } from '../../types.ts';

type Props = {
  contact: ContactDetail;
  canGenerate: boolean;
  isProcessing: boolean;
  onGenerate: () => void;
};

export function ContactHeader({ contact, canGenerate, isProcessing, onGenerate }: Props) {
  const enabled = canGenerate && !isProcessing;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
      <Avatar id={contact.id} name={contact.name} preset="detail" />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--ink)', marginBottom: 4 }}>{contact.name}</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 6 }}>
          {contact.role}{contact.company ? ` · ${contact.company}` : ''}
        </div>
        {contact.email && (
          <a href={`mailto:${contact.email}`} style={{ fontSize: 13, color: 'var(--coral-deep)', textDecoration: 'none' }}>{contact.email}</a>
        )}
      </div>
      <button onClick={onGenerate} disabled={!enabled} title={
        isProcessing ? 'AI is generating follow-ups…'
        : !canGenerate ? 'Add a note or conversation first'
        : 'Extract follow-ups and notes from this contact\u2019s history'
      } style={{
        padding: '8px 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
        background: enabled ? 'var(--coral)' : 'var(--panel-track)',
        color: enabled ? '#fff' : 'var(--muted)',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
      }}>
        {isProcessing ? '⟳ Generating…' : '✦ Generate'}
      </button>
    </div>
  );
}
