/**
 * Omterminal — Signal Ranking Engine
 *
 * Combines intelligence_score, trust_score, source reliability, entity weight,
 * and velocity into a single normalized importance score (0–100).
 */

import { getSourceById } from '@/config/intelligenceSources';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RankedSignal {
  /** Processed intelligence quality score (0–100) */
  intelligence_score: number;
  /** Trust/confidence score derived from source verification (0–100) */
  trust_score: number;
  /** Source identifier — looked up in intelligenceSources registry */
  source: string;
  /** Number of distinct entities associated with this signal */
  entity_count: number;
  /** ISO 8601 timestamp of signal creation */
  created_at: string;
  /** Entity names for velocity cross-referencing */
  entities?: string[];
}

export interface RankingResult {
  /** Unified importance score clamped to 0–100 */
  importance_score: number;
  /** Velocity score (0–100) reflecting how many co-entity signals appeared recently */
  velocity_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D  =  7 * 24 * 60 * 60 * 1000;

/** Signals per 24 h that map to 100 % of the 24 h velocity contribution */
const VELOCITY_24H_SATURATION = 3;
/** Signals per 7 d that map to 100 % of the 7 d velocity contribution */
const VELOCITY_7D_SATURATION  = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a unified importance score for a single signal.
 *
 * @param signal      - The signal to score.
 * @param allSignals  - Full signal set used for velocity computation.
 *                      Pass an empty array (default) when no context is available.
 * @returns           { importance_score, velocity_score } both clamped to 0–100.
 */
export function computeSignalImportance(
  signal: RankedSignal,
  allSignals: RankedSignal[] = [],
): RankingResult {

  // 1. Source reliability — normalised to 0–100
  //    intelligenceSources reliabilityScore is 1–10; scale to 0–100.
  //    Unknown sources default to 50 (mid-range).
  const sourceEntry = getSourceById(signal.source);
  const source_reliability = sourceEntry?.reliabilityScore != null
    ? (sourceEntry.reliabilityScore / 10) * 100
    : 50;

  // 2. Entity weight — spec: min(entity_count, 5) * 5  →  range 0–25
  const entity_weight = Math.min(signal.entity_count, 5) * 5;

  // 3. Velocity score — co-occurring signals within 24 h and 7 d
  const signalEntities = signal.entities ?? [];
  const signalTime     = new Date(signal.created_at).getTime();

  let count24h = 0;
  let count7d  = 0;

  if (signalEntities.length > 0) {
    for (const other of allSignals) {
      if (other === signal) continue;

      const otherEntities = other.entities ?? [];
      const sharesEntity  = signalEntities.some((e) => otherEntities.includes(e));
      if (!sharesEntity) continue;

      const ageDiff = Math.abs(signalTime - new Date(other.created_at).getTime());
      if (ageDiff <= MS_24H) count24h++;
      if (ageDiff <= MS_7D)  count7d++;
    }
  }

  // Weighted combination: 60 % weight to 24 h density, 40 % to 7 d density
  const velocity_score = Math.min(
    (count24h / VELOCITY_24H_SATURATION) * 60 +
    (count7d  / VELOCITY_7D_SATURATION)  * 40,
    100,
  );

  // 4. Composite importance score
  const raw_importance =
    signal.intelligence_score * 0.35 +
    signal.trust_score        * 0.20 +
    source_reliability        * 0.15 +
    entity_weight             * 0.10 +
    velocity_score            * 0.20;

  const importance_score = Math.min(Math.max(raw_importance, 0), 100);

  return { importance_score, velocity_score };
}
