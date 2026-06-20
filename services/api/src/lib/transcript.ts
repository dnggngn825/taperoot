// Plain-text transcript parser
// Input: "Speaker 1: hello\nSpeaker 2: hi there"
// Output: [{ speaker: "Speaker 1", text: "hello" }, ...]

export interface TranscriptTurn {
  speaker: string;
  text: string;
}

export function parseRawTranscript(raw: string): { turns: TranscriptTurn[]; speakerCount: number } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const turns: TranscriptTurn[] = [];
  const speakers = new Set<string>();

  for (const line of lines) {
    // Match "Speaker N: text" or "Name: text"
    const match = line.match(/^([^:]+?):\s*(.+)$/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      speakers.add(speaker);
      turns.push({ speaker, text });
    }
  }

  // If no structured lines found, treat whole text as one turn
  if (turns.length === 0 && raw.trim()) {
    turns.push({ speaker: 'Speaker 1', text: raw.trim() });
    speakers.add('Speaker 1');
  }

  return { turns, speakerCount: Math.max(speakers.size, 1) };
}
