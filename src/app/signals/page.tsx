import type { Metadata } from 'next';
import { getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import { SignalsBrowser } from './SignalsBrowser';

export const metadata: Metadata = {
  title: 'Signals',
  description: 'Intelligence signals detected across the AI ecosystem — model releases, funding events, regulatory shifts, and research breakthroughs.',
};

/** ISR: revalidate every 5 minutes */
export const revalidate = 300;

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

  return (
    <>
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
