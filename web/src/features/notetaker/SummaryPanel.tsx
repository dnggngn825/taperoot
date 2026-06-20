export function SummaryPanel({ summary }: { summary: string | null }) {
  return (
    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
      {summary ?? <span style={{ color: 'var(--muted)' }}>No summary available.</span>}
    </div>
  );
}
