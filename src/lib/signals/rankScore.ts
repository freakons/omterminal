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
 *   rankScore = significance    × 0.55   (dominant — quality must lead)
 *             + freshness       × 0.20   (recency matters, decays over 72h half-life)
 *             + clusterStrength × 0.20   (corroboration — 1 source vs 5+ sources: ~10 pts gap)
 *             + entityBoost     × 0.05   (tracked-entity priority lift)
 *           [ + novelty         × 0.00 ] (reserved; currently 0 — default 80 is non-differentiating)
 *
 * Where:
 *   significance     — persisted 0–100 from signalSignificance.ts (write-time composite)
 *   freshness        — exponential decay: 100 × e^(-λ × ageHours), half-life = 72h
 *   clusterStrength  — log2-scaled corroboration score based on sourceSupportCount (0–100)
 *   novelty          — weight 0 (reserved for future per-signal novelty scoring)
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
  // ── Weighted contributions (sum ≈ rankScore) ──────────────────────────────
  /** Significance after weight applied (points toward final score). */
  significanceContribution: number;
  /** Freshness after weight applied. */
  freshnessContribution: number;
  /** Corroboration/cluster after weight applied. */
  clusterContribution: number;
  /** Entity boost after weight applied. */
  entityContribution: number;
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
  /**
   * Significance is the dominant factor — the write-time composite score
   * already captures confidence, source diversity, velocity, entity prominence,
   * and type weight.  Raised to 0.55 so quality signal clearly outranks noise.
   */
  significance: 0.55,
  /** Freshness rewards recency without overwhelming quality. */
  freshness: 0.20,
  /**
   * Cluster strength rewards multi-source corroboration.
   * Raised to 0.20 so weak single-source signals fall clearly and
   * well-corroborated signals surface noticeably higher.
   * Gap between 1 source (33 pts) and 5+ sources (86+ pts) → ~10.6 rank pts.
   */
  clusterStrength: 0.20,
  /**
   * Novelty is NOT applied in standard feed composition — all signals receive
   * the same default of 80, making the weight non-differentiating.  Set to 0
   * to avoid flat noise; kept in the formula for future per-signal novelty
   * scoring without a breaking interface change.
   */
  novelty: 0.00,
  /** Entity boost gives a small lift to tracked-entity signals. */
  entityBoost: 0.05,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Freshness decay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Half-life in hours: a signal loses half its freshness value after this many
 * hours.  Extended to 72 hours (3 days) so a high-significance signal from
 * 4 days ago retains ~40% freshness instead of falling to 25%.  This prevents
 * stale-but-important signals from disappearing too fast while still letting
 * very old low-quality signals decay into the noise floor.
 *
 * Freshness scale at 72h half-life:
 *   0h   → 100   (just created)
 *   24h  → 79
 *   72h  → 50    (3 days old)
 *   6d   → 25
 *   12d  → 6
 */
export const FRESHNESS_HALF_LIFE_HOURS = 72;

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
  const significanceContribution = Math.round(significance    * RANK_WEIGHTS.significance * 10) / 10;
  const freshnessContribution    = Math.round(freshness       * RANK_WEIGHTS.freshness    * 10) / 10;
  const clusterContribution      = Math.round(clusterStrength * RANK_WEIGHTS.clusterStrength * 10) / 10;
  const entityContribution       = Math.round(entityBoost     * RANK_WEIGHTS.entityBoost  * 10) / 10;
  // novelty weight is 0.00 — contributes 0 regardless of value

  const raw =
    significanceContribution +
    freshnessContribution    +
    clusterContribution      +
    entityContribution;

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
      significanceContribution,
      freshnessContribution,
      clusterContribution,
      entityContribution,
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
