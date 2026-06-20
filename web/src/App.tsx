import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, Provider } from 'urql';
import { client } from './lib/urql.ts';
import {
  CONTACTS_QUERY, CONTACT_QUERY,
  GENERATE_MUTATION, ADD_NOTE_MUTATION, UPDATE_NOTE_MUTATION,
  UPDATE_FOLLOWUP_MUTATION, ADD_CONVERSATION_MUTATION,
} from './lib/queries.ts';
import { Avatar } from './ui/Avatar.tsx';
import { Header } from './Header.tsx';

type ContactSort = 'recent_update' | 'alphabetical';

interface Note { id: string; body: string; noteDate: string; origin: string; sourceConvoId: string | null; }
interface Conversation { id: string; summary: string | null; transcript: string; convoDate: string; speakerCount: number; }
interface Followup { id: string; description: string; dueDate: string | null; status: string; origin: string; }
interface ContactSummary { id: string; name: string; company: string | null; role: string | null; email: string | null; aiStatus: string; openFollowupCount: number; lastActivityAt: string | null; }
interface ContactDetail extends ContactSummary { notes: Note[]; conversations: Conversation[]; followups: Followup[]; }

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function Sparkle() {
  return <span title="AI generated" style={{ fontSize: 12, marginLeft: 4, color: 'var(--coral)' }}>✦</span>;
}

// ── Contacts sidebar card ─────────────────────────────────────────────────────

function ContactCard({ contact, selected, onClick }: { contact: ContactSummary; selected: boolean; onClick: () => void }) {
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
      {contact.openFollowupCount > 0 && (
        <div style={{ background: 'var(--coral)', color: '#fff', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600, padding: '2px 7px', flex: 'none' }}>
          {contact.openFollowupCount}
        </div>
      )}
    </div>
  );
}

function SortToggle({ value, onChange }: { value: ContactSort; onChange: (s: ContactSort) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--panel-track)', borderRadius: 'var(--r-pill)' }}>
      {(['recent_update', 'alphabetical'] as ContactSort[]).map((s) => {
        const active = value === s;
        return (
          <button key={s} onClick={() => onChange(s)} style={{
            padding: '4px 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: active ? '#fff' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--muted-3)',
            boxShadow: active ? 'var(--shadow-nav)' : 'none',
          }}>{s === 'recent_update' ? 'Recent' : 'A–Z'}</button>
        );
      })}
    </div>
  );
}

// ── Contact detail ────────────────────────────────────────────────────────────

