import type { Metadata } from 'next';
import { getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import { SignalsBrowser } from './SignalsBrowser';
import { buildDatasetSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = {
  title: 'AI Signals — Latest Models, Funding & Regulation',
  description: 'Real-time AI intelligence signals — model releases, funding rounds, regulatory shifts, and research breakthroughs. Scored by impact, corroborated by multiple sources.',
  keywords: ['AI signals', 'AI intelligence', 'AI funding', 'AI models', 'AI regulation', 'machine learning news'],
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
      <SignalsBrowser initialSignals={initialSignals} />
    </>
  );
}
