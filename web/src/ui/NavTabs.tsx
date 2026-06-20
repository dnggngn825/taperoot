type Tab = 'contacts' | 'notetaker';

export function NavTabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 3,
      background: 'var(--panel-track)', borderRadius: 'var(--r-pill)',
    }}>
      {(['contacts', 'notetaker'] as Tab[]).map((tab) => {
        const active = value === tab;
        return (
          <button key={tab} onClick={() => onChange(tab)} style={{
            padding: '5px 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
            background: active ? '#fff' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--muted-3)',
            boxShadow: active ? 'var(--shadow-nav)' : 'none',
          }}>
            {tab === 'contacts' ? 'Contacts' : 'Notetaker'}
          </button>
        );
      })}
    </div>
  );
}
