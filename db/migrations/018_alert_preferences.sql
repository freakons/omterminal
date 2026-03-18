-- Migration 018: User Alert Preferences
--
-- Adds a lightweight per-user preferences table for controlling digest and
-- in-product alert volume. Intentionally minimal: three boolean flags with
-- sensible defaults. Reuses the same user_id (cookie UUID) pattern as
-- user_watchlists and user_email_subscriptions.
--
-- Defaults:
--   digest_enabled        TRUE  — keep daily digest on by default
--   high_impact_only      TRUE  — reduce noise; only priority-2 personal alerts
--   include_trend_alerts  FALSE — trend alerts are noisier; conservative default

CREATE TABLE IF NOT EXISTS user_alert_preferences (
  user_id               TEXT        PRIMARY KEY,
  digest_enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
  high_impact_only      BOOLEAN     NOT NULL DEFAULT TRUE,
  include_trend_alerts  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
