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

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="threads-page">
      <header className="threads-header">
        <div style={{
          fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8,
        }}>
          Daily Intelligence
        </div>
        <h1 className="threads-title">Intelligence Threads</h1>
        <p className="threads-subtitle">
          {formattedDate} &middot; {top.length} signals selected
        </p>
        <p style={{
          fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)',
          lineHeight: 1.6, maxWidth: 520, marginTop: 10,
        }}>
          Auto-generated from today&apos;s highest-impact signals. Copy to publish directly
          to Twitter/X or LinkedIn — editorial tone, analytical framing, ready to post.
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
