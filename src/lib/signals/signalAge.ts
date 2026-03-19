/**
 * signalAge — Lightweight utilities for signal recency detection.
 *
 * Provides human-friendly timestamp formatting and recency flags used by
 * the live signal pulse layer.  All functions are pure / no side-effects.
 */

/** Returns true if the signal was published within the last hour ("hot"). */
export function isHot(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Returns true if the signal was published within the last 72 hours. */
export function isRecent(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 3 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Human-friendly relative timestamp.
 *
 * < 1 min   → "Just now"
 * < 60 min  → "X min ago"
 * < 24 h    → "Xh ago"
 * < 48 h    → "Yesterday"
 * < 72 h    → "2 days ago"
 * else      → "Jan 5, 2025"
 */
export function formatSignalAge(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffMs = Date.now() - d.getTime();
    const diffMin = diffMs / (1000 * 60);
    const diffH   = diffMs / (1000 * 60 * 60);

    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${Math.floor(diffMin)} min ago`;
    if (diffH   < 24) return `${Math.floor(diffH)}h ago`;
    if (diffH   < 48) return 'Yesterday';
    if (diffH   < 72) return '2 days ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Count how many signals were published within the last `hours` hours.
 * Works with any object that has a `date` or `published_at` string field.
 */
export function countRecentSignals(
  signals: Array<{ date?: string | null; published_at?: string | null }>,
  hours = 24,
): number {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return signals.filter((s) => {
    const raw = s.date ?? s.published_at;
    if (!raw) return false;
    try {
      return new Date(raw).getTime() >= cutoff;
    } catch {
      return false;
    }
  }).length;
}
