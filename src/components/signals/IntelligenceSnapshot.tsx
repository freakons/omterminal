/**
 * IntelligenceSnapshot — "Today's Intelligence Snapshot" section
 *
 * Selects the top 3 signals by significance score and renders a concise,
 * high-impact 1-line summary per signal: entity + key movement + implication.
 *
 * Design goals:
 *   • Minimal — no new APIs, no new data fetching
 *   • Fast — pure component, no client-side JS required
 *   • Reuses existing signal ranking (significanceScore → confidence fallback)
 */

import Link from 'next/link';
import type { Signal, SignalCategory } from '@/data/mockSignals';
import { CopyInsightButton } from '@/components/ui/CopyInsightButton';

// ─────────────────────────────────────────────────────────────────────────────
// Category colours (matches existing SignalsBrowser palette)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<SignalCategory, string> = {
  models:     'var(--violet-l, #a78bfa)',
  funding:    'var(--amber-l, #fbbf24)',
  regulation: 'var(--rose-l,  #fb7185)',
  research:   'var(--sky-l,   #38bdf8)',
  agents:     'var(--cyan-l,  #67e8f9)',
  product:    'var(--emerald-l, #34d399)',
};

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  models:     'Model',
  funding:    'Funding',
  regulation: 'Regulation',
  research:   'Research',
  agents:     'Agents',
  product:    'Product',
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary builder — entity + key movement + implication (one line)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a 1-line snapshot summary from signal fields.
 *
 * Priority order for implication text:
 *   1. context.summary  (LLM-generated headline, most concise)
 *   2. whyThisMatters   (intelligence layer field)
 *   3. signal.summary   (raw signal summary, truncated to ~90 chars)
 */
function buildSnapshotLine(signal: Signal): string {
  // Prefer the LLM-generated context summary (already a headline sentence)
  const implication =
    signal.context?.summary?.trim() ||
    signal.whyThisMatters?.trim() ||
    truncate(signal.summary, 90);

  // Key movement: signal title, trimmed slightly for space
  const movement = truncate(signal.title, 60);

  return `${movement} — ${implication}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking — top 3 by significanceScore, confidence as fallback
// ─────────────────────────────────────────────────────────────────────────────

function getTop3(signals: Signal[]): Signal[] {
  return [...signals]
    .sort((a, b) => {
      const sa = a.significanceScore ?? a.confidence ?? 0;
      const sb = b.significanceScore ?? b.confidence ?? 0;
      return sb - sa;
    })
    .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface IntelligenceSnapshotProps {
  signals: Signal[];
}

export function IntelligenceSnapshot({ signals }: IntelligenceSnapshotProps) {
  if (!signals || signals.length === 0) return null;

  const top3 = getTop3(signals);
  if (top3.length === 0) return null;

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const copyText = [
    `Today's Intelligence Snapshot — ${today}`,
    '',
    ...top3.map((signal, idx) => {
      const line = buildSnapshotLine(signal);
      const score = signal.significanceScore ?? signal.confidence;
      const scoreStr = score != null ? ` [${score}]` : '';
      return `${idx + 1}. ${signal.entityName} — ${line}${scoreStr}`;
    }),
    '',
    'via OM Terminal',
  ].join('\n');

  return (
    <section
      aria-label="Today's Intelligence Snapshot"
      style={{
        padding: '16px 20px',
        borderRadius: 'var(--r)',
        background: 'var(--glass)',
        border: '1px solid var(--border)',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }}>
          Today&apos;s Intelligence Snapshot
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            color: 'var(--text3)',
            letterSpacing: '0.06em',
          }}>
            {today}
          </span>
          <CopyInsightButton text={copyText} />
        </div>
      </div>

      {/* Signal rows */}
      <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top3.map((signal, idx) => {
          const cat = (signal.category ?? 'models') as SignalCategory;
          const color = CATEGORY_COLOR[cat] ?? 'var(--text3)';
          const label = CATEGORY_LABEL[cat] ?? signal.category;
          const line = buildSnapshotLine(signal);
          const score = signal.significanceScore ?? signal.confidence;

          return (
            <li
              key={signal.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              {/* Rank number */}
              <span style={{
                fontFamily: 'var(--fm)',
                fontSize: 9,
                color: 'var(--text3)',
                minWidth: 14,
                paddingTop: 2,
                userSelect: 'none',
              }}>
                {idx + 1}.
              </span>

              {/* Category dot */}
              <span
                title={label}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />

              {/* Summary line */}
              <span style={{
                flex: 1,
                fontSize: 12,
                color: 'var(--text)',
                lineHeight: 1.55,
              }}>
                {signal.entityName ? (
                  <Link
                    href={`/entity/${encodeURIComponent(signal.entityName.toLowerCase().replace(/\s+/g, '-'))}`}
                    style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    {signal.entityName}
                  </Link>
                ) : (
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Signal</strong>
                )}
                {' — '}
                <Link
                  href={`/signals/${signal.id}`}
                  style={{ color: 'var(--text2)', textDecoration: 'none' }}
                >
                  {line}
                </Link>
              </span>

              {/* Significance score */}
              {score != null && (
                <span style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 9,
                  color: color,
                  paddingTop: 2,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {score}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
