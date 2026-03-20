import type { Metadata } from 'next';
import { getSignals } from '@/db/queries';
import { generateBriefing } from '@/lib/briefing/generateBriefing';
import type { SignalCategory } from '@/data/mockSignals';

export const metadata: Metadata = {
  title: 'Intelligence Briefing — Omterminal',
  description: 'Concise intelligence briefing summarizing the most important AI signals, entities, and trends from the past week.',
};

export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Category styling (matches existing platform palette)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<SignalCategory, string> = {
  models:     'var(--violet-l, #a78bfa)',
  funding:    'var(--amber-l, #fbbf24)',
  regulation: 'var(--rose-l,  #fb7185)',
  research:   'var(--sky-l,   #38bdf8)',
  agents:     'var(--cyan-l,  #67e8f9)',
  product:    'var(--emerald-l, #34d399)',
};

const TIER_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ff4d4d', bg: 'rgba(255,77,77,0.08)' },
  high:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  standard: { color: 'var(--text3)', bg: 'transparent' },
  low:      { color: 'var(--text3)', bg: 'transparent' },
};

const MOMENTUM_LABEL: Record<string, { text: string; color: string }> = {
  rising:  { text: '↑ Rising', color: 'var(--emerald-l, #34d399)' },
  stable:  { text: '→ Stable', color: 'var(--text3)' },
  cooling: { text: '↓ Cooling', color: 'var(--text3)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function BriefingPage() {
  const signals = await getSignals(200).catch(() => []);
  const briefing = generateBriefing(signals);

  const periodFrom = new Date(briefing.period.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const periodTo = new Date(briefing.period.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="ph">
        <div className="ph-left">
          <h1><span className="ph-hi">Briefing</span></h1>
          <p>INTELLIGENCE BRIEFING  ·  {periodFrom} – {periodTo}</p>
        </div>
        <div className="ph-live">
          <span className="live-count-dot" aria-hidden="true" />
          <span className="live-count-label">{briefing.totalSignals} SIGNALS</span>
        </div>
      </div>

      {/* ── Executive Summary ───────────────────────────────────────── */}
      <section
        aria-label="Executive Summary"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--r)',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, var(--indigo-l, #818cf8), var(--cyan-l, #67e8f9))',
          }} />
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}>
            Executive Summary
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
          {briefing.summary}
        </p>
      </section>

      {/* ── Top Signals ─────────────────────────────────────────────── */}
      <section
        aria-label="Top Signals"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--r)',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'var(--violet-l, #a78bfa)',
          }} />
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}>
            Top Signals
          </span>
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            color: 'var(--text3)',
            marginLeft: 'auto',
          }}>
            {briefing.topSignals.length} of {briefing.totalSignals}
          </span>
        </div>

        {briefing.topSignals.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>No significant signals in this period.</p>
        ) : (
          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, padding: 0, margin: 0 }}>
            {briefing.topSignals.map((signal, idx) => {
              const catColor = CATEGORY_COLOR[signal.category] ?? 'var(--text3)';
              const tier = TIER_STYLE[signal.tier] ?? TIER_STYLE.standard;

              return (
                <li
                  key={signal.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '12px 14px',
                    borderRadius: 'var(--r)',
                    background: tier.bg,
                    border: signal.tier === 'critical' ? `1px solid ${tier.color}22` : '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Rank */}
                    <span style={{
                      fontFamily: 'var(--fm)',
                      fontSize: 9,
                      color: 'var(--text3)',
                      minWidth: 14,
                    }}>
                      {idx + 1}.
                    </span>
                    {/* Category dot */}
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: catColor, flexShrink: 0,
                    }} />
                    {/* Title + entity */}
                    <a
                      href={`/signals/${signal.id}`}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text)',
                        textDecoration: 'none',
                        lineHeight: 1.4,
                      }}
                    >
                      {signal.title}
                    </a>
                    {/* Significance */}
                    <span style={{
                      fontFamily: 'var(--fm)',
                      fontSize: 9,
                      color: tier.color,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {signal.significance} · {signal.tier.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 30 }}>
                    <a
                      href={`/entity/${encodeURIComponent(signal.entityName.toLowerCase().replace(/\s+/g, '-'))}`}
                      style={{
                        fontSize: 11,
                        color: catColor,
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {signal.entityName}
                    </a>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>
                      {signal.summary.length > 120 ? signal.summary.slice(0, 120).trimEnd() + '…' : signal.summary}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── Two-column: Entities + Categories ───────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Top Entities */}
        <section
          aria-label="Top Entities"
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--r)',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 3, height: 14, borderRadius: 2,
              background: 'var(--cyan-l, #67e8f9)',
            }} />
            <span style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text3)',
            }}>
              Top Entities
            </span>
          </div>

          {briefing.topEntities.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No entity data.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {briefing.topEntities.map((entity) => (
                <li key={entity.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a
                    href={`/entity/${encodeURIComponent(entity.name.toLowerCase().replace(/\s+/g, '-'))}`}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: 'var(--text)',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    {entity.name}
                  </a>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                    {entity.signalCount} signal{entity.signalCount !== 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {entity.categories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: CATEGORY_COLOR[cat] ?? 'var(--text3)',
                        }}
                        title={cat}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Category Breakdown */}
        <section
          aria-label="Category Breakdown"
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--r)',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 3, height: 14, borderRadius: 2,
              background: 'var(--amber-l, #fbbf24)',
            }} />
            <span style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text3)',
            }}>
              Category Breakdown
            </span>
          </div>

          {briefing.categories.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No category data.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {briefing.categories.map((cat) => {
                const color = CATEGORY_COLOR[cat.category] ?? 'var(--text3)';
                const barWidth = briefing.totalSignals > 0
                  ? Math.max(8, Math.round((cat.count / briefing.totalSignals) * 100))
                  : 0;

                return (
                  <li key={cat.category}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {cat.label}
                      </span>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                        {cat.count} · avg {cat.avgSignificance}
                      </span>
                    </div>
                    <div style={{
                      height: 3, borderRadius: 2, background: 'var(--border)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${barWidth}%`,
                        background: color,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Why This Period Matters ──────────────────────────────────── */}
      <section
        aria-label="Why This Period Matters"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--r)',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'var(--rose-l, #fb7185)',
          }} />
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}>
            Why This Period Matters
          </span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
          {briefing.whyThisPeriodMatters}
        </p>
      </section>

      {/* ── Emerging Trends ─────────────────────────────────────────── */}
      {briefing.trends.length > 0 && (
        <section
          aria-label="Emerging Trends"
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--r)',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{
              width: 3, height: 14, borderRadius: 2,
              background: 'var(--emerald-l, #34d399)',
            }} />
            <span style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text3)',
            }}>
              Emerging Trends
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {briefing.trends.map((trend, i) => {
              const mom = MOMENTUM_LABEL[trend.momentum] ?? MOMENTUM_LABEL.stable;
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--r)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                      {trend.title}
                    </span>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: mom.color }}>
                      {mom.text}
                    </span>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                      {trend.signalCount} signals
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                    {trend.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div style={{
        fontFamily: 'var(--fm)',
        fontSize: 9,
        color: 'var(--text3)',
        textAlign: 'center',
        padding: '12px 0 24px',
        letterSpacing: '0.06em',
      }}>
        Generated {new Date(briefing.generatedAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })} · Omterminal Intelligence
      </div>
    </>
  );
}
