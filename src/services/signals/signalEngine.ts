/**
 * Omterminal — Signals Engine
 *
 * Transforms raw intelligence events into higher-order signals by detecting
 * patterns across multiple events within defined time windows.
 *
 * Signal types:
 *   CAPITAL_ACCELERATION  — ≥3 funding events within 14 days
 *   MODEL_RELEASE_WAVE    — ≥2 model_release events within 7 days
 *   REGULATION_ACTIVITY   — ≥2 regulation/policy events within 10 days
 *   RESEARCH_MOMENTUM     — ≥2 research_breakthrough events within 7 days
 *   COMPANY_EXPANSION     — ≥2 acquisition/partnership/product_launch/
 *                           company_strategy events within 10 days
 *
 * Pipeline position:
 *   RSS ingestion → normalization → event extraction → event store
 *   → signals engine → signal store
 */

import type { Event, Signal, SignalType, SignalDirection } from '@/types/intelligence';
import { type SignalMode, getModeConfig, DEFAULT_SIGNAL_MODE } from '@/lib/signals/signalModes';
import { computeSignificance, type ClusterContext } from '@/services/signals/signalSignificance';
import { computeSourceTrust } from '@/lib/sourceTrust';

// ─────────────────────────────────────────────────────────────────────────────
// Detection rule configuration
// ─────────────────────────────────────────────────────────────────────────────

interface DetectionRule {
  type: SignalType;
  /** Event types that count toward this signal */
  eventTypes: Event['type'][];
  /** Time window in milliseconds */
  windowMs: number;
  /** Minimum number of matching events to fire the signal */
  minCount: number;
  /** Directional implication for decision-makers */
  direction: SignalDirection;
}

