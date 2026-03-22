/**
 * Omterminal — Source Scoring & State Engine
 *
 * Evaluates source quality continuously using metrics from source_health.
 * Assigns each source a bounded score (0-100) and an operational state.
 *
 * ── Scoring Formula ──────────────────────────────────────────────────────────
 *
 *   source_score = weighted sum of 6 components:
 *
 *   Component              Weight   Input                           Range
 *   ───────────────────    ──────   ─────────────────────────────   ─────
 *   Fetch success rate      20%     total_successes / total_fetches  0-1
 *   Article insertion rate  20%     total_inserted / total_fetched   0-1
 *   Duplicate penalty       15%     1 - (duplicates / fetched)       0-1
 *   Signal yield             15%     signals_contributed / inserted   0-1 (capped)
 *   Avg significance        15%     avg_significance_score / 100     0-1
 *   Recency / freshness     15%     decay from last_article_inserted 0-1
 *
 *   Final score is clamped to [0, 100].
 *
 * ── Source States ────────────────────────────────────────────────────────────
 *
 *   State             Score Range   Behavior
 *   ─────────────     ───────────   ──────────────────────────────────────
 *   promote           80-100        High-quality source, eligible for priority
 *   stable            50-79         Normal operation
 *   watch             30-49         Degraded — monitor closely
 *   probation         15-29         Poor quality — throttle recommended
 *   throttle          5-14          Very poor — reduce fetch frequency
 *   prune_candidate   0-4           Candidate for removal
 *   disabled          n/a           Auto-disabled by the system
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 *
 *   - Manual override: if manual_override_state is set, the source keeps
 *     that state regardless of score. Score is still calculated for visibility.
 *   - Auto-disable requires consecutive_low_score_runs >= threshold (default 5).
 *   - Auto-disable is reversible: operators can clear it via manual override.
 *   - First rollout: score + state are calculated and persisted.
 *     Only light automatic actions (watch/throttle) are applied.
 *     Full auto-disable requires the source to be in prune_candidate
 *     state for 5+ consecutive scoring runs.
 */

import { dbQuery } from '@/db/client';
import { getSourceById } from '@/config/sources/index';

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum total fetches before a source is scored (avoid noisy early scores) */
const MIN_FETCHES_FOR_SCORING = 3;

/** Hours before freshness starts decaying */
const FRESHNESS_FULL_HOURS = 12;

/** Hours at which freshness reaches 0 */
const FRESHNESS_ZERO_HOURS = 168; // 7 days

/** Consecutive low-score runs before auto-disable is considered */
const AUTO_DISABLE_THRESHOLD = 5;

/** Score at or below which a source enters prune_candidate */
const PRUNE_SCORE_THRESHOLD = 4;

/** Score at or below which consecutive_low_score_runs increments */
const LOW_SCORE_THRESHOLD = 14;

// ── Types ────────────────────────────────────────────────────────────────────

export type SourceState =
  | 'promote'
  | 'stable'
  | 'watch'
  | 'probation'
  | 'throttle'
  | 'prune_candidate'
  | 'disabled';

export interface SourceScoreBreakdown {
  sourceId: string;
  sourceName: string;
  sourceScore: number;
  sourceState: SourceState;
  previousState: string | null;
  manualOverride: boolean;
  components: {
    fetchSuccessRate: number;     // 0-100 (weighted contribution)
    articleInsertRate: number;    // 0-100
    duplicatePenalty: number;     // 0-100
    signalYield: number;         // 0-100
    avgSignificance: number;     // 0-100
    freshness: number;           // 0-100
  };
  rawMetrics: {
    totalFetches: number;
    totalSuccesses: number;
    totalArticlesFetched: number;
    totalArticlesInserted: number;
    totalDuplicatesDropped: number;
    totalSignalsContributed: number;
    avgSignificanceScore: number;
    lastArticleInsertedAt: string | null;
    consecutiveLowScoreRuns: number;
  };
  autoDisabled: boolean;
  autoDisableReason: string | null;
}

export interface ScoringRunResult {
  sourcesScored: number;
  sourcesSkipped: number;
  stateChanges: Array<{
    sourceId: string;
    from: string;
    to: string;
  }>;
  autoDisabled: string[];
  summary: {
    promote: number;
    stable: number;
    watch: number;
    probation: number;
    throttle: number;
    prune_candidate: number;
    disabled: number;
    avgScore: number;
  };
}

// ── Row type from DB ─────────────────────────────────────────────────────────

