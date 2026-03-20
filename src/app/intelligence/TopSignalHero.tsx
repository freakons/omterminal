import Link from 'next/link';
import type { SignalWithRankMeta } from '@/lib/signals/feedComposer';
import { formatSignalAge } from '@/lib/signals/signalAge';

function getScoreLabel(score: number): string {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Strong';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

function getScoreNumClass(score: number): string {
  if (score >= 65) return 'intel-signal-hero-score-num intel-signal-hero-score-num--high';
  if (score >= 35) return 'intel-signal-hero-score-num intel-signal-hero-score-num--mid';
  return 'intel-signal-hero-score-num intel-signal-hero-score-num--low';
}

interface TopSignalHeroProps {
  signal: SignalWithRankMeta;
}

/**
 * TopSignalHero — Highlights the highest-ranked intelligence signal at the
 * top of the /intelligence page with title, why_this_matters, score, entity,
 * category, recency, and corroboration hint.
 */
export function TopSignalHero({ signal }: TopSignalHeroProps) {
  const score = Math.round(signal._rankScore ?? signal.significanceScore ?? signal.confidence ?? 0);
  const label = getScoreLabel(score);
  const whyItMatters = signal.whyThisMatters ?? signal.context?.whyItMatters;
  const href = `/signals/${encodeURIComponent(signal.id)}`;
  const cat = signal.category ?? 'signal';
  const sourceCount = signal._sourceCount ?? signal.sourceSupportCount;

  return (
    <div className="intel-signal-hero">
      <div className="intel-signal-hero-header">
        <span className="intel-signal-hero-eyebrow">Top Intelligence Signal</span>
        <div className="intel-signal-hero-score">
          <span className={getScoreNumClass(score)}>{score}</span>
          <span className="intel-signal-hero-score-label">{label}</span>
        </div>
      </div>

      <div className="intel-signal-hero-cat-row">
        <span className="eco-cat" data-cat={cat}>{cat}</span>
        {signal.entityName && (
          <span className="intel-signal-hero-entity">{signal.entityName}</span>
        )}
      </div>

      <Link href={href} className="intel-signal-hero-title-link">
        <h2 className="intel-signal-hero-title">{signal.title}</h2>
      </Link>

      {whyItMatters && (
        <div className="nc-why intel-signal-hero-why">
          <span className="nc-why-label">Why this matters</span>
          {whyItMatters}
        </div>
      )}

      <div className="intel-signal-hero-foot">
        <span className="intel-signal-hero-date">{formatSignalAge(signal.date)}</span>
        {sourceCount != null && sourceCount > 1 && (
          <span className="corroboration-badge">
            <span className="indicator-dot indicator-dot--emerald" />
            {sourceCount} sources
          </span>
        )}
      </div>
    </div>
  );
}
