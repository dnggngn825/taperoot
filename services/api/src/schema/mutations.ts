import { builder } from './builder.js';
import { prisma } from '../db.js';
import { parseRawTranscript } from '../lib/transcript.js';
import { createExtractionClient } from '../extraction-client.js';
import type { GenerateRequest } from '../extraction-client.js';

const extractionClient = createExtractionClient();


builder.mutationField('addNote', (t) =>
  t.prismaField({
    type: 'Note',
    args: {
      contactId: t.arg.id({ required: true }),
      body: t.arg.string({ required: true }),
      noteDate: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args) => {
      const note = await prisma.note.create({
        ...query,
        data: {
          contactId: String(args.contactId),
          body: args.body,
          noteDate: new Date(args.noteDate),
          origin: 'manual',
        },
      });

      const convoCount = await prisma.conversation.count({ where: { contactId: String(args.contactId) } });
      if (convoCount === 0) {
        void triggerGeneration(String(args.contactId), 'notes-only');
      }

      return note;
    },
  }),
);


builder.mutationField('updateNote', (t) =>
  t.prismaField({
    type: 'Note',
    args: {
      id: t.arg.id({ required: true }),
      body: t.arg.string(),
      noteDate: t.arg.string(),
    },
    resolve: async (query, _root, args) => {
      return prisma.note.update({
        ...query,
        where: { id: String(args.id) },
        data: {
          ...(args.body != null ? { body: args.body } : {}),
          ...(args.noteDate != null ? { noteDate: new Date(args.noteDate) } : {}),
        },
      });
    },
  }),
);


builder.mutationField('updateFollowup', (t) =>
  t.prismaField({
    type: 'Followup',
    args: {
      id: t.arg.id({ required: true }),
      status: t.arg.string(),
      description: t.arg.string(),
    },
    resolve: async (query, _root, args) => {
      return prisma.followup.update({
        ...query,
        where: { id: String(args.id) },
        data: {
          ...(args.status != null ? { status: args.status } : {}),
          ...(args.description != null ? { description: args.description } : {}),
        },
      });
    },
  }),
);


builder.mutationField('addConversation', (t) =>
  t.prismaField({
    type: 'Conversation',
    args: {
      contactId: t.arg.id({ required: true }),
      rawTranscript: t.arg.string({ required: true }),
      convoDate: t.arg.string({ required: true }),
    },
    resolve: async (query, _root, args) => {
      const { turns, speakerCount } = parseRawTranscript(args.rawTranscript);
      return prisma.conversation.create({
        ...query,
        data: {
          contactId: String(args.contactId),
          convoDate: new Date(args.convoDate),
          transcript: JSON.stringify(turns),
          speakerCount,
          summary: null,
        },
      });
    },
  }),
);

// ── generateForContact ───────────────────────────────────────────────────────

builder.mutationField('generateForContact', (t) =>
  t.prismaField({
    type: 'Contact',
    args: {
      contactId: t.arg.id({ required: true }),
    },
    resolve: async (query, _root, args) => {
      const id = String(args.contactId);
      const contact = await prisma.contact.findUniqueOrThrow({
        ...query,
        where: { id },
        include: { notes: true, conversations: true },
      });

      if (contact.notes.length === 0 && contact.conversations.length === 0) {
        return contact;
      }

      const updated = await prisma.contact.update({
        ...query,
        where: { id },
        data: { aiStatus: 'processing' },
      });

      void triggerGeneration(id, 'convo');

      return updated;
    },
  }),
);

// ── Internal: async generation ───────────────────────────────────────────────

async function triggerGeneration(contactId: string, mode: 'convo' | 'notes-only') {
  try {
    const contact = await prisma.contact.findUniqueOrThrow({
      where: { id: contactId },
      include: { notes: { orderBy: { noteDate: 'desc' } }, conversations: true },
    });

    const req: GenerateRequest = {
      contact_id: contactId,
      context: {
        name: contact.name,
        company: contact.company ?? '',
        role: contact.role ?? '',
        notes: mode === 'notes-only'
          ? contact.notes.slice(0, 1).map((n) => ({
              id: n.id,
              body: n.body,
              note_date: n.noteDate.toISOString().slice(0, 10),
            }))
          : contact.notes.map((n) => ({
              id: n.id,
              body: n.body,
              note_date: n.noteDate.toISOString().slice(0, 10),
            })),
        conversations: contact.conversations.map((c) => ({
          id: c.id,
          convo_date: c.convoDate.toISOString().slice(0, 10),
          summary: c.summary ?? '',
          transcript: c.transcript,
        })),
      },
    };

    const result = await extractionClient.generate(req);

    await prisma.note.deleteMany({ where: { contactId, origin: 'ai' } });
    await prisma.followup.deleteMany({ where: { contactId, origin: 'ai', status: 'open' } });

    if (mode === 'convo' && result.notes.length > 0) {
      await prisma.note.createMany({
        data: result.notes.map((n) => ({
          contactId,
          body: n.text,
          noteDate: new Date(n.date),
          origin: 'ai',
          sourceConvoId: n.convo_id,
        })),
      });
    }

    if (result.actions.length > 0) {
      await prisma.followup.createMany({
        data: result.actions.map((a) => ({
          contactId,
          description: a.description,
          dueDate: a.due_date ? new Date(a.due_date) : null,
          status: 'open',
          sourceType: a.source_type,
          sourceId: a.source_id,
          origin: 'ai',
        })),
      });
    }

    await prisma.contact.update({ where: { id: contactId }, data: { aiStatus: 'done' } });
  } catch (err) {
    console.error(`[generate] failed for ${contactId}:`, (err as Error).message);
    await prisma.contact.update({ where: { id: contactId }, data: { aiStatus: 'failed' } });
  }
}
