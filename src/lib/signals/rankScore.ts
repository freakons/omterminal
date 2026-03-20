/**
 * Omterminal — Unified Rank Score
 *
 * Pure, deterministic scoring function that produces a single rank score
 * (0–100) for ordering signals across all endpoints.  Combines the
 * persisted significance score with freshness decay, cluster strength,
 * and optional tracked-entity priority into a final ordering value.
 *
 * Design principles:
 *   • Deterministic — same inputs always produce the same output.
 *   • Bounded — final score is always 0–100.
 *   • Explainable — returns a component breakdown alongside the score.
 *   • No double-counting — significance already incorporates confidence,
 *     source diversity, source trust, velocity, type weight, and entity
 *     spread.  Rank score adds only freshness decay, cluster corroboration
 *     strength, and entity prominence as new, orthogonal factors.
 *   • No external I/O — pure function safe to call anywhere.
 *
 * Formula:
 *   rankScore = significance × W_sig
 *             + freshness    × W_fresh
 *             + clusterStrength × W_cluster
 *             + novelty      × W_novelty
 *             + entityBoost  × W_entity
 *
 * Where:
 *   significance     — persisted 0–100 from signalSignificance.ts (write-time composite)
 *   freshness        — exponential decay based on age: 100 × e^(-λ × ageHours)
 *   clusterStrength  — log2-scaled corroboration score based on sourceSupportCount (0–100)
 *   novelty          — uniqueness vs. recent signals (0–100, default 80)
 *   entityBoost      — 100 if the signal mentions a tracked/priority entity, else 0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RankScoreInput {
  /** Persisted significance score (0–100). Null/undefined → use fallback. */
  significanceScore: number | null | undefined;

  /** Persisted confidence score (0–100 integer or 0–1 float). Used as
   *  fallback when significanceScore is null (legacy rows). */
  confidenceScore: number | null | undefined;

  /** Signal creation timestamp (ISO 8601 or epoch ms). */
  createdAt: string | number;

  /**
   * Number of distinct sources corroborating this signal.
   * Used to compute cluster strength: more sources → higher boost.
   * Null/undefined → treated as single-source (default strength ~33).
   */
  sourceSupportCount?: number | null;

  /** Whether this signal mentions a tracked/priority entity. */
  isTrackedEntity?: boolean;

  /**
   * Novelty score (0–100) indicating how unique this signal is relative
   * to recent signals.  100 = fully novel, 0 = near-duplicate of existing.
   * When absent, no novelty adjustment is applied.
   */
  noveltyScore?: number | null;

  /** Optional: override "now" for deterministic testing. */
  now?: Date;
}

export interface RankScoreBreakdown {
  /** Raw significance component before weighting (0–100). */
  significance: number;
  /** Freshness component before weighting (0–100). */
  freshness: number;
  /** Cluster strength component before weighting (0–100). */
  clusterStrength: number;
  /** Entity boost component before weighting (0 or 100). */
  entityBoost: number;
  /** Novelty component before weighting (0–100). */
  novelty: number;
  /** Whether significance was derived from a fallback. */
  significanceFallback: boolean;
}

