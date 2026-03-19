import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights — Omterminal Intelligence',
};

export const revalidate = 60;

interface Insight {
  title: string;
  summary: string;
  category?: string;
  confidence: number;
  topics?: string[];
  created_at?: string;
}

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.75) return 'conf-badge conf-badge--high';
  if (confidence >= 0.5)  return 'conf-badge conf-badge--mid';
  return 'conf-badge conf-badge--low';
}

export default async function InsightsPage() {
  let insights: Insight[] = [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/intelligence/insights`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      insights = data.insights ?? [];
    }
  } catch {
    // Render empty state if API is unavailable
  }

  return (
    <div>
      {/* Section header */}
      <div className="feed-section-header" style={{ marginBottom: 20 }}>
        <span className="feed-section-accent" style={{ background: 'var(--violet-l)' }} />
        <span className="feed-section-label">Intelligence Insights</span>
        <span className="feed-section-count">{insights.length} total</span>
      </div>

      {insights.length === 0 ? (
        <div className="feed-empty">
          <p className="feed-empty-title">No insights available</p>
          <p className="feed-empty-sub">Insights are generated as signal clusters mature.</p>
        </div>
      ) : (
        <ul className="dash-insight-grid">
          {insights.map((insight, i) => {
            const pct = Math.round(insight.confidence * 100);
            const category = insight.category?.toLowerCase();

            return (
              <li key={`${insight.title}-${i}`} className="dash-insight-card">
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <h3 className="dash-insight-title">{insight.title}</h3>
                  <span className={confidenceBadgeClass(insight.confidence)}>{pct}%</span>
                </div>

                {/* Summary */}
                <p className="dash-insight-summary">{insight.summary}</p>

                {/* Category badge */}
                {category && (
                  <span className={`badge ${category}`} style={{ alignSelf: 'flex-start' }}>
                    {category}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
