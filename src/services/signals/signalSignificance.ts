/**
 * Omterminal — Signal Significance Engine
 *
 * Pure, stateless module that computes a composite significance score
 * (0–100) for a signal at write time.  No side-effects, no I/O, no LLM.
 *
 * significance_score combines five components:
 *   confidence        (30%) — how well-evidenced the signal is (from detection engine)
 *   signal type weight (25%) — intrinsic strategic importance of the pattern type
 *   source diversity  (20%) — number of distinct sources corroborating it
 *   velocity          (15%) — events per day within the detection window
 *   entity spread     (10%) — number of distinct entities involved
 *
 * Usage:
 *   import { computeSignificance } from '@/services/signals/signalSignificance';
 *   const { significanceScore, sourceSupportCount } = computeSignificance({ ... });
 */

import type { SignalType } from '@/types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Signal type weights  (0.0 – 1.0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intrinsic strategic importance weight for each signal type.
 * Reflects how decision-relevant each pattern type is for Omterminal's audience.
 * Used as one input component of the composite significance score.
 */
export const SIGNAL_TYPE_WEIGHTS: Record<SignalType, number> = {
  /** Capital concentration signals market conviction — highest weight. */
  CAPITAL_ACCELERATION: 1.00,
  /** Rapid capability releases reshape the competitive landscape. */
  MODEL_RELEASE_WAVE:   0.90,
  /** Regulatory surges create compliance risk and market friction. */
  REGULATION_ACTIVITY:  0.85,
  /** Research clusters precede near-term product advances. */
  RESEARCH_MOMENTUM:    0.75,
  /** Strategic moves indicate sector consolidation pressure. */
  COMPANY_EXPANSION:    0.70,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component weights (must sum to 1.0)
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENT_WEIGHTS = {
  confidence:      0.30,
  typeWeight:      0.25,
  sourceDiversity: 0.20,
  velocity:        0.15,
  entitySpread:    0.10,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Input / output types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All inputs required to compute a signal's significance score.
 * All values are available at signal generation time — no external calls needed.
 */
export interface SignificanceInput {
  /** 0.0–1.0 confidence score from the detection engine */
  confidenceScore: number;
  /** Signal pattern type (used to look up the type weight) */
  signalType: SignalType;
  /** Number of distinct article/feed sources supporting this signal */
  sourceSupportCount: number;
  /** Number of events in the detection cluster */
  clusterSize: number;
  /** Length of the detection time window in milliseconds */
  windowMs: number;
  /** Number of distinct entity names affected by the signal */
  entityCount: number;
}

/**
 * Output of computeSignificance.
 */
export interface SignificanceResult {
  /** Composite significance score, integer 0–100, ready for DB storage */
  significanceScore: number;
  /** Number of distinct sources (passed through for storage in source_support_count) */
  sourceSupportCount: number;
  /** Per-component breakdown for debugging and introspection */
  components: {
    confidenceComponent:      number;
    typeWeightComponent:      number;
    sourceDiversityComponent: number;
    velocityComponent:        number;
    entitySpreadComponent:    number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp v to [0, 1]. */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Normalize source diversity over [1, 10].
 * 1 source → 0.0; 10+ sources → 1.0; linear in between.
 */
function normalizeSourceDiversity(count: number): number {
  return clamp01((count - 1) / 9);
}

/**
 * Normalize velocity (events per day, derived from clusterSize / windowDays).
 * 0 evts/day → 0.0; 5+ evts/day → 1.0.
 */
function normalizeVelocity(clusterSize: number, windowMs: number): number {
  const windowDays = windowMs / (24 * 60 * 60 * 1000);
  const eventsPerDay = windowDays > 0 ? clusterSize / windowDays : 0;
  return clamp01(eventsPerDay / 5);
}

/**
 * Normalize entity spread over [1, 10].
 * 1 entity → 0.10; 10+ entities → 1.0; linear.
 */
function normalizeEntitySpread(count: number): number {
  return clamp01(count / 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a composite significance score for a signal.
 *
 * All inputs are available at signal generation time — no external calls needed.
 * The result is intended to be stored in signals.significance_score (INTEGER)
 * and signals.source_support_count (INTEGER).
 *
 * @param input  Signal attributes used to derive significance.
 * @returns      Integer significance score (0–100) plus component breakdown.
 *
 * @example
 * const result = computeSignificance({
 *   confidenceScore:    0.82,
 *   signalType:         'CAPITAL_ACCELERATION',
 *   sourceSupportCount: 6,
 *   clusterSize:        5,
 *   windowMs:           14 * 24 * 60 * 60 * 1000,
 *   entityCount:        4,
 * });
 * // result.significanceScore → 72
 * // result.sourceSupportCount → 6
 */
export function computeSignificance(input: SignificanceInput): SignificanceResult {
  const {
    confidenceScore,
    signalType,
    sourceSupportCount,
    clusterSize,
    windowMs,
    entityCount,
  } = input;

  const typeWeight = SIGNAL_TYPE_WEIGHTS[signalType] ?? 0.70;

  // Normalized component fractions (0–1)
  const confidenceFraction      = clamp01(confidenceScore);
  const typeWeightFraction      = clamp01(typeWeight);
  const sourceDiversityFraction = normalizeSourceDiversity(sourceSupportCount);
  const velocityFraction        = normalizeVelocity(clusterSize, windowMs);
  const entitySpreadFraction    = normalizeEntitySpread(entityCount);

  // Weighted composite (0–1)
  const composite =
    confidenceFraction      * COMPONENT_WEIGHTS.confidence      +
    typeWeightFraction      * COMPONENT_WEIGHTS.typeWeight       +
    sourceDiversityFraction * COMPONENT_WEIGHTS.sourceDiversity  +
    velocityFraction        * COMPONENT_WEIGHTS.velocity         +
    entitySpreadFraction    * COMPONENT_WEIGHTS.entitySpread;

  const significanceScore = Math.round(clamp01(composite) * 100);

  return {
    significanceScore,
    sourceSupportCount,
    components: {
      confidenceComponent:      Math.round(confidenceFraction      * 100 * 100) / 100,
      typeWeightComponent:      Math.round(typeWeightFraction      * 100 * 100) / 100,
      sourceDiversityComponent: Math.round(sourceDiversityFraction * 100 * 100) / 100,
      velocityComponent:        Math.round(velocityFraction        * 100 * 100) / 100,
      entitySpreadComponent:    Math.round(entitySpreadFraction    * 100 * 100) / 100,
    },
  };
}
