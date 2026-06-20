function DiamondIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ flex: 'none' }}>
      <polygon points="6,0 12,6 6,12 0,6" fill="var(--coral)" />
    </svg>
  );
}

export function SummaryPanel({ summary }: { summary: string | null }) {
  if (!summary) {
    return <div style={{ color: 'var(--muted)', fontSize: 14 }}>No summary available.</div>;
  }
  return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-card)', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <DiamondIcon />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--coral)', textTransform: 'uppercase' }}>AI Summary</span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.8 }}>{summary}</div>
    </div>
  );
}
