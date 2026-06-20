import { builder } from './builder.js';
import { prisma } from '../db.js';
import { ContactSortEnum } from './types.js';

async function getOwnerId(): Promise<string> {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No owner user found — run seed first');
  return user.id;
}

builder.queryFields((t) => ({
  contacts: t.prismaField({
    type: ['Contact'],
    args: {
      q: t.arg.string(),
      sort: t.arg({ type: ContactSortEnum }),
    },
    resolve: async (query, _root, args) => {
      const ownerId = await getOwnerId();
      const q = args.q?.trim();

      const where = q
        ? {
            userId: ownerId,
            OR: [
              { name: { contains: q } },
              { company: { contains: q } },
              { notes: { some: { body: { contains: q } } } },
              { conversations: { some: { summary: { contains: q } } } },
            ],
          }
        : { userId: ownerId };

      const contacts = await prisma.contact.findMany({
        ...query,
        where,
        include: {
          notes: { orderBy: { noteDate: 'asc' } },
          conversations: { orderBy: { convoDate: 'asc' } },
          followups: { orderBy: { createdAt: 'asc' } },
        },
      });

      const withActivity = contacts.map((c) => {
        const dates = [
          ...c.notes.map((n) => n.noteDate),
          ...c.conversations.map((cv) => cv.convoDate),
          ...c.followups.map((f) => f.createdAt),
        ].filter((d): d is Date => d instanceof Date);
        const lastActivityAt = dates.length > 0
          ? new Date(Math.max(...dates.map((d) => d.getTime())))
          : null;
        return { ...c, _lastActivityAt: lastActivityAt };
      });

      if (args.sort === 'alphabetical') {
        withActivity.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        withActivity.sort((a, b) => {
          if (!a._lastActivityAt && !b._lastActivityAt) return 0;
          if (!a._lastActivityAt) return 1;
          if (!b._lastActivityAt) return -1;
          return b._lastActivityAt.getTime() - a._lastActivityAt.getTime();
        });
      }

      return withActivity;
    },
  }),

  contact: t.prismaField({
    type: 'Contact',
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (query, _root, args) => {
      return prisma.contact.findUnique({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
}));
