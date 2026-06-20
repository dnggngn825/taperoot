import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from 'urql';
import {
  CONTACT_QUERY,
  GENERATE_MUTATION,
  ADD_NOTE_MUTATION,
  UPDATE_NOTE_MUTATION,
  UPDATE_FOLLOWUP_MUTATION,
} from '../lib/queries.ts';
import type { ContactDetail } from '../types.ts';

export function useContactDetail(id: string | null, onMutated?: () => void) {
  const [{ data, fetching }, refetch] = useQuery({
    query: CONTACT_QUERY,
    variables: { id: id! },
    pause: !id,
    requestPolicy: 'network-only',
  });

  const [, generateM] = useMutation(GENERATE_MUTATION);
  const [, addNoteM] = useMutation(ADD_NOTE_MUTATION);
  const [, updateNoteM] = useMutation(UPDATE_NOTE_MUTATION);
  const [, updateFollowupM] = useMutation(UPDATE_FOLLOWUP_MUTATION);

  const contact: ContactDetail | null = data?.contact ?? null;
  const isProcessing = contact?.aiStatus === 'processing';

  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isProcessing) {
      pollingRef.current = setInterval(() => refetch({ requestPolicy: 'network-only' }), 2000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isProcessing, refetch]);

  const reload = () => {
    refetch({ requestPolicy: 'network-only' });
    onMutated?.();
  };

  const generate = async () => {
    if (!id) return;
    setMutationError(null);
    const res = await generateM({ contactId: id });
    if (res.error) { setMutationError(res.error.message); return; }
    reload();
  };

  const addNote = async (body: string) => {
    if (!id || !body.trim()) return;
    setMutationError(null);
    setIsSaving(true);
    const res = await addNoteM({ contactId: id, body, noteDate: new Date().toISOString().slice(0, 10) });
    setIsSaving(false);
    if (res.error) { setMutationError(res.error.message); return; }
    reload();
  };

  const updateNote = async (noteId: string, body: string) => {
    setMutationError(null);
    setIsSaving(true);
    const res = await updateNoteM({ id: noteId, body });
    setIsSaving(false);
    if (res.error) { setMutationError(res.error.message); return; }
    reload();
  };

  const tickFollowup = async (followupId: string, status: string) => {
    setMutationError(null);
    const res = await updateFollowupM({ id: followupId, status: status === 'open' ? 'done' : 'open' });
    if (res.error) { setMutationError(res.error.message); return; }
    reload();
  };

  const saveFollowup = async (followupId: string, description: string) => {
    setMutationError(null);
    setIsSaving(true);
    const res = await updateFollowupM({ id: followupId, description });
    setIsSaving(false);
    if (res.error) { setMutationError(res.error.message); return; }
    reload();
  };

  return { contact, fetching, isProcessing, isSaving, mutationError, generate, addNote, updateNote, tickFollowup, saveFollowup, reload };
}
