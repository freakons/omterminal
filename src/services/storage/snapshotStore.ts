/**
 * Omterminal — Snapshot Store
 *
 * Persistence layer for intelligence snapshots.
 * Sits at the end of the full pipeline and exposes snapshots to the API layer.
 *
 * Pipeline position:
 *   signal store → snapshot generator → snapshotStore
 *
 * Functions:
 *   saveSnapshot       — persist a single IntelligenceSnapshot
 *   getLatestSnapshot  — retrieve the single most recent snapshot
 *   getSnapshots       — retrieve the N most recent snapshots
 *
 * Table schema (run once in your Neon DB):
 *
 *   CREATE TABLE IF NOT EXISTS snapshots (
 *     id                TEXT        PRIMARY KEY,
 *     headline          TEXT,
 *     summary           TEXT,
 *     period_start      TIMESTAMPTZ NOT NULL,
 *     period_end        TIMESTAMPTZ NOT NULL,
 *     generated_at      TIMESTAMPTZ NOT NULL,
 *     key_signals       JSONB       NOT NULL DEFAULT '[]',
 *     top_model_releases JSONB      NOT NULL DEFAULT '[]',
 *     major_funding     JSONB       NOT NULL DEFAULT '[]',
 *     new_regulations   JSONB       NOT NULL DEFAULT '[]',
 *     articles_processed INTEGER,
 *     events_extracted  INTEGER
 *   );
 */

import { dbQuery } from '@/db/client';
import type {
  IntelligenceSnapshot,
  Signal,
  ModelRelease,
  FundingRound,
  Regulation,
  ISODateString,
} from '@/types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Row type returned from the `snapshots` table
// ─────────────────────────────────────────────────────────────────────────────

interface SnapshotRow {
  id: string;
  headline: string | null;
  summary: string | null;
  period_start: string;
  period_end: string;
  generated_at: string;
  key_signals: Signal[];
  top_model_releases: ModelRelease[];
  major_funding: FundingRound[];
  new_regulations: Regulation[];
  articles_processed: number | null;
  events_extracted: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Safely coerce a DB timestamp field to an ISO string. */
function toISO(value: string): ISODateString {
  return typeof value === 'string' ? value : new Date(value).toISOString();
}

/** Map a database row back to the canonical IntelligenceSnapshot interface. */
function rowToSnapshot(row: SnapshotRow): IntelligenceSnapshot {
  return {
    id:                  row.id,
    headline:            row.headline ?? undefined,
    summary:             row.summary  ?? undefined,
    periodStart:         toISO(row.period_start),
    periodEnd:           toISO(row.period_end),
    generatedAt:         toISO(row.generated_at),
    keySignals:          Array.isArray(row.key_signals)         ? row.key_signals         : [],
    topModelReleases:    Array.isArray(row.top_model_releases)  ? row.top_model_releases  : [],
    majorFunding:        Array.isArray(row.major_funding)       ? row.major_funding       : [],
    newRegulations:      Array.isArray(row.new_regulations)     ? row.new_regulations     : [],
    articlesProcessed:   row.articles_processed  ?? undefined,
    eventsExtracted:     row.events_extracted    ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist a single IntelligenceSnapshot to the database.
 *
 * Uses INSERT … ON CONFLICT DO NOTHING so re-generating a snapshot from the
 * same signal set is idempotent — the same deterministic ID will be skipped.
 *
 * @returns true if the row was inserted, false if it already existed or DB is unavailable.
 */
export async function saveSnapshot(
  snapshot: IntelligenceSnapshot,
): Promise<boolean> {
  const rows = await dbQuery<{ id: string }>`
    INSERT INTO snapshots (
      id,
      headline,
      summary,
      period_start,
      period_end,
      generated_at,
      key_signals,
      top_model_releases,
      major_funding,
      new_regulations,
      articles_processed,
      events_extracted
    ) VALUES (
      ${snapshot.id},
      ${snapshot.headline ?? null},
      ${snapshot.summary  ?? null},
      ${snapshot.periodStart},
      ${snapshot.periodEnd},
      ${snapshot.generatedAt},
      ${JSON.stringify(snapshot.keySignals)},
      ${JSON.stringify(snapshot.topModelReleases)},
      ${JSON.stringify(snapshot.majorFunding)},
      ${JSON.stringify(snapshot.newRegulations)},
      ${snapshot.articlesProcessed ?? null},
      ${snapshot.eventsExtracted   ?? null}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;

  const inserted = rows.length > 0;
  console.log(
    inserted
      ? `[snapshotStore] saveSnapshot: inserted ${snapshot.id}`
      : `[snapshotStore] saveSnapshot: skipped ${snapshot.id} (already exists)`,
  );
  return inserted;
}

/**
 * Retrieve the single most recent IntelligenceSnapshot from the database.
 *
 * @returns The latest snapshot, or null if none exist or DB is unavailable.
 */
export async function getLatestSnapshot(): Promise<IntelligenceSnapshot | null> {
  const rows = await dbQuery<SnapshotRow>`
    SELECT
      id, headline, summary, period_start, period_end, generated_at,
      key_signals, top_model_releases, major_funding, new_regulations,
      articles_processed, events_extracted
    FROM snapshots
    ORDER BY generated_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? rowToSnapshot(rows[0]) : null;
}

/**
 * Retrieve the N most recent IntelligenceSnapshots, newest first.
 *
 * @param limit  Maximum number of snapshots to return (default 10, max 100).
 * @returns      Array of snapshots.
 */
export async function getSnapshots(limit = 10): Promise<IntelligenceSnapshot[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const rows = await dbQuery<SnapshotRow>`
    SELECT
      id, headline, summary, period_start, period_end, generated_at,
      key_signals, top_model_releases, major_funding, new_regulations,
      articles_processed, events_extracted
    FROM snapshots
    ORDER BY generated_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map(rowToSnapshot);
}
