import type { ContactContext, ExtractionResult } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid extraction output at ${path}: expected a non-empty string`);
  }
  return value;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

export function validateExtractionResult(value: unknown, context: ContactContext): ExtractionResult {
  if (!isRecord(value) || !Array.isArray(value.notes) || !Array.isArray(value.actions)) {
    throw new Error('Invalid extraction output: notes and actions must be arrays');
  }

  const conversations = new Map(context.conversations.map((conversation) => [conversation.id, conversation]));
  const notesById = new Set(context.notes.map((note) => note.id));

  const notes = value.notes.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Invalid extraction output at notes[${index}]`);

    const convoId = requiredString(entry.convo_id, `notes[${index}].convo_id`);
    const conversation = conversations.get(convoId);
    if (!conversation) {
      throw new Error(`Invalid extraction output at notes[${index}].convo_id: unknown conversation`);
    }

    const text = requiredString(entry.text, `notes[${index}].text`);
    const date = requiredString(entry.date, `notes[${index}].date`);
    if (!isIsoDate(date)) {
      throw new Error(`Invalid extraction output at notes[${index}].date: expected YYYY-MM-DD`);
    }
    if (date !== conversation.convo_date) {
      throw new Error(`Invalid extraction output at notes[${index}].date: must match conversation date`);
    }

    return { convo_id: convoId, text, date };
  });

  const actions = value.actions.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Invalid extraction output at actions[${index}]`);

    const description = requiredString(entry.description, `actions[${index}].description`);
    const dueDate = entry.due_date;
    if (typeof dueDate !== 'string') {
      throw new Error(`Invalid extraction output at actions[${index}].due_date: expected a string`);
    }
    if (dueDate !== '' && !isIsoDate(dueDate)) {
      throw new Error(`Invalid extraction output at actions[${index}].due_date: expected YYYY-MM-DD or empty`);
    }

    const sourceType = entry.source_type;
    if (sourceType !== 'note' && sourceType !== 'conversation') {
      throw new Error(`Invalid extraction output at actions[${index}].source_type: unsupported source type`);
    }

    const sourceId = requiredString(entry.source_id, `actions[${index}].source_id`);
    const sourceExists = sourceType === 'note'
      ? notesById.has(sourceId)
      : conversations.has(sourceId);
    if (!sourceExists) {
      throw new Error(`Invalid extraction output at actions[${index}].source_id: unknown ${sourceType}`);
    }

    return {
      description,
      due_date: dueDate,
      source_type: sourceType,
      source_id: sourceId,
    };
  });

  return { notes, actions };
}