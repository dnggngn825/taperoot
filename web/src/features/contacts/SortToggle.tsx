import type { ContactSort } from '../../types.ts';

export function SortToggle({ value, onChange }: { value: ContactSort; onChange: (s: ContactSort) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--panel-track)', borderRadius: 'var(--r-pill)' }}>
      {(['recent_update', 'alphabetical'] as ContactSort[]).map((s) => {
        const active = value === s;
        return (
          <button key={s} onClick={() => onChange(s)} style={{
            padding: '4px 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: active ? '#fff' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--muted-3)',
            boxShadow: active ? 'var(--shadow-nav)' : 'none',
          }}>{s === 'recent_update' ? 'Recent' : 'A–Z'}</button>
        );
      })}
    </div>
  );
}
