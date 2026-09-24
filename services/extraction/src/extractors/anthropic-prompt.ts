import type { ContactContext } from '../types.js';

export const SYSTEM_PROMPT = `You are helping the user follow up with their contacts.
Given a contact and their notes and conversation summaries/transcripts, extract:
1. A short AI-generated note for each conversation (1-2 sentences summarising it)
2. Concrete next-step follow-up actions the user should take

Rules:
- Infer a due date when language implies one ("next week", "by Friday", etc.)
- Attribute each action to the note or conversation it came from
- Do not invent actions not supported by the context
- Keep note text to 1-2 sentences`;

export const TOOL_SCHEMA = {
  name: 'emit_results',
  description: 'Emit extracted notes and follow-up actions',
  input_schema: {
    type: 'object' as const,
    properties: {
      notes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            convo_id: { type: 'string' },
            text: { type: 'string' },
            date: { type: 'string', description: 'ISO date matching the conversation date' },
          },
          required: ['convo_id', 'text', 'date'],
        },
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            due_date: { type: 'string', description: 'ISO date or empty string if none' },
            source_type: { type: 'string', enum: ['note', 'conversation'] },
            source_id: { type: 'string' },
          },
          required: ['description', 'due_date', 'source_type', 'source_id'],
        },
      },
    },
    required: ['notes', 'actions'],
  },
};

export function buildPrompt(context: ContactContext): string {
  const parts: string[] = [
    `Contact: ${context.name}${context.company ? ` (${context.role} at ${context.company})` : ''}`,
  ];

  if (context.notes.length > 0) {
    parts.push('\nNotes:');
    for (const n of context.notes) {
      parts.push(`[${n.id}] ${n.note_date}: ${n.body}`);
    }
  }

  if (context.conversations.length > 0) {
    parts.push('\nConversations:');
    for (const c of context.conversations) {
      parts.push(`[${c.id}] ${c.convo_date}`);
      if (c.summary) parts.push(`Summary: ${c.summary}`);
      parts.push(`Transcript:\n${c.transcript}`);
    }
  }

  return parts.join('\n');
}
