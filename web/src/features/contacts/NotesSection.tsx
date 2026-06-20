import { useState } from 'react';
import { Sparkle } from '../../ui/Sparkle.tsx';
import { InlineEditor } from '../../ui/InlineEditor.tsx';
import { useInlineEdit } from '../../hooks/useInlineEdit.ts';
import { formatDate } from '../../lib/format.ts';
import type { Note } from '../../types.ts';

type Props = {
  notes: Note[];
  onAddNote: (body: string) => void | Promise<void>;
  onSaveNote: (id: string, body: string) => void | Promise<void>;
};

export function NotesSection({ notes, onAddNote, onSaveNote }: Props) {
  const [adding, setAdding] = useState(false);
  const [newBody, setNewBody] = useState('');
  const edit = useInlineEdit();

  const handleAdd = async () => {
    if (!newBody.trim()) return;
    await onAddNote(newBody);
    setNewBody('');
    setAdding(false);
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Notes &amp; history</div>
        <button onClick={() => setAdding(true)} style={{ fontSize: 12, color: 'var(--coral-deep)', background: 'none', border: '1px dashed var(--border-dashed)', borderRadius: 'var(--r-pill)', padding: '3px 10px', cursor: 'pointer' }}>+ Note</button>
      </div>

      {adding && (
        <div style={{ marginBottom: 12 }}>
          <InlineEditor value={newBody} onChange={setNewBody} onSave={handleAdd}
            onCancel={() => { setAdding(false); setNewBody(''); }} multiline placeholder="Add a note…" />
        </div>
      )}

      {notes.length === 0 && !adding && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No notes yet.</div>}

      {notes.map(note => (
        <NoteItem key={note.id} note={note}
          editing={edit.isEditing(note.id)} draft={edit.draft} onDraft={edit.setDraft}
          onBeginEdit={() => edit.begin(note.id, note.body)}
          onSave={async () => { await onSaveNote(note.id, edit.draft); edit.cancel(); }}
          onCancel={edit.cancel} />
      ))}
    </div>
  );
}

function NoteItem({ note, editing, draft, onDraft, onBeginEdit, onSave, onCancel }: {
  note: Note; editing: boolean; draft: string; onDraft: (v: string) => void;
  onBeginEdit: () => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)', marginTop: 6, flex: 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{formatDate(note.noteDate)}</div>
        {editing ? (
          <InlineEditor value={draft} onChange={onDraft} onSave={onSave} onCancel={onCancel} multiline />
        ) : (
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
            {note.body}
            {note.origin === 'ai' && <Sparkle />}
            <button onClick={onBeginEdit} style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✎</button>
          </div>
        )}
      </div>
    </div>
  );
}
