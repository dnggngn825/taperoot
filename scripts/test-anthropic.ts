// Test script for Anthropic API — verifies the key works and Haiku 4.5 responds correctly.
// Usage: npx tsx --env-file=.env scripts/test-anthropic.ts
//
// Uses the same forced-tool pattern the real AnthropicExtractor will use.

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set. Run with: npx tsx --env-file=.env scripts/test-anthropic.ts');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const context = {
  name: 'Emma Wilson',
  company: 'Wilson Studio',
  role: 'Brand Designer',
  notes: [] as { id: string; body: string; note_date: string }[],
  conversations: [
    {
      id: 'convo-test-1',
      convo_date: '2026-06-19',
      summary:
        "Design kickoff. Emma to send proposal with timeline and pricing by Tuesday. Owner needs it before Friday board meeting. Kickoff call to be scheduled next week.",
      transcript: JSON.stringify([
        { speaker: 'Speaker 1', text: "Emma, your portfolio is stunning. We're definitely interested." },
        { speaker: 'Speaker 2', text: "I'll send a proposal with timeline and pricing by Wednesday." },
        { speaker: 'Speaker 1', text: "I need it before Friday for the board." },
        { speaker: 'Speaker 2', text: "Understood — I'll have it in your inbox by Tuesday evening." },
        { speaker: 'Speaker 1', text: "Once we align on direction, we'll need a kickoff call next week." },
        { speaker: 'Speaker 2', text: "I'll block time in my calendar next week and send you options." },
      ]),
    },
  ],
};

const systemPrompt = `You are helping a Blinq user follow up with their contacts.
Given a contact and their notes and conversation summaries/transcripts, extract:
1. A short AI-generated note for each conversation (1-2 sentences summarising it)
2. Concrete next-step follow-up actions the user should take

Rules:
- Infer a due date when language implies one ("next week", "by Friday", etc.)
- Attribute each action to the note or conversation it came from
- Do not invent actions not supported by the context
- Keep note text to 1-2 sentences`;

const userPrompt = `Contact: ${context.name} (${context.role} at ${context.company})

Conversations:
${context.conversations.map((c) => `[${c.id}] ${c.convo_date}\nSummary: ${c.summary}\nTranscript:\n${c.transcript}`).join('\n\n')}`;

console.log('Calling claude-haiku-4-5-20251001 with forced tool...\n');

async function main() {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    tools: [
      {
        name: 'emit_results',
        description: 'Emit extracted notes and follow-up actions',
        input_schema: {
          type: 'object' as const,
          properties: {
            notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  convo_id: { type: 'string' },
                  text: { type: 'string' },
                  date: { type: 'string', description: 'ISO date matching the conversation date' },
                },
                required: ['convo_id', 'text', 'date'],
              },
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  due_date: { type: 'string', description: 'ISO date, empty string if none' },
                  source_type: { type: 'string', enum: ['note', 'conversation'] },
                  source_id: { type: 'string' },
                },
                required: ['description', 'due_date', 'source_type', 'source_id'],
              },
            },
          },
          required: ['notes', 'actions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'emit_results' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    console.error('❌ No tool_use block in response');
    console.error(JSON.stringify(response.content, null, 2));
    process.exit(1);
  }

  const result = toolUse.input as { notes: unknown[]; actions: unknown[] };

  console.log('✅ Response received\n');
  console.log('Notes:');
  console.log(JSON.stringify(result.notes, null, 2));
  console.log('\nActions:');
  console.log(JSON.stringify(result.actions, null, 2));
  console.log(`\nUsage: ${response.usage.input_tokens} input / ${response.usage.output_tokens} output tokens`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