const DETECTION_RULES: DetectionRule[] = [
  {
    type: 'CAPITAL_ACCELERATION',
    eventTypes: ['funding'],
    windowMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    minCount: 3,
    direction: 'bullish',
  },
  {
    type: 'MODEL_RELEASE_WAVE',
    eventTypes: ['model_release'],
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    minCount: 2,
    direction: 'bullish',
  },
  {
    type: 'REGULATION_ACTIVITY',
    eventTypes: ['regulation', 'policy'],
    windowMs: 10 * 24 * 60 * 60 * 1000, // 10 days
    minCount: 2,
    direction: 'neutral',
  },
  {
    type: 'RESEARCH_MOMENTUM',
    eventTypes: ['research_breakthrough'],
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    minCount: 2,
    direction: 'bullish',
  },
  {
    type: 'COMPANY_EXPANSION',
    eventTypes: ['acquisition', 'partnership', 'product_launch', 'company_strategy'],
    windowMs: 10 * 24 * 60 * 60 * 1000, // 10 days
    minCount: 2,
    direction: 'bullish',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic ID based on signal type + sorted supporting event IDs + date bucket.
 *
 * The date bucket (YYYY-MM-DD) ensures that detecting the same pattern on a
 * new day produces a new signal ID. Without it, the same event cluster would
 * generate the same signal ID indefinitely, and ON CONFLICT (id) DO NOTHING
 * would prevent any new signals from appearing in the database — causing the
 * "stale signals" problem where signals.created_at stops advancing.
 *
 * Within the same day, hourly cron runs still dedup correctly (same date =
 * same signal ID), preventing duplicate signals per day.
 */
function generateSignalId(type: string, eventIds: string[]): string {
  const dateBucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = type + ':' + dateBucket + ':' + [...eventIds].sort().join(',');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return `sig_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Find non-overlapping clusters of events within a sliding time window.
 * Returns groups where each group has at least `minCount` events spanning
 * no more than `windowMs` milliseconds from first to last event.
 *
 * Uses a greedy forward-scan: once a cluster is found starting at index i,
 * advances past all events consumed by that cluster.
 */
function findClusters(
  events: Event[],
  windowMs: number,
  minCount: number,
): Event[][] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const clusters: Event[][] = [];
  let start = 0;

  while (start < sorted.length) {
    const anchorTime = new Date(sorted[start].timestamp).getTime();

    // Collect all events within the window starting at this anchor
    const cluster: Event[] = [];
    for (let j = start; j < sorted.length; j++) {
      const t = new Date(sorted[j].timestamp).getTime();
      if (t - anchorTime <= windowMs) {
        cluster.push(sorted[j]);
      } else {
        break; // sorted, so no point checking further
      }
    }

    if (cluster.length >= minCount) {
      clusters.push(cluster);
      start += cluster.length; // advance past consumed events
    } else {
      start++;
    }
  }

  return clusters;
}

/**
 * Confidence Scoring Model v2 — Weighted Intelligence
 *
 * Six weighted factors combine to produce a confidence score that is
 * evidence-aware, recency-sensitive, and corroboration-driven.
 *
 *   Factor               Weight   What it measures
 *   ─────────────────────────────────────────────────────────────────
 *   Event Density         0.20    How far above detection threshold
 *   Event Recency         0.15    Freshness of events (exponential decay)
 *   Source Quality         0.15    Trust score of contributing sources
 *   Corroboration          0.25    Independent source confirmation ratio
 *   Entity Prominence      0.10    Major AI entity involvement
 *   Evidence Diversity     0.15    Variety across event types, sources, entities
 *
 * Score range: 0.35 (weakest valid cluster) – 0.95 (cap)
 *
 * Key improvements over v1:
 *   - Single-source clusters are heavily penalised (corroboration → ~0.27)
 *   - Old events decay the score (recency half-life ~7 days)
 *   - Source trust directly influences confidence (not just +0.02 boost)
 *   - Wider score spread enables meaningful read-path filtering
 */

/** Per-component breakdown for confidence scoring debug output. */
export interface ConfidenceBreakdown {
  eventDensity: number;
  eventRecency: number;
  sourceQuality: number;
  corroboration: number;
  entityProminence: number;
  evidenceDiversity: number;
  rawWeighted: number;
  final: number;
}

const CONFIDENCE_WEIGHTS = {
  eventDensity:      0.20,
  eventRecency:      0.15,
  sourceQuality:     0.15,
  corroboration:     0.25,
  entityProminence:  0.10,
  evidenceDiversity: 0.15,
} as const;

function computeConfidence(
  clusterSize: number,
  minCount: number,
  cluster: Event[],
): number {
  const breakdown = computeConfidenceWithBreakdown(clusterSize, minCount, cluster);
  return breakdown.final;
}

function computeConfidenceWithBreakdown(
  clusterSize: number,
  minCount: number,
  cluster: Event[],
): ConfidenceBreakdown {
  const w = CONFIDENCE_WEIGHTS;

  // ── Event Density: how far above detection threshold ──────────────────
  // Saturates at 3× minCount via diminishing returns (sqrt).
  const densityRatio = clusterSize / minCount;
  const eventDensity = Math.min(Math.sqrt(densityRatio) / Math.sqrt(3), 1.0);

  // ── Event Recency: exponential decay from now ─────────────────────────
  // Half-life ~7 days.  Events from last 24h ≈ 0.97, 7 days ≈ 0.50, 14 days ≈ 0.25.
  const now = Date.now();
  const ageDays = cluster.map(
    (e) => (now - new Date(e.timestamp).getTime()) / (24 * 60 * 60 * 1000),
  );
  const avgAgeDays = ageDays.reduce((s, a) => s + a, 0) / ageDays.length;
  const eventRecency = Math.exp(-0.693 * avgAgeDays / 7); // ln(2)/7 ≈ 0.099

  // ── Source Quality: average trust of unique contributing sources ───────
  const sourceNames = cluster
    .map((e) => e.sourceArticle?.source)
    .filter((s): s is string => !!s);
  const uniqueSources = [...new Set(sourceNames)];
  const avgTrust = uniqueSources.length > 0
    ? uniqueSources
        .map((s) => computeSourceTrust(s).trustScore)
        .reduce((a, b) => a + b, 0) / uniqueSources.length
    : 40; // unknown baseline
  const sourceQuality = avgTrust / 100;

  // ── Corroboration: independent source confirmation ────────────────────
  // Ratio of unique sources to total events.  1 source for 5 events = 0.2 → weak.
  // 5 sources for 5 events = 1.0 → strong.  Scaled so 67% unique ≈ max.
  const corroborationRatio = uniqueSources.length / Math.max(clusterSize, 1);
  const corroboration = Math.min(corroborationRatio * 1.5, 1.0);

  // ── Entity Prominence: major AI entity involvement ────────────────────
  const entities = [...new Set(cluster.map((e) => e.company))];
  const majorCount = entities.filter(isMajorEntity).length;
  const entityProminence = entities.length > 0
    ? Math.min(majorCount / Math.min(entities.length, 3), 1.0)
    : 0;

  // ── Evidence Diversity: variety across types, sources, entities ────────
  const eventTypes = new Set(cluster.map((e) => e.type));
  const evidenceDiversity =
    Math.min(eventTypes.size / 3, 1.0) * 0.33 +
    Math.min(uniqueSources.length / 4, 1.0) * 0.34 +
    Math.min(entities.length / 4, 1.0) * 0.33;

  // ── Weighted composite ────────────────────────────────────────────────
  const rawWeighted =
    eventDensity      * w.eventDensity +
    eventRecency      * w.eventRecency +
    sourceQuality     * w.sourceQuality +
    corroboration     * w.corroboration +
    entityProminence  * w.entityProminence +
    evidenceDiversity * w.evidenceDiversity;

  // Scale to 0.35–0.95 range.  Floor at 0.35 ensures no valid signal
  // gets near-zero confidence.  Cap at 0.95 preserves headroom.
  const scaled = 0.35 + rawWeighted * 0.60;
  const final = Math.min(Math.round(scaled * 100) / 100, 0.95);

  return {
    eventDensity:      Math.round(eventDensity * 100) / 100,
    eventRecency:      Math.round(eventRecency * 100) / 100,
    sourceQuality:     Math.round(sourceQuality * 100) / 100,
    corroboration:     Math.round(corroboration * 100) / 100,
    entityProminence:  Math.round(entityProminence * 100) / 100,
    evidenceDiversity: Math.round(evidenceDiversity * 100) / 100,
    rawWeighted:       Math.round(rawWeighted * 100) / 100,
    final,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity prominence — major AI entities receive differentiated treatment
// ─────────────────────────────────────────────────────────────────────────────

const MAJOR_ENTITIES = new Set([
  'openai', 'anthropic', 'google', 'google deepmind', 'deepmind', 'meta',
  'microsoft', 'nvidia', 'apple', 'amazon', 'aws', 'mistral', 'xai',
  'cohere', 'stability ai', 'hugging face', 'inflection', 'character ai',
  'databricks', 'snowflake', 'salesforce', 'oracle', 'ibm', 'samsung',
  'baidu', 'alibaba', 'tencent', 'bytedance',
]);

function isMajorEntity(name: string): boolean {
  return MAJOR_ENTITIES.has(name.toLowerCase().trim());
}

/** Extract the most prominent entities from a cluster, major ones first. */
function rankEntities(cluster: Event[]): string[] {
  const freq = new Map<string, number>();
  for (const e of cluster) {
    freq.set(e.company, (freq.get(e.company) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => {
      const aMajor = isMajorEntity(a[0]) ? 1 : 0;
      const bMajor = isMajorEntity(b[0]) ? 1 : 0;
      if (bMajor !== aMajor) return bMajor - aMajor;
      return b[1] - a[1]; // then by frequency
    })
    .map(([name]) => name);
}

/** Summarize event subtypes within a cluster (e.g. "2 acquisitions, 1 partnership"). */
function summarizeEventMix(cluster: Event[]): string {
  const counts = new Map<string, number>();
  for (const e of cluster) {
    const label = e.type.replace(/_/g, ' ');
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${type}${n > 1 ? 's' : ''}`)
    .join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// "Why This Matters" — deterministic intelligence layer
//
// Generates a concise strategic explanation for each signal type at write time.
// This runs synchronously without an LLM and provides immediate value even when
// the AI provider is unavailable.  The LLM-based generateSignalInsight will
// overwrite this with a more personalised version when it runs in the
// intelligence pipeline stage.
//
// Design constraints:
//   - 1–3 short sentences max
//   - Strategic, not descriptive (description already covers the facts)
//   - Covers impact on ecosystem, competition, regulation, or product direction
//   - Prioritises high-significance signals with stronger framing
// ─────────────────────────────────────────────────────────────────────────────

function buildWhyThisMatters(
  type: SignalType,
  cluster: Event[],
  significanceScore: number,
): string {
  const entities        = rankEntities(cluster);
  const topEntities     = entities.slice(0, 2).join(' and ');
  const hasMajor        = entities.some(isMajorEntity);
  const isHighSig       = significanceScore >= 70;

  switch (type) {
    case 'CAPITAL_ACCELERATION': {
      const scope  = hasMajor
        ? `major AI players including ${topEntities}`
        : topEntities;
      const impact = isHighSig
        ? `At this scale and velocity, capital concentration reshapes talent markets and sets competitive baselines that smaller players struggle to match.`
        : `Concentrated funding signals a shifting investor thesis and accelerated product timelines across the sector.`;
      return `${cluster.length} funding rounds flowing into ${scope} signal a demand surge in AI infrastructure or product development. ${impact}`;
    }

    case 'MODEL_RELEASE_WAVE': {
      const labCtx = hasMajor ? `from ${topEntities}` : `across ${topEntities}`;
      return (
        `${cluster.length} model releases ${labCtx} in rapid succession compress the adoption window for downstream builders. ` +
        (hasMajor
          ? `Releases at this pace from major labs trigger API pricing shifts and integration re-evaluations — teams that delay benchmarking risk locking in inferior capabilities.`
          : `Clustered releases raise the capability baseline, forcing product and infrastructure teams to reassess dependencies now.`)
      );
    }

    case 'REGULATION_ACTIVITY': {
      const target = hasMajor
        ? `targeting ${topEntities}`
        : `affecting ${topEntities}`;
      return (
        `${cluster.length} regulatory or policy actions ${target} signal that AI governance is moving from discussion to enforcement. ` +
        `Rules aimed at prominent players typically become industry-wide compliance templates — teams not directly named should review their exposure now.`
      );
    }

    case 'RESEARCH_MOMENTUM': {
      const src      = hasMajor ? `from ${topEntities}` : `across ${topEntities}`;
      const timeline = isHighSig ? `3–6 months` : `6–12 months`;
      return (
        `${cluster.length} research breakthroughs ${src} signal an accelerating capability frontier. ` +
        `Clustered output at this pace is a reliable leading indicator — production deployments typically follow within ${timeline}, forcing product and infra teams to reassess their roadmaps.`
      );
    }

    case 'COMPANY_EXPANSION': {
      const mix      = summarizeEventMix(cluster);
      const pressure = hasMajor
        ? `Expansion at this density from major players typically precipitates consolidation pressure and narrows partnership windows for smaller competitors.`
        : `Dense strategic activity from ${topEntities} signals an effort to lock in market position before a consolidation phase.`;
      return `${topEntities} executing ${mix} signals active market repositioning. ${pressure}`;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Title / description generators
// ─────────────────────────────────────────────────────────────────────────────

function buildTitle(type: SignalType, cluster: Event[]): string {
  const entities = rankEntities(cluster);
  const count = cluster.length;
  const topNames = entities.slice(0, 2).join(', ');
  const suffix = entities.length > 2 ? ` +${entities.length - 2} more` : '';

  switch (type) {
    case 'CAPITAL_ACCELERATION':
      return `${topNames}${suffix}: ${count} funding rounds signal capital acceleration`;
    case 'MODEL_RELEASE_WAVE':
      return `${topNames}${suffix}: ${count} model releases in rapid succession`;
    case 'REGULATION_ACTIVITY':
      return `Regulatory surge targeting ${topNames}${suffix} — ${count} policy actions`;
    case 'RESEARCH_MOMENTUM':
      return `Research breakthrough cluster: ${topNames}${suffix} — ${count} advances`;
    case 'COMPANY_EXPANSION':
      return `${topNames}${suffix} expanding: ${summarizeEventMix(cluster)}`;
  }
}

function buildDescription(type: SignalType, cluster: Event[], windowDays: number): string {
  const entities = rankEntities(cluster);
  const entitiesStr = entities.slice(0, 5).join(', ');
  const timestamps = cluster
    .map((e) => new Date(e.timestamp))
    .sort((a, b) => a.getTime() - b.getTime());
  const from = timestamps[0].toISOString().split('T')[0];
  const to = timestamps[timestamps.length - 1].toISOString().split('T')[0];

  // Extract concrete event details for specificity
  const eventTitles = cluster
    .map((e) => e.title)
    .filter(Boolean)
    .slice(0, 3);
  const detailSuffix = eventTitles.length > 0
    ? ` Key developments: ${eventTitles.join('; ')}.`
    : '';

  const majorCount = entities.filter(isMajorEntity).length;
  const majorNote = majorCount > 0
    ? ` Involves ${majorCount} major AI ${majorCount === 1 ? 'player' : 'players'}.`
    : '';

  switch (type) {
    case 'CAPITAL_ACCELERATION':
      return (
        `${cluster.length} funding events across ${entities.length} ` +
        `companies (${entitiesStr}) between ${from} and ${to} ` +
        `(${windowDays}-day window).${majorNote}${detailSuffix} ` +
        `Concentrated capital deployment at this velocity signals shifting investor thesis and competitive positioning.`
      );
    case 'MODEL_RELEASE_WAVE':
      return (
        `${cluster.length} model releases from ${entitiesStr} between ${from} and ${to} ` +
        `(${windowDays}-day window).${majorNote}${detailSuffix} ` +
        `Concurrent releases indicate an active capability race — downstream tool chains and integrations will need reassessment.`
      );
    case 'REGULATION_ACTIVITY':
      return (
        `${cluster.length} policy or regulatory actions between ${from} and ${to} ` +
        `(${windowDays}-day window) involving ${entitiesStr}.${majorNote}${detailSuffix} ` +
        `Clustered regulatory moves can rapidly redefine compliance baselines and market access.`
      );
    case 'RESEARCH_MOMENTUM':
      return (
        `${cluster.length} research breakthroughs from ${entitiesStr} between ${from} and ${to} ` +
        `(${windowDays}-day window).${majorNote}${detailSuffix} ` +
        `Clustered research output is a leading indicator of near-term capability shifts and product announcements.`
      );
    case 'COMPANY_EXPANSION':
      return (
        `${cluster.length} strategic moves (${summarizeEventMix(cluster)}) across ` +
        `${entitiesStr} between ${from} and ${to} (${windowDays}-day window).${majorNote}${detailSuffix} ` +
        `This pattern signals active market positioning and potential consolidation pressure.`
      );
  }
}

function buildRecommendation(type: SignalType, cluster: Event[]): string {
  const entities = rankEntities(cluster);
  const topEntity = entities[0] ?? 'key players';
  const hasMajor = entities.some(isMajorEntity);

  switch (type) {
    case 'CAPITAL_ACCELERATION':
      return hasMajor
        ? `Track ${topEntity}'s funding trajectory and investor composition. Capital at this scale reshapes competitive dynamics — assess exposure to funded competitors and potential partnership leverage.`
        : `Monitor emerging capital flows into ${topEntity} and peers. Early-stage acceleration in this segment may signal product launches or talent acquisition waves within 6–12 months.`;
    case 'MODEL_RELEASE_WAVE':
      return hasMajor
        ? `Benchmark ${topEntity}'s new releases against your current stack. Rapid releases from major labs compress adoption windows — evaluate integration timelines and API migration costs now.`
        : `Evaluate whether ${topEntity}'s releases change the capability baseline in your domain. Clustered releases often trigger downstream tooling updates and pricing shifts.`;
    case 'REGULATION_ACTIVITY':
      return hasMajor
        ? `Regulations targeting ${topEntity} frequently set precedents. Review compliance posture, engage legal counsel, and assess whether new obligations apply to your own AI deployments.`
        : `Monitor how policy actions affecting ${topEntity} may cascade. Regulatory clusters often expand scope — prepare for tighter compliance requirements in adjacent areas.`;
    case 'RESEARCH_MOMENTUM':
      return hasMajor
        ? `${topEntity}'s research output is accelerating. Align R&D priorities with emerging capability shifts — breakthroughs at this velocity typically reach production within 3–6 months.`
        : `Track research outputs from ${topEntity} for productisation signals. Clustered breakthroughs indicate a transition from exploration to deployment readiness.`;
    case 'COMPANY_EXPANSION':
      return hasMajor
        ? `${topEntity}'s expansion moves signal strategic repositioning. Assess competitive implications — acquisitions and partnerships at this pace often indicate market consolidation.`
        : `Monitor ${topEntity}'s expansion pattern for partnership or acquisition opportunities. Strategic moves clustering this densely suggest the market window for positioning is narrowing.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster-context derivation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive story-cluster metadata from a raw event cluster.
 *
 * Since events carry only source names (not tier/weight from the DB), we
 * infer source quality from computeSourceTrust() and map trust scores to
 * the standard tier weights (1.0 / 0.7 / 0.4).
 *
 * This keeps computeSignificance as a pure function (no DB calls here).
 */
function deriveClusterContext(cluster: Event[]): ClusterContext {
  const sources = cluster
    .map((e) => e.sourceArticle?.source)
    .filter((s): s is string => !!s);

  const uniqueSources = [...new Set(sources)];
  const uniqueSourceCount = Math.max(uniqueSources.length, 1);

  // Map each unique source name → tier weight via trust scoring.
  const tierWeights = uniqueSources.map((src) => {
    const { trustScore } = computeSourceTrust(src);
    if (trustScore >= 85) return 1.0; // Tier 1: official / government / primary
    if (trustScore >= 70) return 0.7; // Tier 2: major media / well-known publications
    return 0.4;                       // Tier 3: community, aggregators, unknown
  });

  const avgSourceWeight =
    tierWeights.length > 0
      ? Math.round((tierWeights.reduce((s, w) => s + w, 0) / tierWeights.length) * 1000) / 1000
      : 0.7; // default tier 2 when no source info is available

  // Count distinct tiers present in this cluster (1–3).
  const tierSet = new Set(tierWeights.map((w) => (w >= 1.0 ? 1 : w >= 0.7 ? 2 : 3)));

  return {
    articleCount: cluster.length,
    uniqueSourceCount,
    avgSourceWeight,
    sourceTierDiversity: tierSet.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-signal deduplication within a single run
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove near-duplicate signals produced in the same generation run.
 * Two signals are considered duplicates if they share the same type AND
 * have ≥50% entity overlap.  Keeps the higher-confidence signal.
 */
function deduplicateSignals(signals: Signal[]): Signal[] {
  if (signals.length <= 1) return signals;

  const result: Signal[] = [];

  for (const candidate of signals) {
    const isDuplicate = result.some((existing) => {
      if (existing.type !== candidate.type) return false;
      const aEntities = new Set(existing.affectedEntities ?? []);
      const bEntities = candidate.affectedEntities ?? [];
      if (aEntities.size === 0 && bEntities.length === 0) return false;
      const overlap = bEntities.filter((e) => aEntities.has(e)).length;
      const minSize = Math.min(aEntities.size, bEntities.length);
      return minSize > 0 && overlap / minSize >= 0.5;
    });

    if (!isDuplicate) {
      result.push(candidate);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the signals engine against an array of events.
 *
 * Applies each detection rule, finds qualifying event clusters, and returns
 * a Signal for every cluster that meets the threshold.  Signal IDs are
 * deterministic — re-running with the same events produces the same IDs,
 * enabling idempotent upserts downstream.
 *
 * The optional `mode` parameter adjusts the detection sensitivity via each
 * rule's engineMinCountMultiplier from the SignalModeConfig:
 *   raw      — multiplier 0.5 → lower cluster thresholds → more signals
 *   standard — multiplier 1.0 → default thresholds (unchanged behaviour)
 *   premium  — multiplier 1.0 → same generation as standard; stricter
 *              filtering is applied on the read path, not here
 *
 * @param events  Array of intelligence events (any recency).
 * @param mode    Signal quality mode for generation sensitivity (default: 'standard').
 * @returns       Array of generated Signals, ready for persistence.
 */
export function generateSignalsFromEvents(
  events: Event[],
  mode: SignalMode = DEFAULT_SIGNAL_MODE,
): Signal[] {
  if (events.length === 0) return [];

  const modeConfig = getModeConfig(mode);
  const multiplier = modeConfig.engineMinCountMultiplier;

  const signals: Signal[] = [];
  const now = new Date().toISOString();

  for (const rule of DETECTION_RULES) {
    // Apply mode-specific minCount: clamp to minimum of 1.
    const effectiveMinCount = Math.max(1, Math.floor(rule.minCount * multiplier));

    // Filter events matching this rule's event types
    const matching = events.filter((e) =>
      (rule.eventTypes as string[]).includes(e.type),
    );

    if (matching.length < effectiveMinCount) continue;

    // Find non-overlapping clusters within the time window
    const clusters = findClusters(matching, rule.windowMs, effectiveMinCount);
    const windowDays = Math.round(rule.windowMs / (24 * 60 * 60 * 1000));

    for (const cluster of clusters) {
      const eventIds = cluster.map((e) => e.id);
      const confidenceBreakdown = computeConfidenceWithBreakdown(cluster.length, effectiveMinCount, cluster);
      const confidence = confidenceBreakdown.final;
      const affectedEntities = [...new Set(cluster.map((e) => e.company))];

      // Extract unique source names for source trust scoring in significance.
      const sourceNames = cluster
        .map((e) => e.sourceArticle?.source)
        .filter((s): s is string => !!s);
      const uniqueSourceNames = [...new Set(sourceNames)];

      // Derive cluster-level metadata from the event cluster and compute significance.
      const clusterContext = deriveClusterContext(cluster);

      // Compute event recency for significance (avg age in hours from now).
      const nowMs = Date.now();
      const avgAgeHours = cluster.reduce(
        (sum, e) => sum + (nowMs - new Date(e.timestamp).getTime()) / (1000 * 60 * 60), 0,
      ) / cluster.length;

      const sig = computeSignificance({
        signalType:      rule.type,
        confidenceScore: confidence,
        sourceCount:     clusterContext.uniqueSourceCount,
        eventCount:      cluster.length,
        windowHours:     rule.windowMs / (1000 * 60 * 60),
        entityCount:     affectedEntities.length,
        entityNames:     affectedEntities,
        sourceIds:       uniqueSourceNames,
        clusterContext,
        avgEventAgeHours: avgAgeHours,
      });

      // Debug: log confidence breakdown per signal
      console.log(
        `[signalEngine] confidence type=${rule.type}` +
        ` density=${confidenceBreakdown.eventDensity}` +
        ` recency=${confidenceBreakdown.eventRecency}` +
        ` srcQuality=${confidenceBreakdown.sourceQuality}` +
        ` corroboration=${confidenceBreakdown.corroboration}` +
        ` entityProm=${confidenceBreakdown.entityProminence}` +
        ` diversity=${confidenceBreakdown.evidenceDiversity}` +
        ` raw=${confidenceBreakdown.rawWeighted}` +
        ` final=${confidence}`,
      );

      const whyThisMatters = buildWhyThisMatters(rule.type, cluster, sig.significanceScore);

      const signal: Signal = {
        id: generateSignalId(rule.type, eventIds),
        type: rule.type,
        title: buildTitle(rule.type, cluster),
        description: buildDescription(rule.type, cluster, windowDays),
        supportingEvents: eventIds,
        confidenceScore: confidence,
        direction: rule.direction,
        affectedEntities,
        recommendation: buildRecommendation(rule.type, cluster),
        createdAt: now,
        humanVerified: false,
        significanceScore:  sig.significanceScore,
        sourceSupportCount: sig.sourceSupportCount,
        whyThisMatters,
      };

      signals.push(signal);
    }
  }

  // Deduplicate near-identical signals (same type + high entity overlap)
  const deduped = deduplicateSignals(signals);

  // Sort by confidence descending so highest-quality signals come first
  deduped.sort((a, b) => b.confidenceScore - a.confidenceScore);

  console.log(`[signalEngine] mode=${mode} multiplier=${multiplier} detected=${signals.length} deduped=${deduped.length} from ${events.length} events`);
  return deduped;
}
