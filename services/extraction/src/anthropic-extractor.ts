import Anthropic from '@anthropic-ai/sdk';
import type {
  ContactContext,
  ExtractedAction,
  ExtractedNote,
  ExtractionResult,
  Extractor,
} from './types.js';

const MODEL = process.env.MODEL ?? 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are helping a Blinq user follow up with their contacts.
Given a contact and their notes and conversation summaries/transcripts, extract:
1. A short AI-generated note for each conversation (1-2 sentences summarising it)
2. Concrete next-step follow-up actions the user should take

Rules:
- Infer a due date when language implies one ("next week", "by Friday", etc.)
- Attribute each action to the note or conversation it came from
- Do not invent actions not supported by the context
- Keep note text to 1-2 sentences`;

const TOOL_SCHEMA = {
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

export class AnthropicExtractor implements Extractor {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(context: ContactContext): Promise<ExtractionResult> {
    const userPrompt = buildPrompt(context);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'emit_results' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('AnthropicExtractor: no tool_use block in response');
    }

    const raw = toolUse.input as {
      notes?: { convo_id: string; text: string; date: string }[];
      actions?: {
        description: string;
        due_date?: string;
        source_type: string;
        source_id: string;
      }[];
    };

    const notes: ExtractedNote[] = (raw.notes ?? []).map((n) => ({
      convo_id: n.convo_id,
      text: n.text,
      date: n.date,
    }));

    const actions: ExtractedAction[] = (raw.actions ?? []).map((a) => ({
      description: a.description,
      due_date: a.due_date ?? '',
      source_type: a.source_type,
      source_id: a.source_id,
    }));

    return { notes, actions };
  }
}

function buildPrompt(context: ContactContext): string {
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
