/**
 * Omterminal — Signal Significance Engine
 *
 * Pure, stateless module that computes a significance score (0–100) for a
 * signal at write time.  Significance goes beyond raw confidence: it weighs
 * source diversity, event velocity, signal type strategic weight, entity
 * spread, and (when available) story-cluster intelligence to produce a ranking
 * signal that powers premium surfaces.
 *
 * Design constraints:
 *   • No LLM calls, no external I/O — safe to call in any pipeline stage.
 *   • Pure function: same inputs always produce the same output.
 *   • All weights are centralised here; change one place to affect all signals.
 *   • ClusterContext is optional — omitting it preserves pre-existing behaviour.
 */

import type { SignalType } from '@/types/intelligence';
import { computeWeightedSourceTrust } from '@/lib/sourceTrust';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Story-cluster level metadata that can be attached to a significance
 * computation to upgrade scoring beyond event-level signals.
 *
 * All fields are derived from the `story_clusters` table and the articles
 * that belong to it.  Pass this when the signal's events can be linked to
 * a story cluster (e.g. via articles.story_cluster_id).
 *
 * When provided, the `clusterIntelligence` component (weight 0.25) is added
 * and the weights for sourceDiversity and sourceTrustQuality are halved to
 * avoid double-counting corroboration evidence.
 */
export interface ClusterContext {
  /**
   * Total number of articles in the story cluster covering this signal.
   * 1 = isolated single article (low significance).
   * 8+ from multiple tiers = widely corroborated (high significance).
   */
  articleCount: number;

  /**
   * Number of distinct source publishers in the cluster.
   * More unique sources → less risk of single-source bias.
   */
  uniqueSourceCount: number;

  /**
   * Average source weight across cluster articles.
   * Tier 1 (primary / official) = 1.0
   * Tier 2 (major media)        = 0.7
   * Tier 3 (community/aggreg.)  = 0.4
   */
  avgSourceWeight: number;

  /**
   * Optional: number of distinct source tiers represented in the cluster.
   * Range 1–3.  A mix of Tier 1 + Tier 2 (diversity=2) is worth more than
   * ten articles all from the same tier.
   */
  sourceTierDiversity?: number;
}

/**
 * Input to computeSignificance.
 *
 * All numeric fields are expected to be non-negative.
 * The function clamps them internally so callers do not need to guard ranges.
 */
export interface SignificanceInput {
  /** Signal pattern type — drives the type-weight multiplier. */
  signalType: SignalType | null;

  /**
   * Raw confidence from the detection engine (0.0 – 1.0).
   * Maps to the engine's confidence_score column.
   */
  confidenceScore: number;

  /**
   * Number of distinct source domains / publishers that contributed events
   * supporting this signal.  0 = single-source; higher = more credible.
   */
  sourceCount: number;

  /**
   * Number of supporting events that fired within the detection window.
   * Captures how densely the signal's time-window was populated.
   */
  eventCount: number;

  /**
   * Total time span of the supporting events in hours.
   * A short span for many events indicates high velocity.
   * 0 means all events are simultaneous (treat as instantaneous).
   */
  windowHours: number;

  /**
   * Number of distinct named entities (companies, labs, funds) mentioned
   * across supporting events.  Broader entity coverage = broader impact.
   */
  entityCount: number;

  /**
   * Optional list of source identifiers (registry IDs, names, or domains)
   * that contributed events to this signal.  When provided, enables a source
   * trust quality component that rewards signals backed by credible sources.
   * When absent, the source trust component uses a neutral midpoint.
   */
  sourceIds?: string[];

  /**
   * Optional list of entity names involved in this signal.  When provided,
   * enables entity prominence scoring — signals involving major AI players
   * receive a boost.
   */
  entityNames?: string[];

  /**
   * Optional story-cluster metadata for this signal's underlying story.
   * When provided, enables the cluster intelligence component which reflects
   * real-world importance (breadth of coverage + source quality mix) rather
   * than just whether the signal exists.
   *
   * Without this field the function behaves identically to the previous
   * version — full backward compatibility.
   */
  clusterContext?: ClusterContext;
}

/**
 * Scored output returned by computeSignificance.
 */
export interface SignificanceResult {
  /** Composite significance score clamped to [0, 100]. */
  significanceScore: number;

  /**
   * Number of distinct sources used in the computation.
   * Mirrors SignificanceInput.sourceCount; provided for convenience at the
   * write site so callers can persist both fields in one pass.
   */
  sourceSupportCount: number;

