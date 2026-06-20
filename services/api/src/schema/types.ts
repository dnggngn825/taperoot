import { builder } from './builder.js';
import { prisma } from '../db.js';

export const AiStatusEnum = builder.enumType('AiStatus', {
  values: ['idle', 'processing', 'done', 'failed'] as const,
});

export const NoteOriginEnum = builder.enumType('NoteOrigin', {
  values: ['manual', 'ai'] as const,
});

export const FollowupStatusEnum = builder.enumType('FollowupStatus', {
  values: ['open', 'done'] as const,
});

export const SourceTypeEnum = builder.enumType('SourceType', {
  values: ['note', 'conversation', 'manual'] as const,
});

export const OriginEnum = builder.enumType('Origin', {
  values: ['ai', 'manual'] as const,
});

export const ContactSortEnum = builder.enumType('ContactSort', {
  values: ['recent_update', 'alphabetical'] as const,
});

builder.prismaObject('Note', {
  fields: (t) => ({
    id: t.exposeID('id'),
    body: t.exposeString('body'),
    noteDate: t.field({ type: 'String', resolve: (n) => n.noteDate.toISOString() }),
    origin: t.field({ type: NoteOriginEnum, resolve: (n) => n.origin as 'manual' | 'ai' }),
    sourceConvoId: t.exposeString('sourceConvoId', { nullable: true }),
  }),
});

builder.prismaObject('Conversation', {
  fields: (t) => ({
    id: t.exposeID('id'),
    summary: t.exposeString('summary', { nullable: true }),
    transcript: t.exposeString('transcript'),
    convoDate: t.field({ type: 'String', resolve: (c) => c.convoDate.toISOString() }),
    speakerCount: t.exposeInt('speakerCount'),
  }),
});

builder.prismaObject('Followup', {
  fields: (t) => ({
    id: t.exposeID('id'),
    description: t.exposeString('description'),
    dueDate: t.field({ type: 'String', nullable: true, resolve: (f) => f.dueDate?.toISOString() ?? null }),
    status: t.field({ type: FollowupStatusEnum, resolve: (f) => f.status as 'open' | 'done' }),
    sourceType: t.field({ type: SourceTypeEnum, resolve: (f) => f.sourceType as 'note' | 'conversation' | 'manual' }),
    origin: t.field({ type: OriginEnum, resolve: (f) => f.origin as 'ai' | 'manual' }),
    sourceId: t.exposeString('sourceId', { nullable: true }),
  }),
});

builder.prismaObject('Contact', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    company: t.exposeString('company', { nullable: true }),
    role: t.exposeString('role', { nullable: true }),
    email: t.exposeString('email', { nullable: true }),
    aiStatus: t.field({ type: AiStatusEnum, resolve: (c) => c.aiStatus as 'idle' | 'processing' | 'done' | 'failed' }),
    notes: t.relation('notes', {
      query: () => ({ orderBy: { noteDate: 'asc' } }),
    }),
    conversations: t.relation('conversations', {
      query: () => ({ orderBy: { convoDate: 'asc' } }),
    }),
    followups: t.relation('followups', {
      query: () => ({ orderBy: { createdAt: 'asc' } }),
    }),
    openFollowupCount: t.int({
      resolve: async (contact) => {
        return prisma.followup.count({
          where: { contactId: contact.id, status: 'open' },
        });
      },
    }),
    lastActivityAt: t.string({
      nullable: true,
      resolve: async (contact) => {
        const [note, convo, followup] = await Promise.all([
          prisma.note.findFirst({ where: { contactId: contact.id }, orderBy: { noteDate: 'desc' }, select: { noteDate: true } }),
          prisma.conversation.findFirst({ where: { contactId: contact.id }, orderBy: { convoDate: 'desc' }, select: { convoDate: true } }),
          prisma.followup.findFirst({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        ]);
        const dates = [note?.noteDate, convo?.convoDate, followup?.createdAt].filter((d): d is Date => d instanceof Date);
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString();
      },
    }),
  }),
});
