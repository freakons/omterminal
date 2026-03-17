/**
 * Omterminal — Source Health Tracker
 *
 * Records per-source ingestion outcomes to the source_health table.
 * Called by rssIngester after each source fetch — success or failure.
 *
 * Uses upsert (INSERT … ON CONFLICT DO UPDATE) so the first fetch for
 * any source automatically creates its tracking row.
 *
 * Errors are intentionally swallowed: tracking failures must never
 * abort or degrade the ingestion pipeline.
 */

import { dbQuery } from '@/db/client';

// Maximum length for stored error messages
const MAX_ERROR_LENGTH = 500;

/**
 * Record a successful source fetch.
 *
 * Resets failure_count to 0, updates last_success_at and articles_fetched.
 */
export async function trackSourceSuccess(
  sourceId: string,
  articleCount: number,
): Promise<void> {
  try {
    await dbQuery`
      INSERT INTO source_health (id, source_id, last_success_at, failure_count, articles_fetched, last_checked_at)
      VALUES (${sourceId}, ${sourceId}, NOW(), 0, ${articleCount}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        last_success_at  = NOW(),
        failure_count    = 0,
        articles_fetched = ${articleCount},
        last_checked_at  = NOW()
    `;
  } catch (err) {
    // Non-fatal: tracking must not disrupt ingestion
    console.warn(`[sourceHealthTracker] Failed to record success for source="${sourceId}":`, err);
  }
}

/**
 * Record a failed source fetch.
 *
 * Increments failure_count, updates last_failure_at and last_error.
 * The error string is sanitized and truncated to MAX_ERROR_LENGTH.
 */
export async function trackSourceFailure(
  sourceId: string,
  error: string,
): Promise<void> {
  const sanitizedError = sanitizeError(error);
  try {
    await dbQuery`
      INSERT INTO source_health (id, source_id, last_failure_at, failure_count, last_error, last_checked_at)
      VALUES (${sourceId}, ${sourceId}, NOW(), 1, ${sanitizedError}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        last_failure_at = NOW(),
        failure_count   = source_health.failure_count + 1,
        last_error      = ${sanitizedError},
        last_checked_at = NOW()
    `;
  } catch (err) {
    // Non-fatal: tracking must not disrupt ingestion
    console.warn(`[sourceHealthTracker] Failed to record failure for source="${sourceId}":`, err);
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
