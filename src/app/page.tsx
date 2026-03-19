import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { getSiteStats, getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import RequestAccessButton from '@/components/RequestAccessButton';
import { TrendRadar } from '@/components/TrendRadar';
import { IntelligenceSnapshot } from '@/components/signals/IntelligenceSnapshot';
import { TopInsight } from '@/components/TopInsight';
import { countRecentSignals } from '@/lib/signals/signalAge';

/** ISR: revalidate every hour */
export const revalidate = 3600;

export default async function HomePage() {
  // Compute live stats from DB — show real numbers only, never hardcoded fallbacks
  const fallbackStats = { signals: 0, companies: 0, regulations: 0, sources: 0, fundingRounds: 0, models: 0, totalFundingUsdM: 0 };
  const [live, dbSignals] = await Promise.all([
    getSiteStats().catch(() => fallbackStats),
    getSignals(10).catch(() => []),
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

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">AI INTELLIGENCE TERMINAL</div>
        <h1 className="hero-h1">
          Every signal that moves AI.<br />
          <em>One terminal.</em>
        </h1>
        <p className="hero-sub">
          Regulation, models, funding, and policy shifts — scored by impact
          and structured into actionable intelligence for decision-makers.
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

      {/* Today's Top Insight */}
      <TopInsight signals={snapshotSignals} />

      {/* Intelligence Snapshot */}
      <IntelligenceSnapshot signals={snapshotSignals} />

      {/* Trend Radar */}
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
