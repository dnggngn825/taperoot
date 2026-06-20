import { useState } from 'react';
import { SummaryPanel } from './SummaryPanel.tsx';
import { TranscriptPanel } from './TranscriptPanel.tsx';
import type { Conversation } from '../../types.ts';

/** Mount one per conversation (key by id) so the sub-tab resets to summary on switch. */
export function ConversationDetail({ conversation }: { conversation: Conversation }) {
  const [noteTab, setNoteTab] = useState<'summary' | 'transcript'>('summary');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px 0', display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
        {(['summary', 'transcript'] as const).map(t => (
          <button key={t} onClick={() => setNoteTab(t)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: noteTab === t ? 600 : 400,
            color: noteTab === t ? 'var(--ink)' : 'var(--muted)',
            borderBottom: noteTab === t ? '2px solid var(--coral)' : '2px solid transparent',
          }}>{t === 'summary' ? 'AI Summary' : 'Transcript'}</button>
        ))}
      </div>
      <div className="scroll-area" style={{ flex: 1, padding: 24 }}>
        {noteTab === 'summary'
          ? <SummaryPanel summary={conversation.summary} />
          : <TranscriptPanel transcript={conversation.transcript} />}
      </div>
    </div>
  );
}
