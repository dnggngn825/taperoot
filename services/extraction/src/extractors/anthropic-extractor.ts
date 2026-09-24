import Anthropic from '@anthropic-ai/sdk';
import type { ContactContext, ExtractionResult, Extractor } from '../types.js';
import { SYSTEM_PROMPT, TOOL_SCHEMA, buildPrompt } from './anthropic-prompt.js';
import { validateExtractionResult } from './validate-output.js';

const MODEL = process.env.MODEL ?? 'claude-haiku-4-5-20251001';

export class AnthropicExtractor implements Extractor {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(context: ContactContext): Promise<ExtractionResult> {
    const userPrompt = buildPrompt(context);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'emit_results' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('AnthropicExtractor: no tool_use block in response');
    }

    return validateExtractionResult(toolUse.input, context);
  }
}
