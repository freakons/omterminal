-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 025 — Source Quality Metrics
--
-- Extends source_health with richer per-source quality metrics so the system
-- can track and rank sources by real output quality over time.
--
-- New columns:
--   total_articles_fetched   — lifetime articles fetched from this source
--   total_articles_inserted  — lifetime articles that were new (not deduped)
--   total_duplicates_dropped — lifetime duplicate articles dropped
--   total_events_generated   — lifetime events derived from this source
--   total_signals_contributed — lifetime signals this source contributed to
--   avg_significance_score   — rolling average significance of signals
--   last_article_inserted_at — timestamp of last new article from this source
--   fetch_streak             — consecutive successful fetches
--   total_fetches            — lifetime fetch attempts
--   total_successes          — lifetime successful fetches
--   total_failures           — lifetime failed fetches
--
-- Idempotent: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.
-- Zero-downtime safe: only ADD COLUMN on existing table.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_articles_fetched INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_articles_inserted INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_duplicates_dropped INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_events_generated INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_signals_contributed INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS avg_significance_score NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS last_article_inserted_at TIMESTAMPTZ;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS fetch_streak INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_fetches INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_successes INTEGER DEFAULT 0;
ALTER TABLE source_health ADD COLUMN IF NOT EXISTS total_failures INTEGER DEFAULT 0;

-- Index for quality ranking queries
CREATE INDEX IF NOT EXISTS idx_source_health_quality
  ON source_health (total_articles_inserted DESC, avg_significance_score DESC);

-- Index for finding unreliable sources
CREATE INDEX IF NOT EXISTS idx_source_health_failures
  ON source_health (failure_count DESC, total_failures DESC);