function ContactDetailPanel({ contactId }: { contactId: string }) {
  const [{ data, fetching }, refetch] = useQuery({ query: CONTACT_QUERY, variables: { id: contactId }, requestPolicy: 'network-only' });
  const [, generate] = useMutation(GENERATE_MUTATION);
  const [, addNote] = useMutation(ADD_NOTE_MUTATION);
  const [, updateNote] = useMutation(UPDATE_NOTE_MUTATION);
  const [, updateFollowup] = useMutation(UPDATE_FOLLOWUP_MUTATION);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [editingFollowupDesc, setEditingFollowupDesc] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const contact: ContactDetail | null = data?.contact ?? null;
  const isProcessing = contact?.aiStatus === 'processing';

  // Poll while processing
  useEffect(() => {
    if (isProcessing) {
      pollingRef.current = setInterval(() => refetch({ requestPolicy: 'network-only' }), 2000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isProcessing, refetch]);

  if (fetching && !contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>;
  if (!contact) return <div style={{ padding: 32, color: 'var(--muted)' }}>Not found</div>;

  const canGenerate = contact.notes.length > 0 || contact.conversations.length > 0;

  const handleGenerate = async () => {
    await generate({ contactId });
    refetch({ requestPolicy: 'network-only' });
  };

  const handleSaveNote = async (id: string, body: string) => {
    await updateNote({ id, body });
    setEditingNoteId(null);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleAddNote = async () => {
    if (!newNoteBody.trim()) return;
    await addNote({ contactId, body: newNoteBody, noteDate: new Date().toISOString().slice(0, 10) });
    setNewNoteBody('');
    setAddingNote(false);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleTickFollowup = async (id: string, currentStatus: string) => {
    await updateFollowup({ id, status: currentStatus === 'open' ? 'done' : 'open' });
    refetch({ requestPolicy: 'network-only' });
  };

  const handleSaveFollowup = async (id: string, description: string) => {
    await updateFollowup({ id, description });
    setEditingFollowupId(null);
    refetch({ requestPolicy: 'network-only' });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      {/* Header */}
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
        <button onClick={handleGenerate} disabled={!canGenerate || isProcessing} style={{
          padding: '8px 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: canGenerate && !isProcessing ? 'pointer' : 'not-allowed',
          background: canGenerate && !isProcessing ? 'var(--coral)' : 'var(--panel-track)',
          color: canGenerate && !isProcessing ? '#fff' : 'var(--muted)',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
        }}>
          {isProcessing ? '⟳ Generating…' : '✦ Generate'}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'Last activity', value: formatDate(contact.lastActivityAt) },
          { label: 'Open follow-ups', value: String(contact.openFollowupCount), highlight: contact.openFollowupCount > 0 },
          { label: 'AI status', value: contact.aiStatus },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)', minWidth: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-2)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: highlight ? 'var(--coral-deep)' : 'var(--ink)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Notes & history</div>
          <button onClick={() => setAddingNote(true)} style={{ fontSize: 12, color: 'var(--coral-deep)', background: 'none', border: '1px dashed var(--border-dashed)', borderRadius: 'var(--r-pill)', padding: '3px 10px', cursor: 'pointer' }}>+ Note</button>
        </div>
        {addingNote && (
          <div style={{ marginBottom: 12 }}>
            <textarea value={newNoteBody} onChange={e => setNewNoteBody(e.target.value)} rows={3}
              placeholder="Add a note…" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={handleAddNote} style={{ padding: '5px 14px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setAddingNote(false); setNewNoteBody(''); }} style={{ padding: '5px 14px', background: 'none', border: '1px solid var(--border-btn)', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        {contact.notes.length === 0 && !addingNote && (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No notes yet.</div>
        )}
        {contact.notes.map(note => (
          <div key={note.id} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)', marginTop: 6, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{formatDate(note.noteDate)}</div>
              {editingNoteId === note.id ? (
                <div>
                  <textarea value={editingNoteBody} onChange={e => setEditingNoteBody(e.target.value)} rows={3}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => handleSaveNote(note.id, editingNoteBody)} style={{ padding: '4px 12px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingNoteId(null)} style={{ padding: '4px 12px', background: 'none', border: '1px solid var(--border-btn)', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {note.body}
                  {note.origin === 'ai' && <Sparkle />}
                  <button onClick={() => { setEditingNoteId(note.id); setEditingNoteBody(note.body); }}
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✎</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Follow-ups */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Follow-ups</div>
        {contact.followups.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No follow-ups yet.</div>}
        {contact.followups.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)' }}>
            <input type="checkbox" checked={f.status === 'done'} onChange={() => handleTickFollowup(f.id, f.status)}
              style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--coral)' }} />
            <div style={{ flex: 1 }}>
              {editingFollowupId === f.id ? (
                <div>
                  <input value={editingFollowupDesc} onChange={e => setEditingFollowupDesc(e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-sans)' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => handleSaveFollowup(f.id, editingFollowupDesc)} style={{ padding: '3px 10px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingFollowupId(null)} style={{ padding: '3px 10px', background: 'none', border: '1px solid var(--border-btn)', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: f.status === 'done' ? 'var(--muted)' : 'var(--ink)', textDecoration: f.status === 'done' ? 'line-through' : 'none' }}>
                    {f.description}
                  </span>
                  {f.origin === 'ai' && <Sparkle />}
                  <button onClick={() => { setEditingFollowupId(f.id); setEditingFollowupDesc(f.description); }}
                    style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✎</button>
                  {contact.email && (
                    <a href={`mailto:${contact.email}?subject=Follow-up&body=${encodeURIComponent(f.description)}`}
                      style={{ fontSize: 11, color: 'var(--coral-deep)', textDecoration: 'none', marginLeft: 4 }}>✉</a>
                  )}
                </div>
              )}
              {f.dueDate && <div style={{ fontSize: 11, color: 'var(--coral-deep)', fontWeight: 600, marginTop: 2 }}>{formatDate(f.dueDate)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Notetaker tab ─────────────────────────────────────────────────────────────

function NotetakerView() {
  const [{ data }] = useQuery({ query: CONTACTS_QUERY, variables: { sort: 'recent_update' } });
  const contacts: ContactSummary[] = data?.contacts ?? [];

  // Pick first contact that has conversations
  const contactWithConvo = contacts.find(c => c.openFollowupCount >= 0);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [noteTab, setNoteTab] = useState<'summary' | 'transcript'>('summary');
  const [rawTranscript, setRawTranscript] = useState('');
  const [, addConversation] = useMutation(ADD_CONVERSATION_MUTATION);
  const [savingConvo, setSavingConvo] = useState(false);

  const activeContactId = selectedContactId ?? contactWithConvo?.id ?? null;
  const [{ data: contactData }, refetchContact] = useQuery({
    query: CONTACT_QUERY,
    variables: { id: activeContactId! },
    pause: !activeContactId,
    requestPolicy: 'network-only',
  });

  const contact: ContactDetail | null = contactData?.contact ?? null;
  const convos: Conversation[] = contact?.conversations ?? [];
  const activeConvoId = selectedConvoId ?? convos[0]?.id ?? null;
  const activeConvo = convos.find(c => c.id === activeConvoId) ?? null;

  const handleSaveTranscript = async () => {
    if (!activeContactId || !rawTranscript.trim()) return;
    setSavingConvo(true);
    await addConversation({ contactId: activeContactId, rawTranscript, convoDate: new Date().toISOString().slice(0, 10) });
    setRawTranscript('');
    setSavingConvo(false);
    refetchContact({ requestPolicy: 'network-only' });
  };

  const parsedTranscript = activeConvo ? (() => {
    try { return JSON.parse(activeConvo.transcript) as { speaker: string; text: string }[]; } catch { return []; }
  })() : [];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Contact sidebar */}
      <div style={{ width: 'var(--w-sidebar)', flex: 'none', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
        <div style={{ padding: '16px 12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Contacts</div>
        <div className="scroll-area" style={{ flex: 1, padding: '0 8px 8px' }}>
          {contacts.map(c => (
            <ContactCard key={c.id} contact={c} selected={activeContactId === c.id}
              onClick={() => { setSelectedContactId(c.id); setSelectedConvoId(null); }} />
          ))}
        </div>
      </div>

      {/* Conversation sidebar */}
      <div style={{ width: 260, flex: 'none', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
        <div style={{ padding: '16px 12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Conversations</div>
        <div className="scroll-area" style={{ flex: 1, padding: '0 8px 8px' }}>
          {convos.length === 0 && <div style={{ padding: '8px 8px', color: 'var(--muted)', fontSize: 13 }}>No conversations</div>}
          {convos.map(c => (
            <div key={c.id} onClick={() => { setSelectedConvoId(c.id); setNoteTab('summary'); }} style={{
              padding: '10px 11px', borderRadius: 'var(--r-row)', cursor: 'pointer', marginBottom: 4,
              background: activeConvoId === c.id ? 'var(--panel)' : 'transparent',
              border: activeConvoId === c.id ? '1px solid var(--border-card-2)' : '1px solid transparent',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                {formatDate(c.convoDate)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.speakerCount} speakers</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeConvo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            Select a contact and conversation
          </div>
        ) : (
          <>
            {/* Sub-tab toggle */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
              {(['summary', 'transcript'] as const).map(t => (
                <button key={t} onClick={() => setNoteTab(t)} style={{
                  padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: noteTab === t ? 600 : 400,
                  color: noteTab === t ? 'var(--ink)' : 'var(--muted)',
                  borderBottom: noteTab === t ? '2px solid var(--coral)' : '2px solid transparent',
                }}>{t === 'summary' ? 'AI Summary' : 'Transcript'}</button>
              ))}
            </div>
            <div className="scroll-area" style={{ flex: 1, padding: 24 }}>
              {noteTab === 'summary' ? (
                <div>
                  <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
                    {activeConvo.summary ?? <span style={{ color: 'var(--muted)' }}>No summary available.</span>}
                  </div>
                </div>
              ) : (
                <div>
                  {parsedTranscript.length > 0 ? (
                    parsedTranscript.map((line, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: line.speaker === 'Speaker 1' ? '#E2DACB' : '#CFE0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'var(--font-serif)', color: 'var(--ink-soft)', flex: 'none' }}>
                          {line.speaker === 'Speaker 1' ? 'S1' : 'S2'}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>{line.speaker}</div>
                          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{line.text}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Paste a transcript to save:</div>
                      <textarea value={rawTranscript} onChange={e => setRawTranscript(e.target.value)} rows={8}
                        placeholder={'Speaker 1: Hello\nSpeaker 2: Hi there'}
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
                      <button onClick={handleSaveTranscript} disabled={savingConvo} style={{ marginTop: 8, padding: '6px 16px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 13, cursor: 'pointer' }}>
                        {savingConvo ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                  {/* Add new conversation */}
                  <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Add new conversation</div>
                    <textarea value={rawTranscript} onChange={e => setRawTranscript(e.target.value)} rows={5}
                      placeholder={'Speaker 1: Hello\nSpeaker 2: Hi there'}
                      style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
                    <button onClick={handleSaveTranscript} disabled={savingConvo || !rawTranscript.trim()} style={{ marginTop: 8, padding: '6px 16px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 13, cursor: 'pointer' }}>
                      {savingConvo ? 'Saving…' : 'Save transcript'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

function ContactsView() {
  const [sort, setSort] = useState<ContactSort>('recent_update');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [{ data, fetching, error }] = useQuery({ query: CONTACTS_QUERY, variables: { sort } });

  const contacts: ContactSummary[] = data?.contacts ?? [];
  const activeId = selectedId ?? contacts[0]?.id ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 'var(--w-sidebar)', flex: 'none', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
        <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Contacts</span>
          <SortToggle value={sort} onChange={setSort} />
        </div>
        <div className="scroll-area" style={{ flex: 1, padding: '0 8px 8px' }}>
          {fetching && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}
          {error && <div style={{ padding: '16px 8px', color: 'var(--coral-deep)', fontSize: 13 }}>Error loading contacts</div>}
          {!fetching && contacts.length === 0 && <div style={{ padding: '16px 8px', color: 'var(--muted)', fontSize: 13 }}>No contacts</div>}
          {contacts.map(c => <ContactCard key={c.id} contact={c} selected={activeId === c.id} onClick={() => setSelectedId(c.id)} />)}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeId
          ? <ContactDetailPanel contactId={activeId} />
          : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Select a contact</div>
        }
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<'contacts' | 'notetaker'>('contacts');
  return (
    <Provider value={client}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <Header tab={tab} onTabChange={setTab} />
        {tab === 'contacts' ? <ContactsView /> : <NotetakerView />}
      </div>
    </Provider>
  );
}
