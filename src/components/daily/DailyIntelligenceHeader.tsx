'use client';

/**
 * DailyIntelligenceHeader — Client wrapper for the daily welcome banner.
 *
 * Receives serialized signal data from the server component and passes
 * it to WelcomeBanner along with computed trend/entity counts.
 */

import { WelcomeBanner } from './WelcomeBanner';

interface SignalData {
  date?: string | null;
  entityName?: string;
  category?: string;
}

interface DailyIntelligenceHeaderProps {
  signals: SignalData[];
  trendCount: number;
  activeEntities: string[];
  recentCount: number;
}

export function DailyIntelligenceHeader({
  signals,
  trendCount,
  activeEntities,
  recentCount,
}: DailyIntelligenceHeaderProps) {
  return (
    <>
      <WelcomeBanner
        signals={signals}
        trendCount={trendCount}
        activeEntities={activeEntities}
      />
      {recentCount > 0 && (
        <div className="daily-pulse">
          <span className="daily-pulse-dot" />
          <span className="daily-pulse-text">
            {recentCount} signal{recentCount !== 1 ? 's' : ''} in the last 24 hours
          </span>
        </div>
      )}
    </>
  );
}
