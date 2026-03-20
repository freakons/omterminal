/**
 * Omterminal — Entity Momentum Index
 *
 * Computes a bounded 0–100 momentum score per entity based on existing stored
 * data (signals, signal_entities, entities tables).  No new infrastructure,
 * no embeddings, no heavy NLP.
 *
 * Formula (weights sum to 1.0):
 *   signal_volume   0.25 — count of signals linked to this entity in window
 *   avg_significance 0.30 — mean significance_score of those signals
 *   corroboration   0.15 — log-scaled avg source_support_count
 *   recency         0.20 — freshness of the most recent signal (exponential decay)
 *   type_diversity  0.10 — breadth of distinct signal types observed
 *
 * Momentum delta:
 *   Compare current window (now−7d) score vs previous window (now−14d → now−7d).
 *   Positive delta = rising momentum, negative = falling.
 *
 * Design constraints:
 *   • Pure deterministic scoring — same DB state → same scores.
 *   • Reads only from existing tables.  No schema changes required.
 *   • All DB access isolated to computeEntityMomentum(); computation is pure.
 */

import { dbQuery } from '@/db/client';
import { computeFreshness } from '@/lib/signals/rankScore';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

/** Rolling window in days for "current" momentum. */
export const MOMENTUM_WINDOW_DAYS = 7;

/** Maximum signal count that maps to a volume score of 100. */
const VOLUME_SATURATION = 10;

/** Weights used for the momentum composite. Must sum to 1.0. */
export const MOMENTUM_WEIGHTS = {
  signal_volume:    0.25,
  avg_significance: 0.30,
  corroboration:    0.15,
  recency:          0.20,
  type_diversity:   0.10,
} as const;

/** Number of distinct signal_type values that saturates type_diversity to 100. */
const TYPE_DIVERSITY_SATURATION = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** Per-factor breakdown returned in debug mode. */
export interface MomentumBreakdown {
  signal_volume:    { raw_value: number; normalized: number; weight: number; weighted: number };
  avg_significance: { raw_value: number; normalized: number; weight: number; weighted: number };
  corroboration:    { raw_value: number; normalized: number; weight: number; weighted: number };
  recency:          { raw_value: number; normalized: number; weight: number; weighted: number };
  type_diversity:   { raw_value: number; normalized: number; weight: number; weighted: number };
}

