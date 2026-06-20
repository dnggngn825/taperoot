import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  headerRight?: ReactNode;
  width?: number | string;
  background?: string;
  children: ReactNode;
};

export function SidebarPanel({ title, headerRight, width = 'var(--w-sidebar)', background = 'var(--panel)', children }: Props) {
  return (
    <div style={{ width, flex: 'none', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background }}>
      <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{title}</span>
        {headerRight}
      </div>
      <div className="scroll-area" style={{ flex: 1, padding: '0 8px 8px' }}>
        {children}
      </div>
    </div>
  );
}
