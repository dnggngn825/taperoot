// Backend API test script — Phase 6 exit checks
// Usage: npm run test:api  (requires api + extraction services running)

const API_URL = process.env.API_URL ?? 'http://localhost:4000/graphql';

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { data?: Record<string, unknown>; errors?: { message: string }[] };
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join(', '));
  return json.data!;
}

async function poll(contactId: string, timeoutMs = 20000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const d = await gql('query($id:ID!){contact(id:$id){aiStatus}}', { id: contactId });
    const status = (d.contact as { aiStatus: string }).aiStatus;
    if (status === 'done' || status === 'failed') return status;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('poll timeout');
}

async function main() {
  let passed = 0;
  let failed = 0;

  function assert(label: string, ok: boolean, detail?: string) {
    if (ok) { console.log(`  ✅ ${label}`); passed++; }
    else { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); failed++; }
  }

  // Get contact ids from seed
  const contactsData = await gql('{ contacts { id name } }');
  const contacts = contactsData.contacts as { id: string; name: string }[];
  const alice = contacts.find((c) => c.name === 'Alice Chen')!;
  const carol = contacts.find((c) => c.name === 'Carol Singh')!;
  const frank = contacts.find((c) => c.name === 'Frank Lee')!;

  // ── Test 1: addNote on notes-only contact → origin=manual, auto-trigger ────
  console.log('\nTest 1: addNote on notes-only contact → manual + auto-trigger');
  try {
    const d = await gql(`mutation {
      addNote(contactId: "${carol.id}", body: "New note — will send a follow-up next week", noteDate: "2026-06-20") {
        id origin
      }
    }`);
    const note = d.addNote as { id: string; origin: string };
    assert('origin = manual', note.origin === 'manual', note.origin);
    const status = await poll(carol.id);
    assert('aiStatus reaches done', status === 'done', status);
    const d2 = await gql(`{ contact(id: "${carol.id}") { followups { origin } notes { origin } } }`);
    const c = d2.contact as { followups: { origin: string }[]; notes: { origin: string }[] };
    assert('ai followups created', c.followups.some((f) => f.origin === 'ai'));
    assert('no ai notes on notes-only path', !c.notes.some((n) => n.origin === 'ai'));
  } catch (e) { console.error('  ❌ test1 threw:', (e as Error).message); failed++; }

  // ── Test 2: addNote on contact with conversations → no auto-trigger ─────────
  console.log('\nTest 2: addNote on contact with conversations → no auto-trigger');
  try {
    await gql(`mutation { generateForContact(contactId: "${alice.id}") { id } }`);
    await poll(alice.id);
    await gql(`mutation { addNote(contactId: "${alice.id}", body: "Extra note", noteDate: "2026-06-20") { id } }`);
    await new Promise((r) => setTimeout(r, 1500));
    const d = await gql(`{ contact(id: "${alice.id}") { aiStatus } }`);
    const status = (d.contact as { aiStatus: string }).aiStatus;
    assert('aiStatus stays done (no re-trigger)', status === 'done', status);
  } catch (e) { console.error('  ❌ test2 threw:', (e as Error).message); failed++; }

  // ── Test 3: explicit generateForContact → AI notes + followups ─────────────
  console.log('\nTest 3: explicit generateForContact → AI notes + followups');
  try {
    await gql(`mutation { generateForContact(contactId: "${alice.id}") { id } }`);
    const status = await poll(alice.id);
    assert('aiStatus = done', status === 'done', status);
    const d = await gql(`{ contact(id: "${alice.id}") { notes { origin } followups { origin } } }`);
    const c = d.contact as { notes: { origin: string }[]; followups: { origin: string }[] };
    assert('AI notes created', c.notes.some((n) => n.origin === 'ai'));
    assert('AI followups created', c.followups.some((f) => f.origin === 'ai'));
  } catch (e) { console.error('  ❌ test3 threw:', (e as Error).message); failed++; }

  // ── Test 4: idempotency — generate twice, count stays bounded (not accumulating) ──
  console.log('\nTest 4: idempotency — generate twice = no accumulation');
  try {
    await gql(`mutation { generateForContact(contactId: "${alice.id}") { id } }`);
    await poll(alice.id);
    const d1 = await gql(`{ contact(id: "${alice.id}") { followups { origin status } } }`);
    const c1 = (d1.contact as { followups: { origin: string; status: string }[] }).followups.filter((f) => f.origin === 'ai' && f.status === 'open').length;

    await gql(`mutation { generateForContact(contactId: "${alice.id}") { id } }`);
    await poll(alice.id);
    const d2 = await gql(`{ contact(id: "${alice.id}") { followups { origin status } } }`);
    const c2 = (d2.contact as { followups: { origin: string; status: string }[] }).followups.filter((f) => f.origin === 'ai' && f.status === 'open').length;

    // If accumulating, c2 would equal c1 + c2_original (doubled). Allow ±2 for LLM variance.
    assert('no accumulation — count bounded (not doubling)', c2 < c1 * 2, `c1=${c1} c2=${c2}`);
    assert('followups still exist after re-generate', c2 > 0, `c2=${c2}`);
  } catch (e) { console.error('  ❌ test4 threw:', (e as Error).message); failed++; }

  // ── Test 5: eligibility guard ────────────────────────────────────────────────
  console.log('\nTest 5: eligibility guard → Frank stays idle');
  try {
    await gql(`mutation { generateForContact(contactId: "${frank.id}") { id } }`);
    await new Promise((r) => setTimeout(r, 500));
    const d = await gql(`{ contact(id: "${frank.id}") { aiStatus } }`);
    const status = (d.contact as { aiStatus: string }).aiStatus;
    assert('Frank aiStatus = idle', status === 'idle', status);
  } catch (e) { console.error('  ❌ test5 threw:', (e as Error).message); failed++; }

  // ── Test 6: updateFollowup + done survives re-generate ───────────────────────
  console.log('\nTest 6: updateFollowup + done survives re-generate');
  try {
    const d = await gql(`{ contact(id: "${alice.id}") { followups { id status origin } } }`);
    const followups = (d.contact as { followups: { id: string; status: string; origin: string }[] }).followups;
    const openAi = followups.find((f) => f.status === 'open' && f.origin === 'ai');
    if (!openAi) { console.log('  ⚠️  no open AI followup — skip'); }
    else {
      await gql(`mutation { updateFollowup(id: "${openAi.id}", status: "done") { id status } }`);
      const d2 = await gql(`{ contact(id: "${alice.id}") { followups { id status } } }`);
      const updated = (d2.contact as { followups: { id: string; status: string }[] }).followups.find((f) => f.id === openAi.id);
      assert('status flipped to done', updated?.status === 'done', updated?.status);
      await gql(`mutation { generateForContact(contactId: "${alice.id}") { id } }`);
      await poll(alice.id);
      const d3 = await gql(`{ contact(id: "${alice.id}") { followups { id status } } }`);
      const survived = (d3.contact as { followups: { id: string; status: string }[] }).followups.find((f) => f.id === openAi.id);
      assert('done followup survives re-generate', survived?.status === 'done', survived?.status);
    }
  } catch (e) { console.error('  ❌ test6 threw:', (e as Error).message); failed++; }

  // ── Test 7: addConversation → structured transcript, no auto-trigger ─────────
  console.log('\nTest 7: addConversation → structured, no auto-trigger');
  try {
    const before = await gql(`{ contact(id: "${carol.id}") { aiStatus } }`);
    const beforeStatus = (before.contact as { aiStatus: string }).aiStatus;
    const d = await gql(`mutation {
      addConversation(contactId: "${carol.id}", rawTranscript: "Speaker 1: Let us meet next week\\nSpeaker 2: Sounds great I will prepare the deck", convoDate: "2026-06-20") {
        id speakerCount transcript
      }
    }`);
    const convo = d.addConversation as { id: string; speakerCount: number; transcript: string };
    assert('speakerCount = 2', convo.speakerCount === 2, String(convo.speakerCount));
    const turns = JSON.parse(convo.transcript) as { speaker: string; text: string }[];
    assert('transcript is structured JSON', Array.isArray(turns) && turns[0]?.speaker != null);
    await new Promise((r) => setTimeout(r, 500));
    const after = await gql(`{ contact(id: "${carol.id}") { aiStatus } }`);
    const afterStatus = (after.contact as { aiStatus: string }).aiStatus;
    assert('no auto-trigger after addConversation', afterStatus === beforeStatus, afterStatus);
  } catch (e) { console.error('  ❌ test7 threw:', (e as Error).message); failed++; }

  // ── Test 8: updateNote ───────────────────────────────────────────────────────
  console.log('\nTest 8: updateNote → persists edit');
  try {
    const d = await gql(`{ contact(id: "${carol.id}") { notes { id origin } } }`);
    const notes = (d.contact as { notes: { id: string; origin: string }[] }).notes;
    const manual = notes.find((n) => n.origin === 'manual');
    if (!manual) { console.log('  ⚠️  no manual note — skip'); }
    else {
      await gql(`mutation { updateNote(id: "${manual.id}", body: "Updated body text") { id body } }`);
      const d2 = await gql(`{ contact(id: "${carol.id}") { notes { id body } } }`);
      const updated = (d2.contact as { notes: { id: string; body: string }[] }).notes.find((n) => n.id === manual.id);
      assert('note body updated', updated?.body === 'Updated body text', updated?.body);
    }
  } catch (e) { console.error('  ❌ test8 threw:', (e as Error).message); failed++; }

  // ── Test 9: generated followups reference known input sources ───────────────
  console.log('\nTest 9: generated followups → valid source references');
  try {
    const d = await gql(`{ contact(id: "${alice.id}") { notes { id } conversations { id } followups { origin sourceType sourceId } } }`);
    const contact = d.contact as {
      notes: { id: string }[];
      conversations: { id: string }[];
      followups: { origin: string; sourceType: string; sourceId: string | null }[];
    };
    const noteIds = new Set(contact.notes.map((note) => note.id));
    const conversationIds = new Set(contact.conversations.map((conversation) => conversation.id));
    const aiFollowups = contact.followups.filter((followup) => followup.origin === 'ai');
    const allSourcesAreValid = aiFollowups.length > 0 && aiFollowups.every((followup) => (
      followup.sourceId !== null && (
        followup.sourceType === 'note'
          ? noteIds.has(followup.sourceId)
          : followup.sourceType === 'conversation' && conversationIds.has(followup.sourceId)
      )
    ));
    assert('AI followups reference known notes or conversations', allSourcesAreValid);
  } catch (e) { console.error('  ❌ test9 threw:', (e as Error).message); failed++; }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });

