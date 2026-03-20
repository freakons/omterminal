-- Migration 020: Weekly Product Intelligence Reports
--
-- Stores generated weekly reports summarizing user engagement, confusion
-- hotspots, and ignored features. Reports are generated once per week
-- and stored as JSONB for flexible schema evolution.

CREATE TABLE IF NOT EXISTS weekly_reports (
  id           BIGSERIAL   PRIMARY KEY,
  week_start   DATE        NOT NULL,
  week_end     DATE        NOT NULL,
  report_data  JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_weekly_reports_week UNIQUE (week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports (week_start DESC);
