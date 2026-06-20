import { NavTabs } from './ui/NavTabs.tsx';

type Tab = 'contacts' | 'notetaker';

export function Header({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <header style={{
      height: 'var(--h-header)', background: 'var(--panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flex: 'none',
    }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
        Taperoot
      </div>
      <NavTabs value={tab} onChange={onTabChange} />
      <div style={{ width: 120 }} />
    </header>
  );
}
