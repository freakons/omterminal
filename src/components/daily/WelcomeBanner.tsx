'use client';

/**
 * WelcomeBanner — "Return reason" banner shown at the top of the homepage.
 *
 * Displays contextual messaging based on user's last visit:
 *   - "X new signals since your last visit"
 *   - "2 emerging trends detected"
 *   - "New activity in OpenAI, Anthropic"
 *
 * Client-side only — uses localStorage for visit tracking.
 */

import { useDailyActivity, countNewSince } from '@/hooks/useDailyActivity';

interface WelcomeBannerProps {
  /** All signals currently loaded (from server) */
  signals: Array<{ date?: string | null; entityName?: string; category?: string }>;
  /** Number of trend clusters currently active */
  trendCount: number;
  /** Names of top active entities */
  activeEntities: string[];
}

export function WelcomeBanner({ signals, trendCount, activeEntities }: WelcomeBannerProps) {
  const { lastVisit, lastVisitLabel, isFirstVisitToday } = useDailyActivity();

  const newCount = countNewSince(signals, lastVisit);

  // Build message fragments
  const parts: string[] = [];

  if (newCount > 0) {
    parts.push(`${newCount} new signal${newCount !== 1 ? 's' : ''} since ${lastVisit ? `your last visit (${lastVisitLabel})` : 'launch'}`);
  }

  if (trendCount > 0) {
    parts.push(`${trendCount} emerging trend${trendCount !== 1 ? 's' : ''} detected`);
  }

  if (activeEntities.length > 0) {
    const names = activeEntities.length <= 3
      ? activeEntities.join(', ')
      : `${activeEntities.slice(0, 3).join(', ')} +${activeEntities.length - 3} more`;
    parts.push(`New activity in ${names}`);
  }

  // Nothing to show
  if (parts.length === 0 && !isFirstVisitToday) return null;

  return (
    <div className="welcome-banner">
      <div className="welcome-banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <div className="welcome-banner-content">
        {isFirstVisitToday && (
          <span className="welcome-banner-greeting">
            Good {getTimeOfDay()}.
          </span>
        )}
        {parts.length > 0 && (
          <span className="welcome-banner-updates">
            {parts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="welcome-banner-sep"> · </span>}
                {part}
              </span>
            ))}
          </span>
        )}
        {parts.length === 0 && isFirstVisitToday && (
          <span className="welcome-banner-updates">
            Here&apos;s your daily intelligence briefing.
          </span>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
