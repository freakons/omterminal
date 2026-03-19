import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signals — Omterminal Intelligence',
};

export const revalidate = 60;

interface Signal {
  id: string;
  title: string;
  source?: string | null;
  category?: string | null;
  signal_type?: string | null;
  published_at?: string | null;
  created_at?: string;
  date?: string | null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default async function SignalsPage() {
  let signals: Signal[] = [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/intelligence/signals`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      signals = (data.signals ?? []).slice(0, 50);
    }
  } catch {
    // Render empty state if API is unavailable
  }

  return (
    <div>
      {/* Section header */}
      <div className="feed-section-header" style={{ marginBottom: 20 }}>
        <span className="feed-section-accent feed-section-accent--top" />
        <span className="feed-section-label">Latest Signals</span>
        <span className="feed-section-count">{signals.length} total</span>
      </div>

      {signals.length === 0 ? (
        <div className="feed-empty">
          <p className="feed-empty-title">No signals available</p>
          <p className="feed-empty-sub">Check back soon — signals update every hour.</p>
        </div>
      ) : (
        <ul className="dash-list">
          {signals.map((signal) => {
            const category = (signal.category ?? signal.signal_type ?? 'unknown').toLowerCase();
            const date = formatDate(signal.published_at ?? signal.date ?? signal.created_at);

            return (
              <li key={signal.id} className="dash-row">
                <div>
                  <p className="dash-row-title">{signal.title}</p>
                  <div className="dash-row-meta">
                    <span className={`badge ${category}`}>{category}</span>
                    {signal.source && (
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--fm)' }}>
                        {signal.source}
                      </span>
                    )}
                  </div>
                </div>
                <span className="dash-row-date">{date}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
