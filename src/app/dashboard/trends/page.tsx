import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trends — Omterminal Intelligence',
};

export const revalidate = 60;

interface Trend {
  topic: string;
  category: string;
  signal_count: number;
  confidence: number;
  entities?: string[];
  summary?: string;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return 'var(--emerald-l)';
  if (confidence >= 0.5)  return 'var(--amber-l)';
  return 'var(--rose-l)';
}

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.75) return 'conf-badge conf-badge--high';
  if (confidence >= 0.5)  return 'conf-badge conf-badge--mid';
  return 'conf-badge conf-badge--low';
}

export default async function TrendsPage() {
  let trends: Trend[] = [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/intelligence/trends`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      trends = (data.trends ?? []).sort(
        (a: Trend, b: Trend) => b.confidence - a.confidence
      );
    }
  } catch {
    // Render empty state if API is unavailable
  }

  return (
    <div>
      {/* Section header */}
      <div className="feed-section-header" style={{ marginBottom: 20 }}>
        <span className="feed-section-accent feed-section-accent--emerging" />
        <span className="feed-section-label">Emerging Trends</span>
        <span className="feed-section-count">{trends.length} clusters</span>
      </div>

      {trends.length === 0 ? (
        <div className="feed-empty">
          <p className="feed-empty-title">No trends available</p>
          <p className="feed-empty-sub">Trend clusters form as signals accumulate — check back soon.</p>
        </div>
      ) : (
        <ul className="dash-list">
          {trends.map((trend, i) => {
            const pct = Math.round(trend.confidence * 100);
            const barColor = confidenceColor(trend.confidence);
            const category = trend.category?.toLowerCase() ?? 'unknown';

            return (
              <li
                key={`${trend.topic}-${i}`}
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '16px 20px',
                  transition: 'background var(--t), border-color var(--t)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p className="dash-row-title" style={{ marginBottom: 8 }}>{trend.topic}</p>
                    <div className="dash-row-meta">
                      <span className={`badge ${category}`}>{category}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--fm)' }}>
                        {trend.signal_count} signal{trend.signal_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {trend.summary && (
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '10px 0 0' }}>
                        {trend.summary}
                      </p>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={confidenceBadgeClass(trend.confidence)}>{pct}%</span>
                    <p className="conf-label" style={{ textAlign: 'right', marginTop: 4 }}>confidence</p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
