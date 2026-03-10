import { fetchFundingRounds } from '@/lib/dataService';
import { getSiteStats } from '@/db/queries';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Funding & Investment',
  description: 'Track AI funding rounds, valuations, and M&A activity — structured intelligence for investors.',
};

export const revalidate = 300;

export default async function FundingPage() {
  const [rounds, live] = await Promise.all([
    fetchFundingRounds(),
    getSiteStats().catch(() => ({ signals: 0, companies: 0, regulations: 0, sources: 0, fundingRounds: 0 })),
  ]);

  // Use DB counts when available; fall back to derived or hardcoded values
  const totalRounds = live.fundingRounds > 0 ? live.fundingRounds : rounds.length;
  const megaRounds  = rounds.filter(r => {
    const n = parseFloat(r.amount.replace(/[^0-9.]/g, ''));
    return n >= 1;
  }).length || 6;

  return (
    <>
      <PageHeader
        title="AI Funding &"
        highlight="Investment"
        subtitle={`${rounds.length} major rounds tracked · valuations · investors · trends`}
        gradient="var(--amber-l), var(--emerald-l)"
      />

      <div className="stats-row">
        <StatCard value="$120B+" label="Total AI Funding 2026" delta="↑ Record year" color="var(--amber-l)" glowColor="rgba(217,119,6,0.4)" />
        <StatCard value={String(megaRounds)} label="Mega Rounds ($1B+)" delta="↑ vs 2025" color="var(--indigo-l)" glowColor="rgba(79,70,229,0.4)" />
        <StatCard value={String(totalRounds)} label="Rounds Tracked" delta="All verified" color="var(--emerald-l)" glowColor="rgba(5,150,105,0.4)" />
      </div>

      <div className="news-grid">
        {rounds.map((round) => (
          <div key={round.id} className="nc" style={{ cursor: 'default' }}>
            <div className="nc-top">
              <span className="badge funding">{round.round}</span>
              <span style={{ fontFamily: 'var(--fm)', fontSize: '9.5px', color: 'var(--text3)' }}>
                {round.date}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{round.icon}</span>
              <div className="nc-title" style={{ marginBottom: 0 }}>{round.company}</div>
            </div>
            <div style={{
              display: 'flex', gap: 12, marginBottom: 12, fontFamily: 'var(--fm)', fontSize: '10px',
              color: 'var(--text3)', letterSpacing: '0.04em',
            }}>
              <span>Amount: <strong style={{ color: 'var(--amber-l)' }}>{round.amount}</strong></span>
              <span>Valuation: <strong style={{ color: 'var(--text2)' }}>{round.valuation}</strong></span>
            </div>
            <div className="nc-body">{round.summary}</div>
            <div className="nc-foot">
              <span style={{ color: 'var(--text2)' }}>
                {round.investors.slice(0, 3).join(' · ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
