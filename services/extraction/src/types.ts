// Shared types mirroring the proto contract — used by Extractor implementations
// and the gRPC handler.

export interface NoteCtx {
  id: string;
  body: string;
  note_date: string; // ISO date
}

export interface ConversationCtx {
  id: string;
  convo_date: string; // ISO date
  summary: string;   // empty string if null
  transcript: string; // JSON string [{ speaker, text }]
}

export interface ContactContext {
  name: string;
  company: string;
  role: string;
  notes: NoteCtx[];
  conversations: ConversationCtx[];
}

export interface ExtractedNote {
  convo_id: string;
  text: string;
  date: string; // ISO date
}

export interface ExtractedAction {
  description: string;
  due_date: string;    // ISO date or empty string
  source_type: string; // "note" | "conversation"
  source_id: string;
}

export interface ExtractionResult {
  notes: ExtractedNote[];
  actions: ExtractedAction[];
}

export interface Extractor {
  generate(context: ContactContext): Promise<ExtractionResult>;
}
