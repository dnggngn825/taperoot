export interface NoteCtx {
  id: string;
  body: string;
  note_date: string;
}

export interface ConversationCtx {
  id: string;
  convo_date: string;
  summary: string;
  transcript: string;
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
  date: string;
}

export interface ExtractedAction {
  description: string;
  due_date: string;
  source_type: string;
  source_id: string;
}

export interface ExtractionResult {
  notes: ExtractedNote[];
  actions: ExtractedAction[];
}

export interface GenerateForContactRequest {
  contact_id: string;
  context: ContactContext;
}

export type GenerateForContactResponse = ExtractionResult;

export interface Extractor {
  generate(context: ContactContext): Promise<ExtractionResult>;
}
