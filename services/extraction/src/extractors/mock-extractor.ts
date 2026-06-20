import type {
  ContactContext,
  ConversationCtx,
  ExtractedAction,
  ExtractedNote,
  ExtractionResult,
  Extractor,
  NoteCtx,
} from '../types.js';

// Action-verb heuristic — phrases that strongly suggest a follow-up action
const ACTION_VERBS = [
  "i'll", "i will", "i'll", "we'll", "we will",
  "will send", "will share", "will follow", "will connect",
  "will schedule", "will book", "will review", "will check",
  "will introduce", "will loop in", "will reach out",
  "let's", "let us", "going to", "plan to", "need to",
  "should send", "should connect", "should follow",
];

// Relative-date phrases → offset in days
const RELATIVE_DATES: [RegExp, number][] = [
  [/\btoday\b/i, 0],
  [/\btomorrow\b/i, 1],
  [/\bthis week\b/i, 3],
  [/\bnext week\b/i, 7],
  [/\btwo weeks?\b/i, 14],
  [/\bby friday\b/i, 5],
  [/\bend of (the )?week\b/i, 5],
  [/\bnext month\b/i, 30],
];

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function inferDueDate(text: string, anchor: Date): string {
  for (const [pattern, offset] of RELATIVE_DATES) {
    if (pattern.test(text)) return addDays(anchor, offset);
  }
  return '';
}

function extractActionsFromText(
  text: string,
  sourceType: 'note' | 'conversation',
  sourceId: string,
  anchor: Date,
): ExtractedAction[] {
  const actions: ExtractedAction[] = [];
  // Split into sentences (period/exclamation/newline)
  const sentences = text.split(/[.!\n]+/).map(s => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (ACTION_VERBS.some(verb => lower.includes(verb))) {
      actions.push({
        description: sentence.charAt(0).toUpperCase() + sentence.slice(1),
        due_date: inferDueDate(sentence, anchor),
        source_type: sourceType,
        source_id: sourceId,
      });
    }
  }
  return actions;
}

function firstNWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

function noteTextFromConvo(convo: ConversationCtx): string {
  if (convo.summary && convo.summary.trim()) {
    return firstNWords(convo.summary, 20);
  }
  // Fall back to first non-empty line of transcript
  try {
    const turns = JSON.parse(convo.transcript) as { speaker: string; text: string }[];
    const first = turns.find(t => t.text?.trim());
    return first ? firstNWords(first.text, 20) : 'Meeting recorded.';
  } catch {
    return 'Meeting recorded.';
  }
}

function fullConvoText(convo: ConversationCtx): string {
  if (convo.summary && convo.summary.trim()) return convo.summary;
  try {
    const turns = JSON.parse(convo.transcript) as { speaker: string; text: string }[];
    return turns.map(t => `${t.speaker}: ${t.text}`).join('\n');
  } catch {
    return '';
  }
}

export class MockExtractor implements Extractor {
  async generate(context: ContactContext): Promise<ExtractionResult> {
    const notes: ExtractedNote[] = [];
    const actions: ExtractedAction[] = [];

    // One note per conversation (dated to convo_date)
    for (const convo of context.conversations) {
      const anchor = new Date(convo.convo_date);
      notes.push({
        convo_id: convo.id,
        text: noteTextFromConvo(convo),
        date: convo.convo_date,
      });
      // Extract actions from the full conversation text
      const text = fullConvoText(convo);
      actions.push(...extractActionsFromText(text, 'conversation', convo.id, anchor));
    }

    // Extract actions from notes (no new note entries)
    for (const note of context.notes) {
      const anchor = new Date(note.note_date);
      actions.push(...extractActionsFromText(note.body, 'note', note.id, anchor));
    }

    // Fallback: if we found nothing at all, emit one generic action per source
    if (actions.length === 0) {
      for (const convo of context.conversations) {
        actions.push({
          description: `Follow up with ${context.name || 'contact'} after your conversation`,
          due_date: addDays(new Date(convo.convo_date), 7),
          source_type: 'conversation',
          source_id: convo.id,
        });
      }
      for (const note of context.notes) {
        actions.push({
          description: `Follow up on your notes about ${context.name || 'contact'}`,
          due_date: addDays(new Date(note.note_date), 7),
          source_type: 'note',
          source_id: note.id,
        });
      }
    }

    return { notes, actions };
  }
}
