import { Sparkle } from '../../ui/Sparkle.tsx';
import { InlineEditor } from '../../ui/InlineEditor.tsx';
import { useInlineEdit } from '../../hooks/useInlineEdit.ts';
import { formatDate } from '../../lib/format.ts';
import type { Followup } from '../../types.ts';

type Props = {
  followups: Followup[];
  contactEmail: string | null;
  onTick: (id: string, status: string) => void | Promise<void>;
  onSave: (id: string, description: string) => void | Promise<void>;
};

export function FollowupsSection({ followups, contactEmail, onTick, onSave }: Props) {
  const edit = useInlineEdit();
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Follow-ups</div>
      {followups.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No follow-ups yet.</div>}
      {followups.map(f => (
        <FollowupItem key={f.id} followup={f} contactEmail={contactEmail}
          editing={edit.isEditing(f.id)} draft={edit.draft} onDraft={edit.setDraft}
          onBeginEdit={() => edit.begin(f.id, f.description)}
          onTick={() => onTick(f.id, f.status)}
          onSave={async () => { await onSave(f.id, edit.draft); edit.cancel(); }}
          onCancel={edit.cancel} />
      ))}
    </div>
  );
}

function FollowupItem({ followup: f, contactEmail, editing, draft, onDraft, onBeginEdit, onTick, onSave, onCancel }: {
  followup: Followup; contactEmail: string | null;
  editing: boolean; draft: string; onDraft: (v: string) => void;
  onBeginEdit: () => void; onTick: () => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)' }}>
      <input type="checkbox" checked={f.status === 'done'} onChange={onTick} style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--coral)' }} />
      <div style={{ flex: 1 }}>
        {editing ? (
          <InlineEditor value={draft} onChange={onDraft} onSave={onSave} onCancel={onCancel} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, color: f.status === 'done' ? 'var(--muted)' : 'var(--ink)', textDecoration: f.status === 'done' ? 'line-through' : 'none' }}>
              {f.description}
            </span>
            {f.origin === 'ai' && <Sparkle />}
            <button onClick={onBeginEdit} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✎</button>
            {contactEmail && (
              <a href={`mailto:${contactEmail}?subject=Follow-up&body=${encodeURIComponent(f.description)}`}
                style={{ fontSize: 11, color: 'var(--coral-deep)', textDecoration: 'none', marginLeft: 4 }}>✉</a>
            )}
          </div>
        )}
        {f.dueDate && <div style={{ fontSize: 11, color: 'var(--coral-deep)', fontWeight: 600, marginTop: 2 }}>{formatDate(f.dueDate)}</div>}
      </div>
    </div>
  );
}
