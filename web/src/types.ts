export type ContactSort = 'recent_update' | 'alphabetical';

export interface Note {
  id: string;
  body: string;
  noteDate: string;
  origin: string;
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
  status: string;
  origin: string;
}

export interface ContactSummary {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  aiStatus: string;
  openFollowupCount: number;
  lastActivityAt: string | null;
  /** ids only — used to pick a default contact that has conversations */
  conversations: { id: string }[];
}

export interface ContactDetail extends ContactSummary {
  notes: Note[];
  conversations: Conversation[];
  followups: Followup[];
}
