import type { CSSProperties } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  multiline?: boolean;
  placeholder?: string;
  saveLabel?: string;
};

export function InlineEditor({ value, onChange, onSave, onCancel, multiline, placeholder, saveLabel = 'Save' }: Props) {
  const field: CSSProperties = {
    width: '100%', padding: multiline ? 8 : '4px 8px', borderRadius: 6,
    border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical',
  };
  return (
    <div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} style={field} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={field} />
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onSave} style={{ padding: '4px 12px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>{saveLabel}</button>
        <button onClick={onCancel} style={{ padding: '4px 12px', background: 'none', border: '1px solid var(--border-btn)', borderRadius: 'var(--r-pill)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}
