/**
 * TopInsight — "Today's Top Insight" section
 *
 * Surfaces a single high-impact insight sentence derived from the strongest
 * signal in the current set.  No new data fetching — works entirely from the
 * signals already loaded on the homepage.
 *
 * Insight derivation:
 *   1. Rank signals by significanceScore (confidence fallback)
 *   2. Pick the top-ranked signal as the anchor
 *   3. Build a 1-line sentence: prefer strategicImpact → context.summary →
 *      whyThisMatters → raw summary.  When related signals exist, surface the
 *      cross-entity connection.
 */

import type { Signal, SignalCategory } from '@/data/mockSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Category colours (mirrors IntelligenceSnapshot palette)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<SignalCategory, string> = {
  models:     '#a78bfa',   // violet
  funding:    '#fbbf24',   // amber
  regulation: '#fb7185',   // rose
  research:   '#38bdf8',   // sky
  agents:     '#67e8f9',   // cyan
  product:    '#34d399',   // emerald
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function deriveTopSignal(signals: Signal[]): Signal | null {
  if (!signals || signals.length === 0) return null;
  return [...signals].sort((a, b) => {
    const sa = a.significanceScore ?? a.confidence ?? 0;
    const sb = b.significanceScore ?? b.confidence ?? 0;
    return sb - sa;
  })[0] ?? null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

/**
 * Build the insight sentence for the top signal.
 *
 * Priority:
 *   1. strategicImpact  — decision-maker framing, most actionable
 *   2. context.summary  — LLM headline sentence
 *   3. whyThisMatters   — intelligence layer explanation
 *   4. related signal connection — cross-entity insight when relatedIds exist
 *   5. raw signal summary (truncated)
 */
function buildInsightSentence(signal: Signal, allSignals: Signal[]): string {
  if (signal.strategicImpact?.trim()) return signal.strategicImpact.trim();
  if (signal.context?.summary?.trim())  return signal.context.summary.trim();
  if (signal.whyThisMatters?.trim())    return signal.whyThisMatters.trim();

  // Cross-entity connection via relatedIds
  if (signal.relatedIds && signal.relatedIds.length > 0) {
    const partner = allSignals.find(s => signal.relatedIds!.includes(s.id));
    if (partner && partner.entityId !== signal.entityId) {
      return `${signal.entityName}'s ${signal.category} move intersects with ${partner.entityName}'s ${partner.category} signal — a cross-entity development worth tracking.`;
    }
  }

  return truncate(signal.summary, 110);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TopInsightProps {
  signals: Signal[];
}

export function TopInsight({ signals }: TopInsightProps) {
  const top = deriveTopSignal(signals);
  if (!top) return null;

  const sentence  = buildInsightSentence(top, signals);
  const cat       = (top.category ?? 'models') as SignalCategory;
  const accent    = CATEGORY_COLOR[cat] ?? '#8888a8';
  const score     = top.significanceScore ?? top.confidence;

  return (
    <section
      aria-label="Today's Top Insight"
      style={{
        position: 'relative',
        padding: '14px 18px 14px 22px',
        borderRadius: 'var(--r)',
        background: 'var(--glass)',
        border: '1px solid var(--border)',
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: accent,
          opacity: 0.75,
        }}
      />

      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: 'var(--text3)',
        }}>
          Today&apos;s Top Insight
        </span>
        {score != null && (
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            color: accent,
            letterSpacing: '0.06em',
          }}>
            {score}
          </span>
        )}
      </div>

      {/* Insight row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Category dot */}
        <span
          title={cat}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            marginTop: 5,
            flexShrink: 0,
          }}
        />

        {/* Sentence */}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
          <strong style={{ color: accent, fontWeight: 600 }}>
            {top.entityName}
          </strong>
          {' — '}
          <span style={{ color: 'var(--text2)' }}>{sentence}</span>
        </p>
      </div>
    </section>
  );
}
