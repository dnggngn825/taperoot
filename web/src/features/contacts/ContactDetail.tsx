import { useContactDetail } from '../../hooks/useContactDetail.ts';
import { ContactHeader } from './ContactHeader.tsx';
import { StatCards } from './StatCards.tsx';
import { NotesSection } from './NotesSection.tsx';
import { FollowupsSection } from './FollowupsSection.tsx';

export function ContactDetail({ contactId }: { contactId: string }) {
  const { contact, fetching, isProcessing, generate, addNote, updateNote, tickFollowup, saveFollowup } = useContactDetail(contactId);

  if (fetching && !contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>;
  if (!contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Not found</div>;

  const canGenerate = contact.notes.length > 0 || contact.conversations.length > 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      <ContactHeader contact={contact} canGenerate={canGenerate} isProcessing={isProcessing} onGenerate={generate} />
      <StatCards contact={contact} />
      <NotesSection notes={contact.notes} onAddNote={addNote} onSaveNote={updateNote} />
      <FollowupsSection followups={contact.followups} contactEmail={contact.email} onTick={tickFollowup} onSave={saveFollowup} />
    </div>
  );
}
