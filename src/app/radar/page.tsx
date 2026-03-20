import { getSignals } from '@/db/queries';
import { composeFeed } from '@/lib/signals/feedComposer';
import { RadarStream } from './RadarStream';
import type { RadarSignal } from './RadarStream';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signal Radar',
  description:
    'Live stream of incoming AI intelligence signals — ranked by impact and freshness. Watch the feed update in real time.',
};

/**
 * Revalidate every 30 seconds so SSR initial payload stays fresh.
 * The client-side RadarStream then polls every 45 s for ongoing updates.
 */
export const revalidate = 30;

export default async function RadarPage() {
  const rawSignals = await getSignals(30, 'standard').catch(() => []);

  // Compose (diversity + dedup + ranking) then sort newest-first
  const composed = composeFeed(rawSignals, { minSignificance: 20 });
  const sorted: RadarSignal[] = [...composed].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <>
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="feed-header">
        <div className="feed-header-left">
          <h1 className="feed-title">Signal Radar</h1>
          <p className="feed-subtitle">
            Live AI intelligence stream — newest signals first, auto-refreshing every 45s
          </p>
        </div>
        <div className="feed-live-indicator">
          <span className="feed-live-dot" />
          <span className="feed-live-text">Live</span>
        </div>
      </div>

      {/* ── Radar stream (client component handles live polling) ── */}
      <RadarStream initialSignals={sorted} />
    </>
  );
}
