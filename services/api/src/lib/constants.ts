// Shared union type constants — used across API resolvers and seed.
// Prisma enums are not supported on SQLite, so DB stores strings; these
// consts enforce type-safety at the TS layer.

export const AI_STATUS = ['idle', 'processing', 'done', 'failed'] as const;
export type AiStatus = (typeof AI_STATUS)[number];

export const NOTE_ORIGIN = ['manual', 'ai'] as const;
export type NoteOrigin = (typeof NOTE_ORIGIN)[number];

export const FOLLOWUP_STATUS = ['open', 'done'] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUS)[number];

export const SOURCE_TYPE = ['note', 'conversation', 'manual'] as const;
export type SourceType = (typeof SOURCE_TYPE)[number];

export const ORIGIN = ['ai', 'manual'] as const;
export type Origin = (typeof ORIGIN)[number];
