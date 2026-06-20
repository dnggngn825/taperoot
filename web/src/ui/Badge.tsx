import type { ReactNode } from 'react';

export function Badge({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: 'var(--coral)', color: '#fff', borderRadius: 'var(--r-pill)',
      fontSize: 11, fontWeight: 600, padding: '2px 7px', flex: 'none',
    }}>
      {children}
    </div>
  );
}
