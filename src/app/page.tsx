import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { getSiteStats, getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import RequestAccessButton from '@/components/RequestAccessButton';
import { TrendRadar } from '@/components/TrendRadar';
import { IntelligenceSnapshot } from '@/components/signals/IntelligenceSnapshot';
import { TopInsight } from '@/components/TopInsight';
import { countRecentSignals } from '@/lib/signals/signalAge';
import { clusterSignals } from '@/lib/signals/clusterSignals';
import { DailyIntelligenceHeader } from '@/components/daily/DailyIntelligenceHeader';
import { TopEntitiesSection } from '@/components/daily/TopEntitiesSection';
import { EmergingTrendsPreview } from '@/components/daily/EmergingTrendsPreview';
import { QuickActions } from '@/components/daily/QuickActions';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

/** ISR: revalidate every 30 minutes for fresher daily data */
export const revalidate = 1800;

export default async function HomePage() {
  // Compute live stats from DB — show real numbers only, never hardcoded fallbacks
  const fallbackStats = { signals: 0, companies: 0, regulations: 0, sources: 0, fundingRounds: 0, models: 0, totalFundingUsdM: 0 };
  const [live, dbSignals] = await Promise.all([
    getSiteStats().catch(() => fallbackStats),
    getSignals(20).catch(() => []),
  ]);
  const signals     = live.signals;
  const companies   = live.companies;
  const regulations = live.regulations;
  const recentCount = countRecentSignals(dbSignals, 24);

  // Top signals for the snapshot: prefer live DB data, fall back to mock in dev
  const snapshotSignals =
    dbSignals.length > 0
      ? dbSignals
      : process.env.NODE_ENV === 'production'
        ? []
        : MOCK_SIGNALS;

  // Compute trend clusters for the emerging trends section
  const clusters = clusterSignals(snapshotSignals);
  const trendCount = clusters.length;

  // Derive active entity names from recent signals
  const entityCounts = new Map<string, number>();
  for (const s of snapshotSignals) {
    if (s.entityName) {
      entityCounts.set(s.entityName, (entityCounts.get(s.entityName) ?? 0) + 1);
    }
  }
  const activeEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Minimal signal data for client components (avoid sending full signal objects)
  const signalSummary = snapshotSignals.map((s) => ({
    date: s.date,
    entityName: s.entityName,
    category: s.category,
  }));

  return (
    <>
      <PageViewTracker path="/" />
      {/* Daily Intelligence Header (client) — welcome banner + activity pulse */}
      <DailyIntelligenceHeader
        signals={signalSummary}
        trendCount={trendCount}
        activeEntities={activeEntities}
        recentCount={recentCount}
      />

      {/* Hero — streamlined for daily intelligence */}
      <div className="hero hero--daily">
        <div className="hero-eyebrow">DAILY INTELLIGENCE BRIEFING</div>
        <h1 className="hero-h1">
          What matters in AI today.
        </h1>
        <p className="hero-sub">
          {recentCount > 0
            ? `${recentCount} new signals detected in the last 24 hours across ${activeEntities.length > 0 ? activeEntities.slice(0, 3).join(', ') : 'the ecosystem'}.`
            : 'Regulation, models, funding, and policy shifts \u2014 scored by impact and structured into actionable intelligence.'}
        </p>
        <div className="hero-ctas">
          <RequestAccessButton />
          <Link href="/signals" className="cta-secondary">
            Explore Signals
          </Link>
        </div>
        <div className="hero-metrics">
          {signals > 0 && <div className="hm"><div className="hm-n">{signals}</div><div className="hm-l">Signals tracked</div></div>}
          {companies > 0 && <div className="hm"><div className="hm-n">{companies}</div><div className="hm-l">Companies tracked</div></div>}
          {regulations > 0 && <div className="hm"><div className="hm-n">{regulations}</div><div className="hm-l">Active regulations</div></div>}
          {recentCount > 0 && (
            <div className="hm hm-live">
              <div className="hm-n hm-n-live">
                <span className="live-count-dot" aria-hidden="true" />
                {recentCount}
              </div>
              <div className="hm-l">New in 24h</div>
            </div>
          )}
          {signals === 0 && companies === 0 && regulations === 0 && recentCount === 0 && (
            <div className="hm"><div className="hm-n">Live</div><div className="hm-l">Intelligence platform</div></div>
          )}
        </div>
      </div>

      {/* Quick Actions — shortcuts to top content */}
      <QuickActions signals={snapshotSignals} />

      {/* Today's Top Insight */}
      <TopInsight signals={snapshotSignals} />

      {/* Intelligence Snapshot — top 3 signals */}
      <IntelligenceSnapshot signals={snapshotSignals} />

      {/* Top Entities (24h activity) */}
      <TopEntitiesSection signals={snapshotSignals} />

      {/* Emerging Trends (clustered signals) */}
      <EmergingTrendsPreview signals={snapshotSignals} />

      {/* Trend Radar — live alerts */}
      <div style={{ marginBottom: 36 }}>
        <TrendRadar />
      </div>

      {/* Features */}
      <div className="section-eyebrow">TERMINAL CAPABILITIES</div>
      <div className="feature-grid">
        {siteConfig.features.map((feat) => (
          <div key={feat.title} className="feat-card">
            <div className="feat-icon">{feat.icon}</div>
            <div className="feat-title">{feat.title}</div>
            <div className="feat-body">{feat.body}</div>
          </div>
        ))}
      </div>
    </>
  );
}
