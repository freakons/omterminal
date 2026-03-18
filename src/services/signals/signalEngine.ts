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
 * Confidence score for a cluster.
 * Scales linearly between minCount (→ 0.60) and 2×minCount (→ 0.92),
 * capped at 0.95.  Signals involving major AI entities and multiple
 * distinct sources receive a small boost.
 */
function computeConfidence(clusterSize: number, minCount: number, cluster: Event[]): number {
  const ratio = clusterSize / (minCount * 2);
  let raw = 0.60 + ratio * 0.35;

  // Entity prominence boost: +0.03 per major entity (max +0.09)
  const entities = [...new Set(cluster.map((e) => e.company))];
  const majorCount = entities.filter(isMajorEntity).length;
  raw += Math.min(majorCount * 0.03, 0.09);

  // Source diversity boost: +0.02 per distinct source beyond the first (max +0.06)
  const sources = new Set(cluster.map((e) => e.sourceArticle?.source).filter(Boolean));
  raw += Math.min(Math.max(sources.size - 1, 0) * 0.02, 0.06);

  return Math.min(Math.round(raw * 100) / 100, 0.95);
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
      const confidence = computeConfidence(cluster.length, effectiveMinCount, cluster);
      const affectedEntities = [...new Set(cluster.map((e) => e.company))];

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
