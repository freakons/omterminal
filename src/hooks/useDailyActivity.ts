'use client';

/**
 * useDailyActivity — Client-side hook for tracking user visit activity.
 *
 * Stores last visit timestamp in localStorage to compute:
 *   - Time since last visit
 *   - Number of new signals since last visit
 *   - Whether this is the first visit today
 *
 * No backend or auth required — purely client-side.
 */

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'om:last-visit';

export interface DailyActivity {
  /** ISO string of the last visit, or null if first ever visit */
  lastVisit: string | null;
  /** Milliseconds since last visit */
  msSinceLastVisit: number | null;
  /** Whether the user hasn't visited today yet */
  isFirstVisitToday: boolean;
  /** Human-friendly label: "2 hours ago", "yesterday", etc. */
  lastVisitLabel: string;
  /** Mark current time as last visit (called on mount automatically) */
  markVisited: () => void;
}

function formatTimeSince(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${days} days ago`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function useDailyActivity(): DailyActivity {
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLastVisit(stored);
    }
    setLoaded(true);

    // Update last visit after reading old value
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  const markVisited = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setLastVisit(now);
  }, []);

  const now = new Date();
  const lastDate = lastVisit ? new Date(lastVisit) : null;
  const msSinceLastVisit = lastDate ? now.getTime() - lastDate.getTime() : null;
  const isFirstVisitToday = !lastDate || !isSameDay(lastDate, now);

  const lastVisitLabel = !loaded
    ? ''
    : msSinceLastVisit != null
      ? formatTimeSince(msSinceLastVisit)
      : 'first visit';

  return {
    lastVisit,
    msSinceLastVisit,
    isFirstVisitToday,
    lastVisitLabel,
    markVisited,
  };
}

/**
 * Count how many signals are "new" since a given timestamp.
 * Works with the Signal type that has a `date` field.
 */
export function countNewSince(
  signals: Array<{ date?: string | null; published_at?: string | null }>,
  since: string | null,
): number {
  if (!since) return signals.length; // first visit — all are new
  const cutoff = new Date(since).getTime();
  return signals.filter((s) => {
    const raw = s.date ?? s.published_at;
    if (!raw) return false;
    try {
      return new Date(raw).getTime() > cutoff;
    } catch {
      return false;
    }
  }).length;
}