interface SourceHealthRow {
  source_id: string;
  total_fetches: number;
  total_successes: number;
  total_failures: number;
  total_articles_fetched: number;
  total_articles_inserted: number;
  total_duplicates_dropped: number;
  total_signals_contributed: number;
  avg_significance_score: number;
  last_article_inserted_at: string | null;
  source_score: number | null;
  source_state: string | null;
  consecutive_low_score_runs: number;
  auto_disabled: boolean;
  auto_disabled_at: string | null;
  auto_disable_reason: string | null;
  manual_override_state: string | null;
  manual_override_note: string | null;
}

// ── Scoring Functions ────────────────────────────────────────────────────────

/**
 * Calculate freshness score based on time since last article insertion.
 * Returns 1.0 if within FRESHNESS_FULL_HOURS, decays linearly to 0
 * at FRESHNESS_ZERO_HOURS, returns 0 if no insertion timestamp.
 */
function calculateFreshness(lastInsertedAt: string | null): number {
  if (!lastInsertedAt) return 0;

  const hoursSince = (Date.now() - new Date(lastInsertedAt).getTime()) / 3_600_000;

  if (hoursSince <= FRESHNESS_FULL_HOURS) return 1.0;
  if (hoursSince >= FRESHNESS_ZERO_HOURS) return 0.0;

  return 1.0 - (hoursSince - FRESHNESS_FULL_HOURS) / (FRESHNESS_ZERO_HOURS - FRESHNESS_FULL_HOURS);
}

/**
 * Compute the composite source score (0-100).
 *
 * Each component is normalized to [0, 1] and multiplied by its weight.
 * The sum of all weights = 100, so the result is already on a 0-100 scale.
 */
function computeSourceScore(row: SourceHealthRow): {
  score: number;
  components: SourceScoreBreakdown['components'];
} {
  const totalFetches = Math.max(row.total_fetches, 1);
  const totalFetched = Math.max(row.total_articles_fetched, 1);
  const totalInserted = row.total_articles_inserted || 0;

  // Component 1: Fetch success rate (weight: 20)
  const successRate = (row.total_successes || 0) / totalFetches;

  // Component 2: Article insertion rate (weight: 20)
  const insertRate = totalInserted / totalFetched;

  // Component 3: Duplicate penalty — inverted (weight: 15)
  // High duplicates = low score. 1 - dupRate rewards uniqueness.
  const dupRate = (row.total_duplicates_dropped || 0) / totalFetched;
  const uniquenessScore = 1 - dupRate;

  // Component 4: Signal yield (weight: 15)
  // How many signals did this source contribute relative to articles inserted?
  // Capped at 1.0 — a source that yields 1 signal per article is already excellent.
  const signalYield = totalInserted > 0
    ? Math.min((row.total_signals_contributed || 0) / totalInserted, 1.0)
    : 0;

  // Component 5: Average significance (weight: 15)
  // avg_significance_score is on a 0-100 scale, normalize to 0-1.
  const significance = Math.min((row.avg_significance_score || 0) / 100, 1.0);

  // Component 6: Freshness (weight: 15)
  const freshness = calculateFreshness(row.last_article_inserted_at);

  // Weighted sum — weights total 100 so result is 0-100
  const raw =
    successRate * 20 +
    insertRate * 20 +
    uniquenessScore * 15 +
    signalYield * 15 +
    significance * 15 +
    freshness * 15;

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  return {
    score,
    components: {
      fetchSuccessRate: Math.round(successRate * 20 * 10) / 10,
      articleInsertRate: Math.round(insertRate * 20 * 10) / 10,
      duplicatePenalty: Math.round(uniquenessScore * 15 * 10) / 10,
      signalYield: Math.round(signalYield * 15 * 10) / 10,
      avgSignificance: Math.round(significance * 15 * 10) / 10,
      freshness: Math.round(freshness * 15 * 10) / 10,
    },
  };
}

/**
 * Derive source state from score.
 */
function deriveState(score: number): SourceState {
  if (score >= 80) return 'promote';
  if (score >= 50) return 'stable';
  if (score >= 30) return 'watch';
  if (score >= 15) return 'probation';
  if (score >= 5)  return 'throttle';
  return 'prune_candidate';
}

// ── Main Scoring Run ─────────────────────────────────────────────────────────

/**
 * Run the source scoring engine across all tracked sources.
 *
 * For each source in source_health:
 *   1. Skip if fewer than MIN_FETCHES_FOR_SCORING total fetches
 *   2. Compute score (0-100) from weighted metrics
 *   3. Derive state from score
 *   4. Respect manual_override_state if set
 *   5. Track consecutive low-score runs
 *   6. Auto-disable only if prune_candidate for AUTO_DISABLE_THRESHOLD runs
 *      AND source is not manually protected
 *   7. Persist score, state, cached rates, and timestamps
 *
 * Returns a structured result for logging and API responses.
 */
