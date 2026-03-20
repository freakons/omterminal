/**
 * Omterminal — Personalization Boost
 *
 * Applies a lightweight, preference-based boost on top of the globally-ranked
 * feed produced by feedComposer.  Global importance (significance, freshness,
 * cluster strength) remains dominant.  Personalization adds at most +10 rank
 * score points — enough to surface preferred signals without distorting the
 * global intelligence picture.
 *
 * Boost breakdown (max 10 pts total):
 *   Entity match    — up to +5 pts  (log-scaled by engagement depth)
 *   Category match  — up to +3 pts  (log-scaled by engagement depth)
 *   Signal type     — up to +2 pts  (log-scaled by engagement depth)
 *
 * Falls back to global order (no re-ranking) when hasPreferences() is false.
 *
 * Design principles:
 *   • Pure function — no I/O, no side effects.
 *   • Bounded boost — rank score is always clamped to [0, 100].
 *   • Transparent — adds `_personalizationBoost` to each signal for debugging.
 *   • No ML — simple log-scaled engagement counts.
 */

import type { SignalWithRankMeta } from '@/lib/signals/feedComposer';
import { type UserPreferences, hasPreferences } from './userPreferences';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum total personalization boost added to rank score. */
export const MAX_PERSONALIZATION_BOOST = 10;

const ENTITY_MAX   = 5; // pts
const CATEGORY_MAX = 3; // pts
const TYPE_MAX     = 2; // pts

// ─────────────────────────────────────────────────────────────────────────────
// Extended signal type with personalization metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface SignalWithPersonalization extends SignalWithRankMeta {
  /** Personalization boost applied to this signal (0 if no preferences). */
  _personalizationBoost?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log-scale an engagement count to a [0, 1] preference strength.
 *
 *   count 0  → 0.00  (no preference)
 *   count 1  → 0.50
 *   count 3  → 0.77
 *   count 10 → 1.00  (saturates; further clicks don't increase boost)
 */
function engagementStrength(count: number): number {
  if (count <= 0) return 0;
  // Saturates at count = 10 (log2(11) ≈ 3.46)
  return Math.min(1, Math.log2(count + 1) / Math.log2(11));
}

// ─────────────────────────────────────────────────────────────────────────────
// Core functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the personalization boost for a single signal given stored prefs.
 * Returns 0 when there are no preferences (first visit / empty storage).
 *
 * @param signal  A feed-composed signal with rank metadata.
 * @param prefs   User preferences read from localStorage.
 * @returns       Boost in [0, MAX_PERSONALIZATION_BOOST].
 */
export function computePersonalizationBoost(
  signal: SignalWithRankMeta,
  prefs: UserPreferences,
): number {
  if (!hasPreferences(prefs)) return 0;

  // Entity match — strongest signal (explicit interest in a company/lab)
  const entityCount = signal.entityName
    ? (prefs.entities[signal.entityName] ?? 0)
    : 0;
  const entityBoost = engagementStrength(entityCount) * ENTITY_MAX;

  // Category match — mid-weight (broad topic interest)
  const categoryCount = prefs.categories[signal.category] ?? 0;
  const categoryBoost = engagementStrength(categoryCount) * CATEGORY_MAX;

  // Signal type match — lightest weight (pattern-of-interest)
  // Uses the explicit signal type field when available; falls back to category.
  const signalTypeKey = (signal as SignalWithRankMeta & { type?: string }).type
    ?? signal.category;
  const typeCount = prefs.signalTypes[signalTypeKey] ?? 0;
  const typeBoost = engagementStrength(typeCount) * TYPE_MAX;

  const total = entityBoost + categoryBoost + typeBoost;
  return Math.min(MAX_PERSONALIZATION_BOOST, Math.round(total * 10) / 10);
}

/**
 * Re-rank a composed feed by adding personalization boosts.
 *
 * Pipeline:
 *   1. Compute per-signal boost from stored preferences.
 *   2. Add boost to existing `_rankScore`.
 *   3. Re-sort by boosted score (most-recent tie-break).
 *   4. Attach `_personalizationBoost` for transparency.
 *
 * Falls back to original order when no preferences are stored.
 *
 * @param signals  Feed-composed signals already globally ranked.
 * @param prefs    User preferences from localStorage.
 * @returns        Signals with personalization applied, still bounded 0–100.
 */
export function personalizeSignals(
  signals: SignalWithRankMeta[],
  prefs: UserPreferences,
): SignalWithPersonalization[] {
  if (!hasPreferences(prefs) || signals.length === 0) {
    // No preferences yet — return as-is with zero boost annotated
    return signals.map((s) => ({ ...s, _personalizationBoost: 0 }));
  }

  const boosted = signals.map((signal): SignalWithPersonalization => {
    const boost = computePersonalizationBoost(signal, prefs);
    if (boost === 0) return { ...signal, _personalizationBoost: 0 };

    const baseScore = signal._rankScore ?? 0;
    const boostedScore = Math.min(100, Math.round((baseScore + boost) * 10) / 10);
    return {
      ...signal,
      _rankScore: boostedScore,
      _personalizationBoost: boost,
    };
  });

  // Re-sort by boosted rank score (descending); tie-break by recency
  boosted.sort((a, b) => {
    const aScore = a._rankScore ?? 0;
    const bScore = b._rankScore ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return boosted;
}
