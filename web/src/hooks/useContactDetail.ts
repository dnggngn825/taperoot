import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'urql';
import {
  CONTACT_QUERY,
  GENERATE_MUTATION,
  ADD_NOTE_MUTATION,
  UPDATE_NOTE_MUTATION,
  UPDATE_FOLLOWUP_MUTATION,
} from '../lib/queries.ts';
import type { ContactDetail } from '../types.ts';

/**
 * Full contact graph + all the mutations that act on it. Owns the
 * aiStatus polling loop and refetch-after-mutation wiring so components
 * stay presentational. Pass `null` to pause (e.g. nothing selected yet).
 */
export function useContactDetail(id: string | null) {
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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isProcessing) {
      pollingRef.current = setInterval(() => refetch({ requestPolicy: 'network-only' }), 2000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isProcessing, refetch]);

  const reload = () => refetch({ requestPolicy: 'network-only' });

  const generate = async () => {
    if (!id) return;
    await generateM({ contactId: id });
    reload();
  };

  const addNote = async (body: string) => {
    if (!id || !body.trim()) return;
    await addNoteM({ contactId: id, body, noteDate: new Date().toISOString().slice(0, 10) });
    reload();
  };

  const updateNote = async (noteId: string, body: string) => {
    await updateNoteM({ id: noteId, body });
    reload();
  };

  const tickFollowup = async (followupId: string, status: string) => {
    await updateFollowupM({ id: followupId, status: status === 'open' ? 'done' : 'open' });
    reload();
  };

  const saveFollowup = async (followupId: string, description: string) => {
    await updateFollowupM({ id: followupId, description });
    reload();
  };

  return { contact, fetching, isProcessing, generate, addNote, updateNote, tickFollowup, saveFollowup, reload };
}