export async function runSourceScoring(): Promise<ScoringRunResult> {
  const rows = await dbQuery<SourceHealthRow>`
    SELECT
      source_id,
      COALESCE(total_fetches, 0) as total_fetches,
      COALESCE(total_successes, 0) as total_successes,
      COALESCE(total_failures, 0) as total_failures,
      COALESCE(total_articles_fetched, 0) as total_articles_fetched,
      COALESCE(total_articles_inserted, 0) as total_articles_inserted,
      COALESCE(total_duplicates_dropped, 0) as total_duplicates_dropped,
      COALESCE(total_signals_contributed, 0) as total_signals_contributed,
      COALESCE(avg_significance_score, 0) as avg_significance_score,
      last_article_inserted_at,
      source_score,
      source_state,
      COALESCE(consecutive_low_score_runs, 0) as consecutive_low_score_runs,
      COALESCE(auto_disabled, false) as auto_disabled,
      auto_disabled_at,
      auto_disable_reason,
      manual_override_state,
      manual_override_note
    FROM source_health
  `;

  const result: ScoringRunResult = {
    sourcesScored: 0,
    sourcesSkipped: 0,
    stateChanges: [],
    autoDisabled: [],
    summary: {
      promote: 0,
      stable: 0,
      watch: 0,
      probation: 0,
      throttle: 0,
      prune_candidate: 0,
      disabled: 0,
      avgScore: 0,
    },
  };

  let totalScore = 0;

  for (const row of rows) {
    // Skip sources with too few data points
    if (row.total_fetches < MIN_FETCHES_FOR_SCORING) {
      result.sourcesSkipped++;
      continue;
    }

    // Compute score and derive state
    const { score, components } = computeSourceScore(row);
    let state = deriveState(score);
    const previousState = row.source_state;

    // Track consecutive low-score runs
    let consecutiveLow = row.consecutive_low_score_runs;
    if (score <= LOW_SCORE_THRESHOLD) {
      consecutiveLow++;
    } else {
      consecutiveLow = 0;
    }

    // Respect manual override
    const hasManualOverride = !!row.manual_override_state;
    if (hasManualOverride) {
      state = row.manual_override_state as SourceState;
    }

    // Auto-disable logic (only for non-overridden prune_candidates)
    let autoDisabled = row.auto_disabled;
    let autoDisabledAt = row.auto_disabled_at;
    let autoDisableReason = row.auto_disable_reason;

    if (
      !hasManualOverride &&
      state === 'prune_candidate' &&
      consecutiveLow >= AUTO_DISABLE_THRESHOLD &&
      !autoDisabled
    ) {
      // Check if source is protected (high-reliability sources are protected)
      const sourceDef = getSourceById(row.source_id);
      const isProtected = sourceDef && sourceDef.reliability >= 8;

      if (!isProtected) {
        autoDisabled = true;
        autoDisabledAt = new Date().toISOString();
        autoDisableReason = `Auto-disabled: score ${score}/100 for ${consecutiveLow} consecutive runs`;
        state = 'disabled';
        result.autoDisabled.push(row.source_id);
        console.warn(
          `[sourceScoring] AUTO-DISABLED source="${row.source_id}" ` +
          `score=${score} consecutiveLow=${consecutiveLow}`
        );
      }
    }

    // If already auto-disabled and no manual override, keep disabled state
    if (autoDisabled && !hasManualOverride) {
      state = 'disabled';
    }

    // Cached rates for easy querying
    const totalFetched = Math.max(row.total_articles_fetched, 1);
    const totalInserted = row.total_articles_inserted || 0;
    const dupRate = (row.total_duplicates_dropped || 0) / totalFetched;
    const insertRate = totalInserted / totalFetched;
    const signalRate = totalInserted > 0
      ? Math.min((row.total_signals_contributed || 0) / totalInserted, 1.0)
      : 0;

    // Persist
    try {
      await dbQuery`
        UPDATE source_health SET
          source_score = ${score},
          source_state = ${state},
          score_updated_at = NOW(),
          consecutive_low_score_runs = ${consecutiveLow},
          duplicate_rate = ${Math.round(dupRate * 10000) / 10000},
          signal_yield_rate = ${Math.round(signalRate * 10000) / 10000},
          article_insert_rate = ${Math.round(insertRate * 10000) / 10000},
          auto_disabled = ${autoDisabled},
          auto_disabled_at = ${autoDisabledAt},
          auto_disable_reason = ${autoDisableReason}
        WHERE source_id = ${row.source_id}
      `;
    } catch (err) {
      console.warn(`[sourceScoring] Failed to persist score for source="${row.source_id}":`, err);
      continue;
    }

    // Track state changes
    if (previousState && previousState !== state) {
      result.stateChanges.push({
        sourceId: row.source_id,
        from: previousState,
        to: state,
      });
    }

    // Update summary counts
    result.summary[state as keyof typeof result.summary] =
      (result.summary[state as keyof typeof result.summary] as number) + 1;
    totalScore += score;
    result.sourcesScored++;
  }

  result.summary.avgScore = result.sourcesScored > 0
    ? Math.round(totalScore / result.sourcesScored)
    : 0;

  console.log(
    `[sourceScoring] Scored ${result.sourcesScored} sources (${result.sourcesSkipped} skipped). ` +
    `Avg score: ${result.summary.avgScore}. ` +
    `States: promote=${result.summary.promote} stable=${result.summary.stable} ` +
    `watch=${result.summary.watch} probation=${result.summary.probation} ` +
    `throttle=${result.summary.throttle} prune=${result.summary.prune_candidate} ` +
    `disabled=${result.summary.disabled}. ` +
    `Changes: ${result.stateChanges.length}. Auto-disabled: ${result.autoDisabled.length}.`
  );

  return result;
}

// ── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Get detailed score breakdowns for all scored sources.
 * Used by the API to expose score details.
 */
export async function getSourceScoreBreakdowns(): Promise<SourceScoreBreakdown[]> {
  const rows = await dbQuery<SourceHealthRow>`
    SELECT
      source_id,
      COALESCE(total_fetches, 0) as total_fetches,
      COALESCE(total_successes, 0) as total_successes,
      COALESCE(total_failures, 0) as total_failures,
      COALESCE(total_articles_fetched, 0) as total_articles_fetched,
      COALESCE(total_articles_inserted, 0) as total_articles_inserted,
      COALESCE(total_duplicates_dropped, 0) as total_duplicates_dropped,
      COALESCE(total_signals_contributed, 0) as total_signals_contributed,
      COALESCE(avg_significance_score, 0) as avg_significance_score,
      last_article_inserted_at,
      source_score,
      source_state,
      COALESCE(consecutive_low_score_runs, 0) as consecutive_low_score_runs,
      COALESCE(auto_disabled, false) as auto_disabled,
      auto_disabled_at,
      auto_disable_reason,
      manual_override_state,
      manual_override_note
    FROM source_health
    WHERE source_score IS NOT NULL
    ORDER BY source_score DESC
  `;

  return rows.map((row) => {
    const sourceDef = getSourceById(row.source_id);
    const { score, components } = computeSourceScore(row);

    return {
      sourceId: row.source_id,
      sourceName: sourceDef?.name ?? row.source_id,
      sourceScore: row.source_score ?? score,
      sourceState: (row.source_state ?? deriveState(score)) as SourceState,
      previousState: row.source_state,
      manualOverride: !!row.manual_override_state,
      components,
      rawMetrics: {
        totalFetches: row.total_fetches,
        totalSuccesses: row.total_successes,
        totalArticlesFetched: row.total_articles_fetched,
        totalArticlesInserted: row.total_articles_inserted,
        totalDuplicatesDropped: row.total_duplicates_dropped,
        totalSignalsContributed: row.total_signals_contributed,
        avgSignificanceScore: row.avg_significance_score,
        lastArticleInsertedAt: row.last_article_inserted_at,
        consecutiveLowScoreRuns: row.consecutive_low_score_runs,
      },
      autoDisabled: row.auto_disabled,
      autoDisableReason: row.auto_disable_reason,
    };
  });
}

/**
 * Set a manual override state for a source.
 * This prevents the scoring engine from changing the source's state.
 */
export async function setManualOverride(
  sourceId: string,
  state: SourceState | null,
  note?: string,
): Promise<void> {
  if (state === null) {
    // Clear override
    await dbQuery`
      UPDATE source_health SET
        manual_override_state = NULL,
        manual_override_note = NULL,
        auto_disabled = FALSE,
        auto_disabled_at = NULL,
        auto_disable_reason = NULL
      WHERE source_id = ${sourceId}
    `;
  } else {
    await dbQuery`
      UPDATE source_health SET
        manual_override_state = ${state},
        manual_override_note = ${note ?? null},
        auto_disabled = ${state === 'disabled'},
        auto_disabled_at = ${state === 'disabled' ? new Date().toISOString() : null},
        auto_disable_reason = ${state === 'disabled' ? (note ?? 'Manual disable') : null}
      WHERE source_id = ${sourceId}
    `;
  }
}
