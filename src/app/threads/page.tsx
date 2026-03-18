import type { Metadata } from 'next';
import { getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import type { Signal } from '@/data/mockSignals';
import {
  generateTwitterThread,
  generateLinkedInPost,
  selectTopSignals,
} from '@/services/reports/threadGenerator';
import { ThreadPreview } from './ThreadPreview';

export const metadata: Metadata = {
  title: 'Daily AI Intelligence Threads — Omterminal',
  description:
    'Auto-generated Twitter threads and LinkedIn posts from today\'s top AI signals. Analytical tone, scored by impact.',
};

export const dynamic = 'force-dynamic';

export default async function ThreadsPage() {
  const dbSignals = await getSignals(200).catch(() => []);
  const signals: Signal[] =
    dbSignals.length > 0
      ? (dbSignals as unknown as Signal[])
      : MOCK_SIGNALS;

  const date = new Date().toISOString().slice(0, 10);
  const top = selectTopSignals(signals);
  const twitter = generateTwitterThread(top, date);
  const linkedin = generateLinkedInPost(top, date);

  return (
    <div className="threads-page">
      <header className="threads-header">
        <h1 className="threads-title">Daily Intelligence Threads</h1>
        <p className="threads-subtitle">
          Auto-generated from today&apos;s top {top.length} signals &middot; {date}
        </p>
      </header>

      <div className="threads-grid">
        <ThreadPreview
          platform="twitter"
          label="Twitter / X Thread"
          items={twitter.tweets}
          stats={{
            tweets: twitter.tweets.length,
            signals: twitter.signalCount,
            chars: twitter.totalChars,
          }}
        />
        <ThreadPreview
          platform="linkedin"
          label="LinkedIn Post"
          items={[linkedin.body]}
          stats={{
            signals: linkedin.signalCount,
            chars: linkedin.charCount,
          }}
        />
      </div>
    </div>
  );
}
