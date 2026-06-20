type Line = { speaker: string; text: string };

/** Read-only transcript view. Parses the stored JSON transcript and renders speaker turns. */
export function TranscriptPanel({ transcript }: { transcript: string }) {
  let lines: Line[] = [];
  try { lines = JSON.parse(transcript) as Line[]; } catch { lines = []; }

  if (lines.length === 0) {
    return <div style={{ color: 'var(--muted)', fontSize: 13 }}>No transcript available.</div>;
  }
  return (
    <div>
      {lines.map((line, i) => <TranscriptLine key={i} line={line} />)}
    </div>
  );
}

function TranscriptLine({ line }: { line: Line }) {
  const isS1 = line.speaker === 'Speaker 1';
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isS1 ? '#E2DACB' : '#CFE0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'var(--font-serif)', color: 'var(--ink-soft)', flex: 'none' }}>
        {isS1 ? 'S1' : 'S2'}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>{line.speaker}</div>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{line.text}</div>
      </div>
    </div>
  );
}
