import { useState } from 'react';
import { SummaryPanel } from './SummaryPanel.tsx';
import { TranscriptPanel } from './TranscriptPanel.tsx';
import { formatDate } from '../../lib/format.ts';
import type { Conversation } from '../../types.ts';

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function firstSentence(summary: string | null): string {
  if (!summary) return 'Conversation';
  const match = summary.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : summary.slice(0, 80).trim();
}

export function ConversationDetail({ conversation, contactName }: { conversation: Conversation; contactName: string }) {
  const [tab, setTab] = useState<'summary' | 'transcript'>('summary');
  const title = firstSentence(conversation.summary);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border)', flex: 'none' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 18 }}>
          {formatDate(conversation.convoDate)} &middot; {conversation.speakerCount} speaker{conversation.speakerCount !== 1 ? 's' : ''}
        </div>

        {/* People */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted-2)', textTransform: 'uppercase' }}>People</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', background: 'var(--panel)', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--coral)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {initials(contactName)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{contactName}</span>
            </div>
            {Array.from({ length: Math.max(0, conversation.speakerCount - 2) }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', background: 'var(--panel)', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-2)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--panel-track)', color: 'var(--muted)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>?</div>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Unknown</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pill tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
          {(['summary', 'transcript'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: tab === t ? 600 : 400,
              background: tab === t ? 'var(--ink)' : 'transparent',
              color: tab === t ? 'var(--ink-invert)' : 'var(--muted)',
            }}>
              {t === 'summary' ? 'AI summary' : 'Transcript'}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: '28px 40px' }}>
        {tab === 'summary'
          ? <SummaryPanel summary={conversation.summary} />
          : <TranscriptPanel transcript={conversation.transcript} />}
      </div>
    </div>
  );
}
