/**
 * Omterminal — Strategic Importance Index
 *
 * Computes a bounded 0–100 strategic importance score for signals and,
 * optionally, for entities (via their signal aggregate).
 *
 * Conceptual distinction from momentum:
 *   Momentum    — "what is trending NOW" (frequency + recency + type breadth)
 *   Strategic   — "what matters structurally" (significance + type impact +
 *                  entity prominence + corroboration quality + ecosystem breadth)
 *
 * A single regulatory announcement about OpenAI from a Tier-1 source may have
 * LOW momentum (one signal in 7 days) but HIGH strategic importance (type=
 * REGULATION_ACTIVITY, prominent entity, high significance, well-corroborated).
 *
 * Formula for signals (weights sum to 1.0):
 *   base_significance    0.35 — stored significance_score (already composite)
 *   type_importance      0.25 — SIGNAL_TYPE_WEIGHTS lookup
 *   entity_prominence    0.20 — entity category (prominent / mid / unknown)
 *   corroboration_quality 0.15 — log-scaled source_support_count
 *   ecosystem_breadth    0.05 — entity count proxy
 *
 * Design constraints:
 *   • Pure, deterministic — no I/O, no randomness.
 *   • Works on the Signal interface already returned by existing APIs.
 *   • Reuses SIGNAL_TYPE_WEIGHTS and PROMINENT_ENTITIES from existing modules.
 *   • No schema changes required.
 */

import type { Signal } from '@/data/mockSignals';
import { SIGNAL_TYPE_WEIGHTS, PROMINENT_ENTITIES } from '@/services/signals/signalSignificance';
import { computeClusterStrength } from '@/lib/signals/rankScore';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

