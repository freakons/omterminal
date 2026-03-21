/**
 * Omterminal — Source Health Tracker
 *
 * Records per-source ingestion outcomes to the source_health table.
 * Called by rssIngester after each source fetch — success or failure.
 *
 * Uses upsert (INSERT … ON CONFLICT DO UPDATE) so the first fetch for
 * any source automatically creates its tracking row.
 *
 * Tracks both per-fetch snapshot metrics (articles_fetched, failure_count)
 * and cumulative lifetime metrics (total_articles_inserted, total_duplicates_dropped,
 * total_events_generated, avg_significance_score) for source quality ranking.
 *
 * Errors are intentionally swallowed: tracking failures must never
 * abort or degrade the ingestion pipeline.
 */

import { dbQuery } from '@/db/client';

// Maximum length for stored error messages
const MAX_ERROR_LENGTH = 500;

/**
 * Per-source outcome from a single pipeline run.
 * Passed by the ingester after processing all articles from one source.
 */
export interface SourceRunOutcome {
  articlesFetched: number;
  articlesInserted: number;
  duplicatesDropped: number;
  eventsGenerated: number;
}

/**
 * Record a successful source fetch with detailed outcome metrics.
 *
 * Resets failure_count to 0, updates last_success_at,
 * and accumulates lifetime quality metrics.
 */
export async function trackSourceSuccess(
  sourceId: string,
  articleCount: number,
  outcome?: SourceRunOutcome,
): Promise<void> {
  try {
    const inserted = outcome?.articlesInserted ?? 0;
    const dupes = outcome?.duplicatesDropped ?? 0;
    const events = outcome?.eventsGenerated ?? 0;

    await dbQuery`
      INSERT INTO source_health (
        id, source_id, last_success_at, failure_count, articles_fetched,
        last_checked_at, total_articles_fetched, total_articles_inserted,
        total_duplicates_dropped, total_events_generated, fetch_streak,
        total_fetches, total_successes, last_article_inserted_at
      )
      VALUES (
        ${sourceId}, ${sourceId}, NOW(), 0, ${articleCount},
        NOW(), ${articleCount}, ${inserted},
        ${dupes}, ${events}, 1,
        1, 1, ${inserted > 0 ? 'NOW()' : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        last_success_at        = NOW(),
        failure_count          = 0,
        articles_fetched       = ${articleCount},
        last_checked_at        = NOW(),
        total_articles_fetched = COALESCE(source_health.total_articles_fetched, 0) + ${articleCount},
        total_articles_inserted = COALESCE(source_health.total_articles_inserted, 0) + ${inserted},
        total_duplicates_dropped = COALESCE(source_health.total_duplicates_dropped, 0) + ${dupes},
        total_events_generated = COALESCE(source_health.total_events_generated, 0) + ${events},
        fetch_streak           = COALESCE(source_health.fetch_streak, 0) + 1,
        total_fetches          = COALESCE(source_health.total_fetches, 0) + 1,
        total_successes        = COALESCE(source_health.total_successes, 0) + 1,
        last_article_inserted_at = CASE
          WHEN ${inserted} > 0 THEN NOW()
          ELSE source_health.last_article_inserted_at
        END
    `;
  } catch (err) {
    // Non-fatal: tracking must not disrupt ingestion
    console.warn(`[sourceHealthTracker] Failed to record success for source="${sourceId}":`, err);
  }
}

/**
 * Record a failed source fetch.
 *
 * Increments failure_count, resets fetch_streak, updates last_failure_at and last_error.
 * The error string is sanitized and truncated to MAX_ERROR_LENGTH.
 */
export async function trackSourceFailure(
  sourceId: string,
  error: string,
): Promise<void> {
  const sanitizedError = sanitizeError(error);
  try {
    await dbQuery`
      INSERT INTO source_health (
        id, source_id, last_failure_at, failure_count, last_error,
        last_checked_at, fetch_streak, total_fetches, total_failures
      )
      VALUES (
        ${sourceId}, ${sourceId}, NOW(), 1, ${sanitizedError},
        NOW(), 0, 1, 1
      )
      ON CONFLICT (id) DO UPDATE SET
        last_failure_at = NOW(),
        failure_count   = source_health.failure_count + 1,
        last_error      = ${sanitizedError},
        last_checked_at = NOW(),
        fetch_streak    = 0,
        total_fetches   = COALESCE(source_health.total_fetches, 0) + 1,
        total_failures  = COALESCE(source_health.total_failures, 0) + 1
    `;
  } catch (err) {
    // Non-fatal: tracking must not disrupt ingestion
    console.warn(`[sourceHealthTracker] Failed to record failure for source="${sourceId}":`, err);
  }
}

/**
 * Update the average significance score for a source.
 * Called after signal generation when we know which sources contributed.
 *
 * Uses exponential moving average: new_avg = old_avg * 0.8 + new_score * 0.2
 * This weights recent signal quality higher while preserving history.
 */
export async function updateSourceSignificance(
  sourceId: string,
  significanceScore: number,
): Promise<void> {
  try {
    await dbQuery`
      UPDATE source_health SET
        total_signals_contributed = COALESCE(total_signals_contributed, 0) + 1,
        avg_significance_score = CASE
          WHEN COALESCE(avg_significance_score, 0) = 0 THEN ${significanceScore}
          ELSE ROUND((COALESCE(avg_significance_score, 0) * 0.8 + ${significanceScore} * 0.2)::numeric, 2)
        END
      WHERE source_id = ${sourceId}
    `;
  } catch (err) {
    console.warn(`[sourceHealthTracker] Failed to update significance for source="${sourceId}":`, err);
  }
}

/**
 * Strip any potentially sensitive data and truncate error messages.
 */
function sanitizeError(error: string): string {
  return error
    .replace(/https?:\/\/[^\s]+/g, '[url]')   // strip URLs (may contain tokens)
    .replace(/key=[^\s&]+/gi, 'key=[redacted]') // strip API keys in query strings
    .slice(0, MAX_ERROR_LENGTH);
}
