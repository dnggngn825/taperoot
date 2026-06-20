// Smoke test for Phase 3 — runs against live extraction service on :50051
// Usage: npx tsx scripts/smoke-extraction.ts

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, '../proto/extraction.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = grpc.loadPackageDefinition(packageDef) as any;

const addr = process.env.EXTRACTION_ADDR ?? 'localhost:50051';
const client = new proto.extraction.v1.ExtractionService(
  addr,
  grpc.credentials.createInsecure(),
);

function call(request: unknown): Promise<{ notes: unknown[]; actions: unknown[] }> {
  return new Promise((resolve, reject) => {
    client.generateForContact(request, (err: Error | null, res: unknown) => {
      if (err) reject(err);
      else resolve(res as { notes: unknown[]; actions: unknown[] });
    });
  });
}

const convo = {
  id: 'convo-1',
  convo_date: '2026-06-20',
  summary: "Alice will send the deck by Friday. We'll schedule a deeper call next week.",
  transcript: JSON.stringify([
    { speaker: 'Speaker 1', text: "I'll connect you with our investor next week." },
    { speaker: 'Speaker 2', text: "I'll send the proposal by Friday." },
  ]),
};

const note = {
  id: 'note-1',
  body: "Need to follow up with Alice. I'll send the intro email today.",
  note_date: '2026-06-20',
};

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(label: string, ok: boolean, detail?: string) {
    if (ok) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  // ── Test 1: convo context → 1 note + ≥1 action ────────────────────────────
  console.log('\nTest 1: 1 conversation → 1 ExtractedNote + ≥1 ExtractedAction');
  try {
    const res = await call({
      contact_id: 'c1',
      context: { name: 'Alice', company: 'ACME', role: 'CEO', notes: [], conversations: [convo] },
    });
    assert('notes.length === 1', res.notes.length === 1, `got ${res.notes.length}`);
    assert('actions.length >= 1', res.actions.length >= 1, `got ${res.actions.length}`);
  } catch (e) {
    console.error('  ❌ threw:', e);
    failed++;
  }

  // ── Test 2: notes only → notes=[] + ≥1 action ─────────────────────────────
  console.log('\nTest 2: notes only → notes=[] + ≥1 ExtractedAction');
  try {
    const res = await call({
      contact_id: 'c2',
      context: { name: 'Bob', company: '', role: '', notes: [note], conversations: [] },
    });
    assert('notes.length === 0', res.notes.length === 0, `got ${res.notes.length}`);
    assert('actions.length >= 1', res.actions.length >= 1, `got ${res.actions.length}`);
  } catch (e) {
    console.error('  ❌ threw:', e);
    failed++;
  }

  // ── Test 3: empty context → {notes:[], actions:[]} no crash ───────────────
  console.log('\nTest 3: empty context → {notes:[], actions:[]}');
  try {
    const res = await call({
      contact_id: 'c3',
      context: { name: 'Frank', company: '', role: '', notes: [], conversations: [] },
    });
    assert('notes.length === 0', res.notes.length === 0);
    assert('actions.length === 0', res.actions.length === 0);
  } catch (e) {
    console.error('  ❌ threw:', e);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main();
