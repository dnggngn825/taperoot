import assert from 'node:assert/strict';
import type { ContactContext } from '../services/extraction/src/types.js';
import { validateExtractionResult } from '../services/extraction/src/extractors/validate-output.js';

const context: ContactContext = {
  name: 'Test Contact',
  company: 'Test Company',
  role: 'Tester',
  notes: [{ id: 'note-1', body: 'Send the proposal.', note_date: '2026-06-19' }],
  conversations: [{
    id: 'conversation-1',
    convo_date: '2026-06-19',
    summary: 'Discussed the proposal.',
    transcript: '[]',
  }],
};

const valid = validateExtractionResult({
  notes: [{ convo_id: 'conversation-1', text: 'Discussed the proposal.', date: '2026-06-19' }],
  actions: [{
    description: 'Send the proposal',
    due_date: '2026-06-26',
    source_type: 'note',
    source_id: 'note-1',
  }],
}, context);

assert.equal(valid.actions[0]?.source_id, 'note-1');

assert.throws(() => validateExtractionResult({
  notes: [],
  actions: [{
    description: 'Invented action',
    due_date: '',
    source_type: 'conversation',
    source_id: 'missing-conversation',
  }],
}, context), /unknown conversation/);

assert.throws(() => validateExtractionResult({
  notes: [],
  actions: [{
    description: 'Invalid date action',
    due_date: '2026-02-30',
    source_type: 'note',
    source_id: 'note-1',
  }],
}, context), /expected YYYY-MM-DD/);

console.log('Extraction output validation tests passed');