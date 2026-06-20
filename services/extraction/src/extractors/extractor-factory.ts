import type { Extractor } from '../types.js';
import { MockExtractor } from './mock-extractor.js';
import { AnthropicExtractor } from './anthropic-extractor.js';

export function createExtractor(env: NodeJS.ProcessEnv = process.env): Extractor {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (apiKey) {
    console.log('[extraction] extractor: AnthropicExtractor (claude-haiku-4-5-20251001)');
    return new AnthropicExtractor(apiKey);
  }
  console.log('[extraction] extractor: MockExtractor (no ANTHROPIC_API_KEY — keyless mode)');
  return new MockExtractor();
}
