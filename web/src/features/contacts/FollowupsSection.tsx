import { useState } from 'react';
import { Sparkle } from '../../ui/Sparkle.tsx';
import { InlineEditor } from '../../ui/InlineEditor.tsx';
import { useInlineEdit } from '../../hooks/useInlineEdit.ts';
import { formatDate } from '../../lib/format.ts';
import type { Followup } from '../../types.ts';

type Props = {
  followups: Followup[];
  contactEmail: string | null;
  isSaving?: boolean;
  onAdd: (description: string, dueDate: string | null) => void | Promise<void>;
  onTick: (id: string, status: string) => void | Promise<void>;
  onSave: (id: string, description: string) => void | Promise<void>;
};

export function FollowupsSection({ followups, contactEmail, isSaving, onAdd, onTick, onSave }: Props) {
  const edit = useInlineEdit();
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleAdd = async () => {
    if (!newDesc.trim()) return;
    await onAdd(newDesc.trim(), newDueDate || null);
    setNewDesc('');
    setNewDueDate('');
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Follow-ups</div>
        <button onClick={() => setAdding(true)} style={{ fontSize: 12, color: 'var(--coral-deep)', background: 'none', border: '1px dashed var(--border-dashed)', borderRadius: 'var(--r-pill)', padding: '3px 10px', cursor: 'pointer' }}>+ Follow-up</button>
      </div>

      {adding && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)' }}>
          <input
            value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="What do you need to do?"
            style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', flex: 'none' }}>Due date</label>
            <input
              type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
              style={{ padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--ink)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleAdd} disabled={!newDesc.trim() || isSaving} style={{ padding: '5px 14px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setAdding(false); setNewDesc(''); setNewDueDate(''); }} style={{ padding: '5px 14px', background: 'none', border: '1px solid var(--border-btn)', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {followups.length === 0 && !adding && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No follow-ups yet.</div>}
      {followups.map(f => (
        <FollowupItem key={f.id} followup={f} contactEmail={contactEmail}
          editing={edit.isEditing(f.id)} draft={edit.draft} onDraft={edit.setDraft}
          onBeginEdit={() => edit.begin(f.id, f.description)}
          onTick={() => onTick(f.id, f.status)}
          onSave={async () => { await onSave(f.id, edit.draft); edit.cancel(); }}
          onCancel={edit.cancel} saving={isSaving} />
      ))}
    </div>
  );
}

function FollowupItem({ followup: f, contactEmail, editing, draft, onDraft, onBeginEdit, onTick, onSave, onCancel, saving }: {
  followup: Followup; contactEmail: string | null;
  editing: boolean; draft: string; onDraft: (v: string) => void;
  onBeginEdit: () => void; onTick: () => void; onSave: () => void; onCancel: () => void; saving?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)' }}>
      <input type="checkbox" checked={f.status === 'done'} onChange={onTick} style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--coral)' }} />
      <div style={{ flex: 1 }}>
        {editing ? (
          <InlineEditor value={draft} onChange={onDraft} onSave={onSave} onCancel={onCancel} disabled={saving} />
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
