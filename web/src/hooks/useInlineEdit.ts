import { useState } from 'react';

/** Tracks which row is being edited and its draft text. Replaces the
 *  duplicated editingId/draft state pairs for notes and follow-ups. */
export function useInlineEdit() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  return {
    editingId,
    draft,
    setDraft,
    isEditing: (id: string) => editingId === id,
    begin: (id: string, initial: string) => { setEditingId(id); setDraft(initial); },
    cancel: () => setEditingId(null),
  };
}
