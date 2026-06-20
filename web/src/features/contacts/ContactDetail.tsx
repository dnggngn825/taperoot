import { useContactDetail } from '../../hooks/useContactDetail.ts';
import { ContactHeader } from './ContactHeader.tsx';
import { StatCards } from './StatCards.tsx';
import { NotesSection } from './NotesSection.tsx';
import { FollowupsSection } from './FollowupsSection.tsx';

export function ContactDetail({ contactId, onMutated }: { contactId: string; onMutated?: () => void }) {
  const { contact, fetching, isProcessing, isSaving, mutationError, generate, addNote, updateNote, tickFollowup, saveFollowup } = useContactDetail(contactId, onMutated);

  if (fetching && !contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>;
  if (!contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Not found</div>;

  const canGenerate = contact.notes.length > 0 || contact.conversations.length > 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      {mutationError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, fontSize: 13, color: 'var(--error-text)' }}>
          {mutationError}
        </div>
      )}
      <ContactHeader contact={contact} canGenerate={canGenerate} isProcessing={isProcessing} onGenerate={generate} />
      <StatCards contact={contact} />
      <NotesSection notes={contact.notes} isSaving={isSaving} onAddNote={addNote} onSaveNote={updateNote} />
      <FollowupsSection followups={contact.followups} contactEmail={contact.email} isSaving={isSaving} onTick={tickFollowup} onSave={saveFollowup} />
    </div>
  );
}
