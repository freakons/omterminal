-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016 — Source Health Monitoring
--
-- Creates a source_health table to track per-source ingestion reliability:
--   last_success_at   — timestamp of last successful fetch
--   last_failure_at   — timestamp of last failed fetch
--   failure_count     — rolling count of consecutive failures (reset on success)
--   last_error        — sanitized error message from last failure
--   last_checked_at   — timestamp of last fetch attempt (success or failure)
--   articles_fetched  — number of articles retrieved on last successful fetch
--
-- Idempotent: safe to run multiple times via IF NOT EXISTS.
-- Zero-downtime safe: no locks on existing tables.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS source_health (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_checked_at TIMESTAMPTZ,
  articles_fetched INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_source_health_source_id
ON source_health(source_id);
