-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Signal Context Hardening
--
-- Adds a composite index on signal_contexts(status, created_at DESC) to
-- improve the performance of getSignalContextsByStatus() which filters by
-- status and orders by created_at.  The existing scalar status index covers
-- equality scans but not the combined filter+sort used by the pipeline's
-- pending/failed discovery queries.
--
-- Also adds a composite index on (signal_id, status) to make the LEFT JOIN
-- condition in getSignals() — ON sc.signal_id = s.id AND sc.status = 'ready'
-- — index-only when Postgres chooses to use it instead of the UNIQUE index.
--
-- Safe to re-run: all statements use IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Composite index for pipeline status polling with ordered results.
-- Used by: getSignalContextsByStatus(status, limit) ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_signal_contexts_status_created_at
  ON signal_contexts (status, created_at DESC);

-- Composite index for the LEFT JOIN read path.
-- Used by: getSignals() LEFT JOIN signal_contexts ON (signal_id, status='ready')
CREATE INDEX IF NOT EXISTS idx_signal_contexts_signal_id_status
  ON signal_contexts (signal_id, status);