export interface RankScoreResult {
  /** Final rank score clamped to [0, 100]. */
  rankScore: number;
  /** Per-component breakdown for debugging. */
  breakdown: RankScoreBreakdown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Weights (must sum to 1.0)
// ─────────────────────────────────────────────────────────────────────────────

export const RANK_WEIGHTS = {
  /** Significance carries most of the ranking weight. */
  significance: 0.50,
  /** Freshness rewards recency without overwhelming quality. */
  freshness: 0.20,
  /**
   * Cluster strength rewards multi-source corroboration.
   * Signals backed by 3+ distinct sources rank measurably higher than
   * single-source signals of identical significance.
   */
  clusterStrength: 0.15,
  /** Novelty rewards unique signals and penalizes repetitive ones. */
  novelty: 0.10,
  /** Entity boost gives a small lift to tracked-entity signals. */
  entityBoost: 0.05,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Freshness decay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Half-life in hours: a signal loses half its freshness value after this many
 * hours.  48 hours = 2 days means a 2-day-old signal still has 50% freshness,
 * a 4-day-old has 25%, etc.
 *
 * This balances rewarding timeliness without completely burying important
 * older signals (which still rank via their significance component).
 */
export const FRESHNESS_HALF_LIFE_HOURS = 48;

/** Decay constant λ = ln(2) / halfLife. */
const DECAY_LAMBDA = Math.LN2 / FRESHNESS_HALF_LIFE_HOURS;

/**
 * Compute freshness as an exponential decay from 100 (just created) → ~0.
 *
 * Formula: freshness = 100 × e^(-λ × ageHours)
 *
 * @param ageHours  Age of the signal in hours (non-negative).
 * @returns         Freshness score in [0, 100].
 */
export function computeFreshness(ageHours: number): number {
  if (ageHours <= 0) return 100;
  return Math.round(100 * Math.exp(-DECAY_LAMBDA * ageHours));
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster strength
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute cluster strength from source support count using a log2 scale.
 *
 * Rationale: each additional corroborating source adds meaningful weight, but
 * with diminishing returns beyond ~5 sources.  A single source gets ~33/100;
 * three sources get ~66/100; eight sources saturate at 100.
 *
 * Scale (approximate):
 *   0 sources (unknown) → 33  (single-source assumption)
 *   1 source            → 33
 *   2 sources           → 53
 *   3 sources           → 66
 *   4 sources           → 77
 *   5 sources           → 86
 *   8 sources           → 100
 *
 * @param sourceSupportCount  Number of distinct corroborating sources (≥ 0).
 * @returns                   Cluster strength score in [0, 100].
 */
export function computeClusterStrength(sourceSupportCount: number | null | undefined): number {
  const count = sourceSupportCount != null && sourceSupportCount >= 0 ? sourceSupportCount : 1;
  return Math.min(100, Math.round(Math.log2(count + 1) * 33.2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a unified rank score for a signal.
 *
 * @param input  Rank score input with significance, timestamps, and entity flag.
 * @returns      { rankScore, breakdown } — score clamped to [0, 100] with
 *               per-component diagnostics.
 */
export function computeRankScore(input: RankScoreInput): RankScoreResult {
  const now = input.now ?? new Date();

  // ── Significance (0–100) ─────────────────────────────────────────────────
  let significance: number;
  let significanceFallback = false;

  if (input.significanceScore != null && input.significanceScore >= 0) {
    significance = Math.min(input.significanceScore, 100);
  } else if (input.confidenceScore != null) {
    // Legacy fallback: if confidence is 0–1, scale to 0–100; if already 0–100, use as-is.
    const raw = input.confidenceScore <= 1
      ? input.confidenceScore * 100
      : input.confidenceScore;
    significance = Math.min(Math.max(raw, 0), 100);
    significanceFallback = true;
  } else {
    significance = 40; // neutral default for rows with no scoring
    significanceFallback = true;
  }

  // ── Freshness (0–100) ───────────────────────────────────────────────────
  const createdDate = typeof input.createdAt === 'string'
    ? new Date(input.createdAt)
    : new Date(input.createdAt);
  const ageMs = now.getTime() - createdDate.getTime();
  const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0);
  const freshness = computeFreshness(ageHours);

  // ── Cluster strength (0–100) ─────────────────────────────────────────────
  const clusterStrength = computeClusterStrength(input.sourceSupportCount);

  // ── Entity boost (0 or 100) ──────────────────────────────────────────────
  const entityBoost = input.isTrackedEntity ? 100 : 0;

  // ── Novelty (0–100, default 80 = moderately novel) ─────────────────────
  const novelty = input.noveltyScore != null ? Math.min(Math.max(input.noveltyScore, 0), 100) : 80;

  // ── Weighted composite ───────────────────────────────────────────────────
  const raw =
    significance    * RANK_WEIGHTS.significance +
    freshness       * RANK_WEIGHTS.freshness +
    clusterStrength * RANK_WEIGHTS.clusterStrength +
    novelty         * RANK_WEIGHTS.novelty +
    entityBoost     * RANK_WEIGHTS.entityBoost;

  const rankScore = Math.round(Math.min(Math.max(raw, 0), 100));

  return {
    rankScore,
    breakdown: {
      significance,
      freshness,
      clusterStrength,
      entityBoost,
      novelty,
      significanceFallback,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparator helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort comparator: highest rank score first.  Stable tie-breaking by
 * most-recent createdAt.
 */
export function compareByRankScore(
  a: { rankScore: number; createdAt: string | number },
  b: { rankScore: number; createdAt: string | number },
): number {
  if (a.rankScore !== b.rankScore) return b.rankScore - a.rankScore;
  // Tie-break: more recent first
  const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
  const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
  return bTime - aTime;
}
