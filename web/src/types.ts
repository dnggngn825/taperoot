export type ContactSort = 'recent_update' | 'alphabetical';
export type NoteOrigin = 'manual' | 'ai';
export type FollowupStatus = 'open' | 'done';
export type AiStatus = 'idle' | 'processing' | 'done' | 'failed';

export interface Note {
  id: string;
  body: string;
  noteDate: string;
  origin: NoteOrigin;
  sourceConvoId: string | null;
}

export interface Conversation {
  id: string;
  summary: string | null;
  transcript: string;
  convoDate: string;
  speakerCount: number;
}

export interface Followup {
  id: string;
  description: string;
  dueDate: string | null;
  status: FollowupStatus;
  origin: NoteOrigin;
}

export interface ContactSummary {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  aiStatus: AiStatus;
  openFollowupCount: number;
  lastActivityAt: string | null;
  conversations: { id: string }[];
}

export interface ContactDetail extends ContactSummary {
  notes: Note[];
  conversations: Conversation[];
  followups: Followup[];
}