/** Output shape per entity. */
export interface EntityMomentum {
  /** DB primary key from the entities table. */
  entity_id: string;
  /** Human-readable entity name. */
  entity_name: string;
  /** Entity classification (company, model, person, …). */
  entity_type: string;
  /** Composite momentum score, bounded 0–100. */
  momentum_score: number;
  /**
   * Difference between current window score and previous window score.
   * Positive = rising, negative = falling, 0 = stable or insufficient history.
   */
  momentum_delta: number;
  /** Number of signals linked to this entity in the current window. */
  signal_count: number;
  /** Distinct signal types observed in the current window. */
  top_signal_types: string[];
  /** Titles of the highest-significance signals in the current window (max 3). */
  top_driver_titles: string[];
  /** Per-factor breakdown (only present when debug=true). */
  debug?: MomentumBreakdown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal DB row shapes
// ─────────────────────────────────────────────────────────────────────────────

interface WindowRow {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  signal_count: string;
  avg_significance: string | null;
  avg_source_support: string | null;
  last_signal_at: string | null;
  signal_types: string[] | null;
  top_titles: string[] | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure component scorers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signal volume score: linear saturation at VOLUME_SATURATION.
 * 0 signals → 0, VOLUME_SATURATION+ → 100.
 */
function scoreVolume(signalCount: number): number {
  return Math.min(signalCount / VOLUME_SATURATION, 1) * 100;
}

/**
 * Corroboration score: log-scaled average source support count.
 * 0 sources → 0, 1 → ~33, 3 → ~63, 5+ → ~86, saturates gradually.
 */
function scoreCorroboration(avgSourceSupport: number): number {
  if (avgSourceSupport <= 0) return 0;
  return Math.min(Math.log2(avgSourceSupport + 1) / Math.log2(6), 1) * 100;
}

/**
 * Type diversity score: fraction of the 5 signal types observed.
 * 1 type → 20, 5 types → 100.
 */
function scoreDiversity(distinctTypes: number): number {
  return Math.min(distinctTypes / TYPE_DIVERSITY_SATURATION, 1) * 100;
}

/**
 * Compute a momentum score from the 5 components.
 * All components are already in [0, 100].
 */
function computeScore(components: {
  signal_volume:    number;
  avg_significance: number;
  corroboration:    number;
  recency:          number;
  type_diversity:   number;
}): number {
  const raw =
    components.signal_volume    * MOMENTUM_WEIGHTS.signal_volume    +
    components.avg_significance * MOMENTUM_WEIGHTS.avg_significance +
    components.corroboration    * MOMENTUM_WEIGHTS.corroboration    +
    components.recency          * MOMENTUM_WEIGHTS.recency           +
    components.type_diversity   * MOMENTUM_WEIGHTS.type_diversity;
  return Math.round(Math.min(Math.max(raw, 0), 100));
}

/** Build a per-factor MomentumBreakdown for debug output. */
function buildBreakdown(components: {
  signal_volume:    number;
  avg_significance: number;
  corroboration:    number;
  recency:          number;
  type_diversity:   number;
}, raw: {
  signalCount:       number;
  avgSignificance:   number;
  avgSourceSupport:  number;
  hoursAgo:          number;
  distinctTypes:     number;
}): MomentumBreakdown {
  const w = MOMENTUM_WEIGHTS;
  return {
    signal_volume:    { raw_value: raw.signalCount,      normalized: Math.round(components.signal_volume),    weight: w.signal_volume,    weighted: Math.round(components.signal_volume    * w.signal_volume    * 100) / 100 },
    avg_significance: { raw_value: raw.avgSignificance,  normalized: Math.round(components.avg_significance), weight: w.avg_significance, weighted: Math.round(components.avg_significance * w.avg_significance * 100) / 100 },
    corroboration:    { raw_value: raw.avgSourceSupport, normalized: Math.round(components.corroboration),    weight: w.corroboration,    weighted: Math.round(components.corroboration    * w.corroboration    * 100) / 100 },
    recency:          { raw_value: raw.hoursAgo,         normalized: Math.round(components.recency),          weight: w.recency,          weighted: Math.round(components.recency          * w.recency          * 100) / 100 },
    type_diversity:   { raw_value: raw.distinctTypes,    normalized: Math.round(components.type_diversity),   weight: w.type_diversity,   weighted: Math.round(components.type_diversity   * w.type_diversity   * 100) / 100 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Score-from-row helper
// ─────────────────────────────────────────────────────────────────────────────

function scoreFromRow(
  row: WindowRow,
  now: Date,
  debug: boolean,
): { score: number; breakdown?: MomentumBreakdown } {
  const signalCount      = parseInt(row.signal_count, 10);
  const avgSignificance  = row.avg_significance  != null ? parseFloat(row.avg_significance)  : 50;
  const avgSourceSupport = row.avg_source_support != null ? parseFloat(row.avg_source_support) : 1;
  const distinctTypes    = row.signal_types?.filter(Boolean).length ?? 0;

  // Recency: use hours since the most recent signal for freshness decay.
  let hoursAgo = 48; // default = neutral freshness
  if (row.last_signal_at) {
    const msAgo = now.getTime() - new Date(row.last_signal_at).getTime();
    hoursAgo = Math.max(0, msAgo / (1000 * 60 * 60));
  }

  const components = {
    signal_volume:    scoreVolume(signalCount),
    avg_significance: avgSignificance,          // already 0–100
    corroboration:    scoreCorroboration(avgSourceSupport),
    recency:          computeFreshness(hoursAgo),
    type_diversity:   scoreDiversity(distinctTypes),
  };

  const score = computeScore(components);
  const breakdown = debug
    ? buildBreakdown(components, { signalCount, avgSignificance, avgSourceSupport, hoursAgo, distinctTypes })
    : undefined;

  return { score, breakdown };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — DB access + scoring
// ─────────────────────────────────────────────────────────────────────────────

export interface MomentumOptions {
  /** Rolling window in days.  Default: MOMENTUM_WINDOW_DAYS (7). */
  windowDays?: number;
  /** Maximum number of entities to return.  Default: 20. */
  limit?: number;
  /** When true, attach per-factor breakdown to each result. */
  debug?: boolean;
}

/**
 * Compute Entity Momentum Index for all entities with recent signal activity.
 *
 * Runs two aggregate DB queries (current window + previous window) and
 * computes scores purely in-process.  Returns entities sorted by momentum_score
 * descending.
 *
 * @param options  Window configuration, result limit, and debug flag.
 * @returns        Array of EntityMomentum objects sorted by momentum_score DESC.
 */
export async function computeEntityMomentum(
  options: MomentumOptions = {},
): Promise<EntityMomentum[]> {
  const windowDays = options.windowDays ?? MOMENTUM_WINDOW_DAYS;
  const limit      = Math.min(options.limit ?? 20, 100);
  const debug      = options.debug ?? false;
  const now        = new Date();

  // ── Current window ────────────────────────────────────────────────────────
  // Aggregate signal stats per entity for the last windowDays days.
  const currentRows = await dbQuery<WindowRow>`
    SELECT
      e.id                                             AS entity_id,
      e.name                                           AS entity_name,
      e.type                                           AS entity_type,
      COUNT(DISTINCT se.signal_id)::TEXT               AS signal_count,
      AVG(s.significance_score)::TEXT                  AS avg_significance,
      AVG(s.source_support_count)::TEXT                AS avg_source_support,
      MAX(s.created_at)::TEXT                          AS last_signal_at,
      ARRAY_AGG(DISTINCT s.signal_type)
        FILTER (WHERE s.signal_type IS NOT NULL)       AS signal_types,
      ARRAY_AGG(s.title ORDER BY COALESCE(s.significance_score, 0) DESC)
        FILTER (WHERE s.title IS NOT NULL)             AS top_titles
    FROM entities e
    JOIN signal_entities se ON se.entity_id = e.id
    JOIN signals s          ON s.id = se.signal_id
    WHERE s.created_at > NOW() - (${windowDays} * INTERVAL '1 day')
    GROUP BY e.id, e.name, e.type
    ORDER BY COUNT(DISTINCT se.signal_id) DESC
    LIMIT ${limit}
  `;

  if (currentRows.length === 0) return [];

  // ── Previous window ───────────────────────────────────────────────────────
  // Fetch the same entity set for the prior equal-length window (for delta).
  const entityIds = currentRows.map((r) => r.entity_id);

  const previousRows = await dbQuery<WindowRow>`
    SELECT
      e.id                                             AS entity_id,
      e.name                                           AS entity_name,
      e.type                                           AS entity_type,
      COUNT(DISTINCT se.signal_id)::TEXT               AS signal_count,
      AVG(s.significance_score)::TEXT                  AS avg_significance,
      AVG(s.source_support_count)::TEXT                AS avg_source_support,
      MAX(s.created_at)::TEXT                          AS last_signal_at,
      ARRAY_AGG(DISTINCT s.signal_type)
        FILTER (WHERE s.signal_type IS NOT NULL)       AS signal_types,
      NULL::TEXT[]                                     AS top_titles
    FROM entities e
    JOIN signal_entities se ON se.entity_id = e.id
    JOIN signals s          ON s.id = se.signal_id
    WHERE e.id = ANY(${entityIds})
      AND s.created_at > NOW() - (${windowDays * 2} * INTERVAL '1 day')
      AND s.created_at <= NOW() - (${windowDays} * INTERVAL '1 day')
    GROUP BY e.id, e.name, e.type
  `;

  // Build lookup map: entity_id → previous score
  const prevScoreMap = new Map<string, number>();
  for (const row of previousRows) {
    const { score } = scoreFromRow(row, now, false);
    prevScoreMap.set(row.entity_id, score);
  }

  // ── Compose results ───────────────────────────────────────────────────────
  const results: EntityMomentum[] = currentRows.map((row) => {
    const { score, breakdown } = scoreFromRow(row, now, debug);
    const prevScore = prevScoreMap.get(row.entity_id) ?? 0;
    const delta     = score - prevScore;

    const topTitles = (row.top_titles ?? []).filter(Boolean).slice(0, 3);
    const topTypes  = (row.signal_types ?? []).filter(Boolean);

    return {
      entity_id:         row.entity_id,
      entity_name:       row.entity_name,
      entity_type:       row.entity_type,
      momentum_score:    score,
      momentum_delta:    delta,
      signal_count:      parseInt(row.signal_count, 10),
      top_signal_types:  topTypes,
      top_driver_titles: topTitles,
      ...(breakdown ? { debug: breakdown } : {}),
    };
  });

  // Sort by momentum_score descending (signal count was the DB sort; score may differ)
  results.sort((a, b) => b.momentum_score - a.momentum_score);

  return results;
}