/** Weights used for the strategic composite. Must sum to 1.0. */
export const STRATEGIC_WEIGHTS = {
  base_significance:     0.35,
  type_importance:       0.25,
  entity_prominence:     0.20,
  corroboration_quality: 0.15,
  ecosystem_breadth:     0.05,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Signal type → strategic importance mapping
//
// Reuses SIGNAL_TYPE_WEIGHTS from signalSignificance.  That map already encodes
// the strategic weighting from the Omterminal domain model:
//   CAPITAL_ACCELERATION 90  — capital concentration; high investor signal
//   MODEL_RELEASE_WAVE   85  — capability shift; drives downstream decisions
//   REGULATION_ACTIVITY  75  — policy moves; directional but slower-moving
//   RESEARCH_MOMENTUM    70  — leading indicator for capability shifts
//   COMPANY_EXPANSION    65  — relevant but more routine
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TYPE_IMPORTANCE = 50; // fallback for unknown/missing signal_type

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** Per-factor breakdown returned in debug mode. */
export interface StrategicBreakdown {
  base_significance:     { raw_value: number; weight: number; weighted: number };
  type_importance:       { raw_value: number; weight: number; weighted: number };
  entity_prominence:     { raw_value: number; weight: number; weighted: number };
  corroboration_quality: { raw_value: number; weight: number; weighted: number };
  ecosystem_breadth:     { raw_value: number; weight: number; weighted: number };
}

/** Strategic importance result for a single signal. */
export interface SignalStrategic {
  /** Signal ID (passthrough). */
  signal_id: string;
  /** Signal title (passthrough). */
  signal_title: string;
  /** Entity name (passthrough). */
  entity_name: string | undefined;
  /** Signal category / type (passthrough). */
  signal_type: string | undefined;
  /** Signal date (passthrough for recency display). */
  signal_date?: string;
  /** Source support count (passthrough for corroboration display). */
  source_support_count?: number | null;
  /** Strategic importance score, bounded 0–100. */
  strategic_importance_score: number;
  /** Per-factor breakdown (only present when debug=true). */
  debug?: StrategicBreakdown;
}

/** Aggregate strategic importance for an entity across its signals. */
export interface EntityStrategic {
  entity_name: string;
  /** Weighted average of the entity's signal strategic scores. */
  strategic_importance_score: number;
  /** Number of signals that contributed to this aggregate. */
  signal_count: number;
  /** Highest individual signal score for this entity. */
  peak_score: number;
  /** Signal types represented in the entity's signals. */
  signal_types: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component scorers (pure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base significance: stored significance_score (0–100).
 * Falls back to confidence score (with scale normalisation) for legacy rows.
 */
function scoreBaseSignificance(signal: Signal): number {
  if (signal.significanceScore != null && signal.significanceScore >= 0) {
    return Math.min(signal.significanceScore, 100);
  }
  // Legacy fallback: confidence is stored as 0–100 integer
  if (signal.confidence != null) {
    const raw = signal.confidence <= 1 ? signal.confidence * 100 : signal.confidence;
    return Math.min(Math.max(raw, 0), 100);
  }
  return 50; // neutral default
}

/**
 * Type importance: map signal_type to a strategic weight using the same
 * SIGNAL_TYPE_WEIGHTS table that drives significance scoring.
 * Returns DEFAULT_TYPE_IMPORTANCE for unknown/null types.
 */
function scoreTypeImportance(signal: Signal): number {
  // The Signal interface uses `category` for frontend display; the underlying
  // signal_type (engine type) is the strategic discriminator.  Check both.
  // Map frontend SignalCategory to SIGNAL_TYPE_WEIGHTS
  // (engineTypeToCategory maps: CAPITAL_ACCELERATION→funding, MODEL_RELEASE_WAVE→models,
  //  REGULATION_ACTIVITY→regulation, RESEARCH_MOMENTUM→research, COMPANY_EXPANSION→product)
  const cat = signal.category;
  if (cat === 'funding')     return SIGNAL_TYPE_WEIGHTS.CAPITAL_ACCELERATION;
  if (cat === 'models')      return SIGNAL_TYPE_WEIGHTS.MODEL_RELEASE_WAVE;
  if (cat === 'regulation')  return SIGNAL_TYPE_WEIGHTS.REGULATION_ACTIVITY;
  if (cat === 'research')    return SIGNAL_TYPE_WEIGHTS.RESEARCH_MOMENTUM;
  if (cat === 'product')     return SIGNAL_TYPE_WEIGHTS.COMPANY_EXPANSION;
  if (cat === 'agents')      return SIGNAL_TYPE_WEIGHTS.RESEARCH_MOMENTUM;  // agents ≈ advanced research
  return DEFAULT_TYPE_IMPORTANCE;
}

/**
 * Entity prominence: rewards signals involving major AI ecosystem players.
 *   Prominent entity  → 100
 *   Mid-tier entity   → 50
 *   Unknown entity    → 20
 *   No entity         → 30 (neutral — data may be missing)
 */
function scoreEntityProminence(signal: Signal): number {
  if (!signal.entityName) return 30;
  const name = signal.entityName.toLowerCase().trim();
  if (PROMINENT_ENTITIES.has(name)) return 100;
  // Partial-match heuristic: entity name contains a prominent name as a word.
  for (const prominent of PROMINENT_ENTITIES) {
    if (name.includes(prominent) || prominent.includes(name)) return 70;
  }
  return 20; // real entity but not in the prominent set
}

/**
 * Corroboration quality: log-scaled from source_support_count.
 * Reuses computeClusterStrength from rankScore which is calibrated for this.
 *   1 source  → ~33
 *   3 sources → ~66
 *   8+ sources → 100
 */
function scoreCorroborationQuality(signal: Signal): number {
  return computeClusterStrength(signal.sourceSupportCount ?? null);
}

/**
 * Ecosystem breadth: proxy based on source support count and category breadth.
 * A high source count signals that many players in the ecosystem are watching
 * this development.  Scales 0→20 for no support, up to 100 for 8+ sources.
 */
function scoreEcosystemBreadth(signal: Signal): number {
  const sourceFraction = Math.min((signal.sourceSupportCount ?? 1) / 8, 1);
  return Math.round(sourceFraction * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-signal computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the Strategic Importance Index for a single signal.
 *
 * @param signal  Any Signal from the existing feed/API.
 * @param debug   When true, attach per-factor breakdown.
 * @returns       SignalStrategic with bounded 0–100 score.
 */
export function computeSignalStrategic(
  signal: Signal,
  debug = false,
): SignalStrategic {
  const w = STRATEGIC_WEIGHTS;

  const base_significance     = scoreBaseSignificance(signal);
  const type_importance       = scoreTypeImportance(signal);
  const entity_prominence     = scoreEntityProminence(signal);
  const corroboration_quality = scoreCorroborationQuality(signal);
  const ecosystem_breadth     = scoreEcosystemBreadth(signal);

  const raw =
    base_significance     * w.base_significance     +
    type_importance       * w.type_importance       +
    entity_prominence     * w.entity_prominence     +
    corroboration_quality * w.corroboration_quality +
    ecosystem_breadth     * w.ecosystem_breadth;

  const strategic_importance_score = Math.round(Math.min(Math.max(raw, 0), 100));

  const result: SignalStrategic = {
    signal_id:                  signal.id,
    signal_title:               signal.title,
    entity_name:                signal.entityName ?? undefined,
    signal_type:                signal.category,
    signal_date:                signal.date ?? undefined,
    source_support_count:       signal.sourceSupportCount ?? null,
    strategic_importance_score,
  };

  if (debug) {
    result.debug = {
      base_significance:     { raw_value: base_significance,     weight: w.base_significance,     weighted: Math.round(base_significance     * w.base_significance     * 100) / 100 },
      type_importance:       { raw_value: type_importance,       weight: w.type_importance,       weighted: Math.round(type_importance       * w.type_importance       * 100) / 100 },
      entity_prominence:     { raw_value: entity_prominence,     weight: w.entity_prominence,     weighted: Math.round(entity_prominence     * w.entity_prominence     * 100) / 100 },
      corroboration_quality: { raw_value: corroboration_quality, weight: w.corroboration_quality, weighted: Math.round(corroboration_quality * w.corroboration_quality * 100) / 100 },
      ecosystem_breadth:     { raw_value: ecosystem_breadth,     weight: w.ecosystem_breadth,     weighted: Math.round(ecosystem_breadth     * w.ecosystem_breadth     * 100) / 100 },
    };
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute strategic importance for an array of signals and return them sorted
 * by strategic_importance_score descending.
 */
export function rankSignalsByStrategic(
  signals: Signal[],
  debug = false,
): SignalStrategic[] {
  return signals
    .map((s) => computeSignalStrategic(s, debug))
    .sort((a, b) => b.strategic_importance_score - a.strategic_importance_score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity-level aggregate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate strategic importance scores per entity across a set of signals.
 *
 * Uses a weighted average that biases toward the highest-scoring signals
 * (top 3 signals count twice each) to reflect that a single pivotal
 * development dominates an entity's strategic footprint.
 *
 * @param signals  Signals already scored with computeSignalStrategic.
 * @returns        Per-entity aggregates sorted by strategic_importance_score DESC.
 */
export function computeEntityStrategic(
  signals: SignalStrategic[],
): EntityStrategic[] {
  // Group by entity_name
  const entityMap = new Map<string, SignalStrategic[]>();
  for (const s of signals) {
    const key = s.entity_name ?? '_unknown';
    if (!entityMap.has(key)) entityMap.set(key, []);
    entityMap.get(key)!.push(s);
  }

  const results: EntityStrategic[] = [];

  for (const [entityName, entitySignals] of entityMap) {
    if (entityName === '_unknown') continue;

    // Sort by score desc; top 3 double-counted for the weighted avg
    const sorted = [...entitySignals].sort(
      (a, b) => b.strategic_importance_score - a.strategic_importance_score,
    );

    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const w = i < 3 ? 2 : 1; // top-3 double-weighted
      weightedSum += sorted[i].strategic_importance_score * w;
      totalWeight += w;
    }

    const aggregate = Math.round(weightedSum / totalWeight);
    const peakScore = sorted[0]?.strategic_importance_score ?? 0;
    const types = [...new Set(sorted.map((s) => s.signal_type).filter(Boolean))] as string[];

    results.push({
      entity_name:                entityName,
      strategic_importance_score: aggregate,
      signal_count:               sorted.length,
      peak_score:                 peakScore,
      signal_types:               types,
    });
  }

  return results.sort((a, b) => b.strategic_importance_score - a.strategic_importance_score);
}
