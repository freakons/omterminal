import type { SignalInsightData } from '@/lib/signals/insightGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
};

const INSIGHT_CARD: React.CSSProperties = {
  padding: '24px 28px', borderRadius: 'var(--r)',
  background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, var(--glass) 100%)',
  border: '1px solid rgba(79,70,229,0.2)',
};

const LABEL_DOT: React.CSSProperties = {
  width: 6, height: 6, borderRadius: '50%',
  background: 'var(--indigo-l)', flexShrink: 0, marginTop: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface SignalInsightBlockProps {
  insight: SignalInsightData;
}

/**
 * SignalInsightBlock — the "Why This Matters" intelligence layer.
 *
 * Renders the interpretive insight and key implications in a prominent
 * position on the signal detail page. Designed to help readers understand
 * significance within 5 seconds.
 */
export function SignalInsightBlock({ insight }: SignalInsightBlockProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Why This Matters */}
      <div style={INSIGHT_CARD}>
        <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16, color: 'var(--indigo-l)' }}>
          Why This Matters
        </h2>
        <p style={{
          fontSize: 15, color: 'var(--text)', lineHeight: 1.85,
          fontFamily: 'var(--fd)', fontStyle: 'italic', margin: 0,
        }}>
          {insight.whyThisMatters}
        </p>
      </div>

      {/* Key Implications */}
      {insight.implications.length > 0 && (
        <div style={{
          padding: '20px 24px', borderRadius: 'var(--r)',
          background: 'var(--glass)', border: '1px solid var(--border)',
        }}>
          <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>
            Key Implications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {insight.implications.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={LABEL_DOT} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--indigo-l)',
                    marginRight: 8,
                  }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    {item.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
