import type { Metadata } from 'next';
import { getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import { SignalsBrowser } from './SignalsBrowser';
import { buildDatasetSchema } from '@/lib/seo/jsonld';
import { IntelligenceSnapshot } from '@/components/signals/IntelligenceSnapshot';

export const metadata: Metadata = {
  title: 'AI Signals — Latest Models, Funding & Regulation',
  description: 'Real-time AI intelligence signals — model releases, funding rounds, regulatory shifts, and research breakthroughs. Scored by impact, corroborated by multiple sources.',
  keywords: [
    'AI signals',
    'AI intelligence',
    'AI funding rounds',
    'AI model releases',
    'AI regulation updates',
    'machine learning news',
    'artificial intelligence signals',
    'AI ecosystem monitoring',
    'Omterminal',
  ],
};

/**
 * Force dynamic rendering so every request reads fresh signals from the DB.
 *
 * Why: /signals is fed by hourly cron jobs. With ISR (revalidate=300) the
 * Vercel edge cache could serve a stale snapshot for up to 5 minutes — and if
 * a background re-render silently fails it can stay stale indefinitely.
 * force-dynamic bypasses page-level ISR entirely so the SSR HTML always
 * reflects the live DB state. The client-side refresh in SignalsBrowser
 * (cache: 'no-store') handles subsequent in-session updates independently.
 */
export const dynamic = 'force-dynamic';

export default async function SignalsPage() {
  // Pre-fetch signals server-side; pass as initial prop to the client component.
  // Falls back to mock in development when DB is empty, and to [] in production.
  const dbSignals = await getSignals(200).catch(() => []);
  const initialSignals =
    dbSignals.length > 0
      ? dbSignals
      : process.env.NODE_ENV === 'production'
        ? []
        : MOCK_SIGNALS;

  const jsonLd = buildDatasetSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="ph">
        <div className="ph-left">
          <h1>Signals</h1>
          <p>INTELLIGENCE SIGNALS  ·  AI ECOSYSTEM  ·  REAL-TIME DETECTION</p>
        </div>
      </div>

      {/* AI search-optimized introduction — server-rendered, fact-dense, structured for LLM parsing */}
      <section
        aria-label="About AI Signals"
        style={{
          padding: '16px 24px',
          borderRadius: 'var(--r)',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <h2 style={{
          fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10,
        }}>
          What Are AI Signals?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 10 }}>
          AI signals are structured intelligence events detected across the global AI ecosystem — including
          model releases, funding rounds, regulatory changes, research breakthroughs, and strategic partnerships.
          Each signal is scored by <strong style={{ color: 'var(--text)' }}>significance</strong> and{' '}
          <strong style={{ color: 'var(--text)' }}>confidence</strong>, corroborated by multiple sources,
          and linked to the entities involved.
        </p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
            Categories:{' '}
            <a href="/models" style={{ color: 'var(--indigo-l)', textDecoration: 'none' }}>Models</a>
            {' · '}
            <a href="/funding" style={{ color: 'var(--amber-l)', textDecoration: 'none' }}>Funding</a>
            {' · '}
            <a href="/regulation" style={{ color: 'var(--rose-l)', textDecoration: 'none' }}>Regulation</a>
            {' · '}
            <span style={{ color: 'var(--text3)' }}>Research · Agents · Product</span>
          </span>
        </div>
      </section>

      <IntelligenceSnapshot signals={initialSignals} />

      <SignalsBrowser initialSignals={initialSignals} />
    </>
  );
}
