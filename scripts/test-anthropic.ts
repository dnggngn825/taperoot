// Test script for Anthropic API — verifies the key works and Haiku 4.5 responds correctly.
// Usage: npx tsx --env-file=.env scripts/test-anthropic.ts
//
// Imports the prompt + forced-tool schema from the extraction service so this
// manual test always exercises the same wiring the real AnthropicExtractor uses.

import Anthropic from '@anthropic-ai/sdk';
import type { ContactContext } from '../services/extraction/src/types.js';
import {
  SYSTEM_PROMPT,
  TOOL_SCHEMA,
  buildPrompt,
} from '../services/extraction/src/extractors/anthropic-prompt.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set. Run with: npx tsx --env-file=.env scripts/test-anthropic.ts');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const context: ContactContext = {
  name: 'Emma Wilson',
  company: 'Wilson Studio',
  role: 'Brand Designer',
  notes: [],
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

console.log('Calling claude-haiku-4-5-20251001 with forced tool...\n');

async function main() {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'emit_results' },
    messages: [{ role: 'user', content: buildPrompt(context) }],
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
