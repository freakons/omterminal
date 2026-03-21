-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 026 — Source Scoring & State Management
--
-- Adds automatic source scoring and state tracking to source_health.
-- Enables the system to evaluate source quality continuously and support
-- future auto-throttling and auto-pruning.
--
-- New columns:
--   source_score              — composite quality score (0-100)
--   source_state              — operational state (stable, probation, watch, etc.)
--   score_updated_at          — when score was last recalculated
--   consecutive_low_score_runs — consecutive scoring runs below threshold
--   duplicate_rate            — cached duplicate ratio (0.00-1.00)
--   signal_yield_rate         — cached signal yield ratio (0.00-1.00)
--   article_insert_rate       — cached article insertion ratio (0.00-1.00)
--   auto_disabled             — whether system has auto-disabled this source
--   auto_disabled_at          — when auto-disable was applied
--   auto_disable_reason       — human-readable reason for auto-disable
--   manual_override_state     — operator override state (null = no override)
--   manual_override_note      — operator note for override
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS throughout.
-- Zero-downtime safe: only ADD COLUMN on existing table.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE source_health ADD COLUMN IF NOT EXISTS source_score INTEGER DEFAULT NULL;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS source_state TEXT DEFAULT 'stable';
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS consecutive_low_score_runs INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS duplicate_rate NUMERIC(5, 4) DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS signal_yield_rate NUMERIC(5, 4) DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS article_insert_rate NUMERIC(5, 4) DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS auto_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS auto_disabled_at TIMESTAMPTZ;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS auto_disable_reason TEXT;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS manual_override_state TEXT;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS manual_override_note TEXT;

-- Index for scoring queries (find sources by state/score)
CREATE INDEX IF NOT EXISTS idx_source_health_scoring
  ON source_health (source_state, source_score DESC NULLS LAST);

-- Index for finding auto-disabled sources
CREATE INDEX IF NOT EXISTS idx_source_health_auto_disabled
  ON source_health (auto_disabled) WHERE auto_disabled = TRUE;
