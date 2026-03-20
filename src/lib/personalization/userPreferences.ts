/**
 * Omterminal — User Preference Model
 *
 * Lightweight client-side preference store backed by localStorage.
 * No login required. Falls back to global ranking when no preferences
 * exist (first visit, private browsing, or cleared storage).
 *
 * Preference signals captured:
 *   - Clicked entity names → engagement count
 *   - Clicked / filtered categories → engagement count
 *   - Viewed signal IDs (recent 100, for future dedup / "already seen" use)
 *
 * Stored under a single localStorage key as a JSON blob.
 * Writes are synchronous and silently swallowed on any error (quota,
 * private mode, SSR context).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'om_preferences';

/** Maximum entity entries to keep (prune lowest-count entries beyond this). */
const MAX_ENTITY_ENTRIES = 50;

/** Maximum viewed signal IDs to track (ring-buffer, most recent first). */
const MAX_VIEWED_IDS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  /** Entity name → engagement count (clicks on entity label or profile). */
  entities: Record<string, number>;

  /** Signal category → engagement count (filter clicks + card views). */
  categories: Record<string, number>;

  /**
   * Signal type key → engagement count.
   * Tracks engagement with specific signal types (e.g. 'CAPITAL_ACCELERATION',
   * or falls back to category string when explicit type is unavailable).
   */
  signalTypes: Record<string, number>;

  /**
   * Ring buffer of recently viewed signal IDs (newest first, capped at
   * MAX_VIEWED_IDS).  Used for "already seen" filtering in future iterations.
   */
  viewedSignals: string[];

  /** ISO timestamp of the last preference mutation. */
  lastUpdated: string;
}

const EMPTY: UserPreferences = {
  entities: {},
  categories: {},
  signalTypes: {},
  viewedSignals: [],
  lastUpdated: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Read / Write
// ─────────────────────────────────────────────────────────────────────────────

/** Read preferences from localStorage. Returns empty prefs on any failure. */
export function readPreferences(): UserPreferences {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      entities: parsed.entities ?? {},
      categories: parsed.categories ?? {},
      signalTypes: parsed.signalTypes ?? {},
      viewedSignals: parsed.viewedSignals ?? [],
      lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Persist preferences to localStorage. Silently ignores any error. */
function writePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (private mode, quota exceeded) — no-op
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracking helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Record an entity engagement (click on entity name / quick profile). */
export function trackEntityClick(entityName: string): void {
  if (!entityName) return;
  const prefs = readPreferences();
  prefs.entities[entityName] = (prefs.entities[entityName] ?? 0) + 1;

  // Prune to MAX_ENTITY_ENTRIES, keeping the most-engaged entries
  const entries = Object.entries(prefs.entities);
  if (entries.length > MAX_ENTITY_ENTRIES) {
    entries.sort((a, b) => b[1] - a[1]);
    prefs.entities = Object.fromEntries(entries.slice(0, MAX_ENTITY_ENTRIES));
  }

  prefs.lastUpdated = new Date().toISOString();
  writePreferences(prefs);
}

/** Record a category engagement (filter tab click). */
export function trackCategoryClick(category: string): void {
  if (!category || category === 'all') return;
  const prefs = readPreferences();
  prefs.categories[category] = (prefs.categories[category] ?? 0) + 1;
  prefs.lastUpdated = new Date().toISOString();
  writePreferences(prefs);
}

/**
 * Record engagement with a signal type (e.g. signal card click/expand).
 * Pass the explicit signal type when available, otherwise the category.
 */
export function trackSignalType(signalType: string): void {
  if (!signalType) return;
  const prefs = readPreferences();
  prefs.signalTypes[signalType] = (prefs.signalTypes[signalType] ?? 0) + 1;
  prefs.lastUpdated = new Date().toISOString();
  writePreferences(prefs);
}

/**
 * Mark a signal as viewed (ring-buffer, newest first, capped at
 * MAX_VIEWED_IDS).  Skips if already in the list.
 */
export function trackSignalView(signalId: string): void {
  if (!signalId) return;
  const prefs = readPreferences();
  if (prefs.viewedSignals.includes(signalId)) return;
  prefs.viewedSignals.unshift(signalId);
  if (prefs.viewedSignals.length > MAX_VIEWED_IDS) {
    prefs.viewedSignals = prefs.viewedSignals.slice(0, MAX_VIEWED_IDS);
  }
  prefs.lastUpdated = new Date().toISOString();
  writePreferences(prefs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has accumulated any meaningful preference data.
 * Used as a guard before applying personalization (fallback to global ranking
 * on first visit or cleared storage).
 */
export function hasPreferences(prefs: UserPreferences): boolean {
  return (
    Object.keys(prefs.entities).length > 0 ||
    Object.keys(prefs.categories).length > 0 ||
    Object.keys(prefs.signalTypes).length > 0
  );
}
