/**
 * EmergingTrendsPreview — Compact trend clusters on the homepage.
 *
 * Uses the existing `clusterSignals` function to group recent signals
 * into emerging trends, then renders the top 3 clusters as cards.
 *
 * Server component — no client JS.
 */

import Link from 'next/link';
import type { Signal, SignalCategory } from '@/data/mockSignals';
import { clusterSignals } from '@/lib/signals/clusterSignals';

const MOMENTUM_LABEL: Record<string, string> = {
  rising: 'Rising',
  stable: 'Stable',
  cooling: 'Cooling',
};

const MOMENTUM_COLOR: Record<string, string> = {
  rising: '#34d399',
  stable: '#8888a8',
  cooling: '#fb7185',
};

const CATEGORY_COLOR: Record<SignalCategory, string> = {
  models:     '#a78bfa',
  funding:    '#fbbf24',
  regulation: '#fb7185',
  research:   '#38bdf8',
  agents:     '#67e8f9',
  product:    '#34d399',
};

interface EmergingTrendsPreviewProps {
  signals: Signal[];
}

export function EmergingTrendsPreview({ signals }: EmergingTrendsPreviewProps) {
  const clusters = clusterSignals(signals).slice(0, 3);
  if (clusters.length === 0) return null;

  return (
    <section className="daily-section" aria-label="Emerging Trends">
      <div className="daily-section-header">
        <span className="daily-section-label">Emerging Trends</span>
        <Link href="/intelligence" className="daily-section-link">View all</Link>
      </div>
      <div className="trends-preview-grid">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="trend-preview-card">
            <div className="trend-preview-top">
              <span
                className="trend-preview-cat-dot"
                style={{ background: CATEGORY_COLOR[cluster.category] }}
              />
              <span className="trend-preview-title">{cluster.title}</span>
              <span
                className="trend-preview-momentum"
                style={{ color: MOMENTUM_COLOR[cluster.momentum] }}
              >
                {MOMENTUM_LABEL[cluster.momentum]}
              </span>
            </div>
            <div className="trend-preview-summary">
              {truncate(cluster.summary, 120)}
            </div>
            <div className="trend-preview-meta">
              <span>{cluster.signalCount} signals</span>
              <span className="trend-preview-entities">
                {cluster.entities.slice(0, 3).join(', ')}
                {cluster.entities.length > 3 && ` +${cluster.entities.length - 3}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}