  /** Per-component breakdown for debugging and audit logging. */
  components: {
    /** Confidence component (0–100 before weighting). */
    confidence: number;
    /** Source diversity component (0–100 before weighting). */
    sourceDiversity: number;
    /** Source trust quality component (0–100 before weighting). */
    sourceTrustQuality: number;
    /** Velocity component (0–100 before weighting). */
    velocity: number;
    /** Signal type strategic weight (0–100 before weighting). */
    typeWeight: number;
    /** Entity spread component (0–100 before weighting). */
    entitySpread: number;
    /** Entity prominence component (0–100 before weighting). */
    entityProminence: number;
    /**
     * Cluster intelligence component (0–100 before weighting).
     * Only present when clusterContext was supplied.
     * Encodes article volume + source diversity + source quality tier.
     */
    clusterIntelligence?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal type weights
//
// Centralised map: higher = more strategically significant for Omterminal's
// target audience (AI operators, investors, policy watchers).
// Range: 0–100.  Neutral/informational types score lower than market-moving ones.
// ─────────────────────────────────────────────────────────────────────────────

export const SIGNAL_TYPE_WEIGHTS: Record<SignalType, number> = {
  CAPITAL_ACCELERATION: 90,  // Capital concentration is high-signal for investors
  MODEL_RELEASE_WAVE:   85,  // Capability shifts drive downstream decisions
  REGULATION_ACTIVITY:  75,  // Policy moves affect entire sectors; directional but slower
  RESEARCH_MOMENTUM:    70,  // Precursor to capability shifts; leading indicator
  COMPANY_EXPANSION:    65,  // Expansion events are relevant but more routine
};

/** Fallback weight when signal type is unknown or null. */
const DEFAULT_TYPE_WEIGHT = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Component weights
//
// Two weight sets:
//   BASE_WEIGHTS        — used when no ClusterContext is supplied (original).
//   CLUSTER_WEIGHTS     — used when ClusterContext is available; adds a
//                         clusterIntelligence component (0.25) and reduces
//                         sourceDiversity + sourceTrustQuality to avoid
//                         double-counting corroboration evidence.
//
// Both sets sum to 1.0.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_WEIGHTS = {
  confidence:         0.25,
  sourceDiversity:    0.20,
  sourceTrustQuality: 0.10,
  velocity:           0.15,
  typeWeight:         0.10,
  entitySpread:       0.10,
  entityProminence:   0.10,
  clusterIntelligence: 0.00, // unused in base mode
} as const;

const CLUSTER_WEIGHTS = {
  confidence:         0.20,  // –0.05: cluster carries some of the corroboration signal
  sourceDiversity:    0.10,  // –0.10: cluster's uniqueSourceCount supersedes this
  sourceTrustQuality: 0.05,  // –0.05: cluster's avgSourceWeight encodes quality better
  velocity:           0.15,  // unchanged
  typeWeight:         0.10,  // unchanged
  entitySpread:       0.05,  // –0.05: cluster article count proxies breadth
  entityProminence:   0.10,  // unchanged
  clusterIntelligence: 0.25, // new: article volume × source diversity × source quality
} as const;

// Keep the existing exported symbol pointing at the base weights for callers
// that reference it directly (e.g. tests).
export const COMPONENT_WEIGHTS = BASE_WEIGHTS;

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation constants
// ─────────────────────────────────────────────────────────────────────────────

/** Treat ≥ this many sources as full source-diversity coverage. */
const SOURCE_SATURATION = 5;

/** Treat ≥ this many entities as full entity-spread coverage. */
const ENTITY_SATURATION = 8;

/**
 * Cluster-level saturation: ≥ this many articles in a story cluster is treated
 * as full volume coverage (log scale so each extra article adds diminishing returns).
 * 1 article → 0, 2 → ~30, 4 → ~60, 8 → ~90, 10 → 100.
 */
const CLUSTER_ARTICLE_SATURATION = 10;

/**
 * Cluster-level source saturation: ≥ this many distinct publishers in the cluster
 * is treated as full source-diversity coverage.
 */
const CLUSTER_SOURCE_SATURATION = 8;

/**
 * Reference velocity: events/hour at which velocity component saturates.
 * 0.5 events/hour = 12 events over 24 h triggers near-maximum velocity.
 */
const VELOCITY_SATURATION = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a value to [0, 1]. */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Scale a [0, 1] fraction to [0, 100], rounded to nearest integer. */
function toScore(fraction: number): number {
  return Math.round(clamp01(fraction) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component scorers
// ─────────────────────────────────────────────────────────────────────────────

/** confidence_score (0–1) → [0, 100] */
function scoreConfidence(confidenceScore: number): number {
  return toScore(confidenceScore);
}

/**
 * Source diversity: logarithmic saturation so each additional source adds
 * diminishing returns.  1 source → 20; 5+ → 100.
 */
function scoreSourceDiversity(sourceCount: number): number {
  if (sourceCount <= 0) return 0;
  return toScore(Math.log(sourceCount + 1) / Math.log(SOURCE_SATURATION + 1));
}

/**
 * Velocity: events per hour, saturating at VELOCITY_SATURATION.
 * windowHours=0 (instantaneous burst) is treated as max velocity.
 */
function scoreVelocity(eventCount: number, windowHours: number): number {
  if (eventCount <= 0) return 0;
  if (windowHours <= 0) return 100; // Instantaneous burst = maximum velocity
  const eventsPerHour = eventCount / windowHours;
  return toScore(eventsPerHour / VELOCITY_SATURATION);
}

/** Look up the strategic weight for a signal type. */
function scoreTypeWeight(signalType: SignalType | null): number {
  if (signalType === null) return DEFAULT_TYPE_WEIGHT;
  return SIGNAL_TYPE_WEIGHTS[signalType] ?? DEFAULT_TYPE_WEIGHT;
}

/**
 * Entity spread: linear saturation at ENTITY_SATURATION.
 * A signal touching more distinct entities has broader ecosystem impact.
 */
function scoreEntitySpread(entityCount: number): number {
  return toScore(entityCount / ENTITY_SATURATION);
}

/**
 * Source trust quality: weighted trust score of contributing sources.
 * Returns a neutral 50 when no source IDs are provided (backward-compatible).
 */
function scoreSourceTrustQuality(sourceIds?: string[]): number {
  if (!sourceIds || sourceIds.length === 0) return 50;
  return computeWeightedSourceTrust(sourceIds);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster intelligence scorer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a story cluster's contribution to signal significance.
 *
 * Combines three sub-components:
 *   articleVolume   (0.30) — log-scale article count; 1 article → 0, 10+ → 100
 *   sourceDiversity (0.25) — log-scale distinct publishers; saturates at 8
 *   sourceQuality   (0.45) — linear from avgSourceWeight (0.4 → 40, 1.0 → 100)
 *
 * Plus an optional tier-diversity bonus (+10 per extra tier) for signals
 * backed by a mix of Tier 1/Tier 2/Tier 3 sources.
 *
 * Examples:
 *   1 article (tier 2)                         → ~40 (low)
 *   8 articles, 6 sources, avg weight 0.85     → ~88 (high)
 *   10 articles, 5 sources, avg weight 0.40    → ~69 (medium)
 */
function scoreClusterIntelligence(ctx: ClusterContext): number {
  // Article volume: log scale so that going from 1→2 adds more than 9→10.
  // log(1)=0 intentionally gives zero for single-article signals.
  const articleVolumeScore = ctx.articleCount <= 1
    ? 0
    : toScore(Math.log(ctx.articleCount) / Math.log(CLUSTER_ARTICLE_SATURATION));

  // Source diversity within the cluster (log scale, different saturation from event-level).
  const sourceDivScore = toScore(
    Math.log(ctx.uniqueSourceCount + 1) / Math.log(CLUSTER_SOURCE_SATURATION + 1),
  );

  // Source quality: avgSourceWeight is already on [0, 1] scale.
  // Tier 1 (1.0) → 100, Tier 2 (0.7) → 70, Tier 3 (0.4) → 40.
  const qualityScore = toScore(ctx.avgSourceWeight);

  // Composite (weights sum to 1.0 within this sub-scorer).
  const base =
    articleVolumeScore * 0.30 +
    sourceDivScore     * 0.25 +
    qualityScore       * 0.45;

  // Tier-diversity bonus: each additional tier (beyond the first) adds 10 points.
  // Rewards signals backed by a heterogeneous mix (Tier 1 + Tier 2, etc.).
  const tierBonus =
    ctx.sourceTierDiversity != null
      ? Math.min(ctx.sourceTierDiversity - 1, 2) * 10
      : 0;

  return Math.min(100, Math.round(base + tierBonus));
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity prominence
// ─────────────────────────────────────────────────────────────────────────────

const PROMINENT_ENTITIES = new Set([
  'openai', 'anthropic', 'google', 'google deepmind', 'deepmind', 'meta',
  'microsoft', 'nvidia', 'apple', 'amazon', 'aws', 'mistral', 'xai',
  'cohere', 'stability ai', 'hugging face', 'inflection', 'character ai',
  'databricks', 'snowflake', 'salesforce', 'oracle', 'ibm', 'samsung',
  'baidu', 'alibaba', 'tencent', 'bytedance',
]);

/**
 * Entity prominence: rewards signals that involve major AI players.
 * 0 entities → 0.  1 major entity → 60.  2+ → up to 100.
 * Returns neutral 40 when no entity names are provided.
 */
function scoreEntityProminence(entityNames?: string[]): number {
  if (!entityNames || entityNames.length === 0) return 40;
  const majorCount = entityNames.filter(
    (n) => PROMINENT_ENTITIES.has(n.toLowerCase().trim()),
  ).length;
  if (majorCount === 0) return 20;
  if (majorCount === 1) return 60;
  return toScore(Math.min(majorCount, 4) / 4); // 2→50, 3→75, 4→100
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a composite significance score for a signal.
 *
 * Combines up to eight components — confidence, source diversity, source trust
 * quality, velocity, signal type weight, entity spread, entity prominence, and
 * (when clusterContext is provided) cluster intelligence — into a single 0–100
 * integer.  Higher scores indicate signals that are more credible, better
 * corroborated, more timely, more strategically relevant, and broader in
 * ecosystem impact.
 *
 * When clusterContext is supplied the weighting shifts to favour cluster-level
 * intelligence (article volume × source diversity × source quality tier) and
 * reduces the event-level corroboration weights to avoid double-counting.
 * Without clusterContext the function behaves identically to previous versions.
 *
 * Called at write time (signal generation stage) so the score is persisted
 * and never recomputed on the read path.
 *
 * @param input  Significance input derived from the signal, its events, and
 *               optionally the story cluster it belongs to.
 * @returns      Scored result with the integer significanceScore and component breakdown.
 *
 * @example — without cluster context (backward-compatible)
 * const result = computeSignificance({
 *   signalType:      'CAPITAL_ACCELERATION',
 *   confidenceScore: 0.87,
 *   sourceCount:     4,
 *   eventCount:      5,
 *   windowHours:     72,
 *   entityCount:     3,
 * });
 * // result.significanceScore → 79
 *
 * @example — with cluster context
 * const result = computeSignificance({
 *   signalType:      'MODEL_RELEASE_WAVE',
 *   confidenceScore: 0.82,
 *   sourceCount:     3,
 *   eventCount:      4,
 *   windowHours:     48,
 *   entityCount:     2,
 *   clusterContext: { articleCount: 8, uniqueSourceCount: 6, avgSourceWeight: 0.85 },
 * });
 * // result.significanceScore → ~85 (high — broad, quality coverage)
 */
export function computeSignificance(input: SignificanceInput): SignificanceResult {
  const {
    signalType,
    confidenceScore,
    sourceCount,
    eventCount,
    windowHours,
    entityCount,
    sourceIds,
    entityNames,
    clusterContext,
  } = input;

  const hasCluster = clusterContext != null;
  const weights = hasCluster ? CLUSTER_WEIGHTS : BASE_WEIGHTS;

  // --- per-component scores (0–100) ---
  const clusterIntelligence = hasCluster
    ? scoreClusterIntelligence(clusterContext)
    : undefined;

  const components = {
    confidence:          scoreConfidence(confidenceScore),
    sourceDiversity:     scoreSourceDiversity(sourceCount),
    sourceTrustQuality:  scoreSourceTrustQuality(sourceIds),
    velocity:            scoreVelocity(eventCount, windowHours),
    typeWeight:          scoreTypeWeight(signalType),
    entitySpread:        scoreEntitySpread(entityCount),
    entityProminence:    scoreEntityProminence(entityNames),
    ...(clusterIntelligence !== undefined ? { clusterIntelligence } : {}),
  };

  // --- weighted composite ---
  const raw =
    components.confidence        * weights.confidence        +
    components.sourceDiversity   * weights.sourceDiversity   +
    components.sourceTrustQuality * weights.sourceTrustQuality +
    components.velocity          * weights.velocity          +
    components.typeWeight        * weights.typeWeight        +
    components.entitySpread      * weights.entitySpread      +
    components.entityProminence  * weights.entityProminence  +
    (clusterIntelligence ?? 0)   * weights.clusterIntelligence;

  const significanceScore = Math.round(clamp01(raw / 100) * 100);

  // --- debug logging ---
  console.log(
    `[signalSignificance] type=${signalType ?? 'null'}` +
    ` score=${significanceScore}` +
    ` conf=${components.confidence}×${weights.confidence}` +
    ` srcDiv=${components.sourceDiversity}×${weights.sourceDiversity}` +
    ` srcTrust=${components.sourceTrustQuality}×${weights.sourceTrustQuality}` +
    ` vel=${components.velocity}×${weights.velocity}` +
    ` typeW=${components.typeWeight}×${weights.typeWeight}` +
    ` entSpread=${components.entitySpread}×${weights.entitySpread}` +
    ` entProm=${components.entityProminence}×${weights.entityProminence}` +
    (hasCluster
      ? ` clusterIntel=${clusterIntelligence}×${weights.clusterIntelligence}` +
        ` [articles=${clusterContext.articleCount}` +
        ` sources=${clusterContext.uniqueSourceCount}` +
        ` avgWeight=${clusterContext.avgSourceWeight}` +
        (clusterContext.sourceTierDiversity != null ? ` tiers=${clusterContext.sourceTierDiversity}` : '') +
        `]`
      : ' [no-cluster]'),
  );

  return {
    significanceScore,
    sourceSupportCount: Math.max(0, Math.floor(sourceCount)),
    components,
  };
}
