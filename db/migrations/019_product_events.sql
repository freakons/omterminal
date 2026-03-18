-- Migration 019: Product Events (Lightweight Analytics)
--
-- Adds a minimal event log for tracking user engagement with core product
-- features: signals, watchlists, alerts, and digests. Each row captures a
-- single interaction with just enough context for product analytics, without
-- storing personally identifiable information beyond the anonymous cookie UUID.
--
-- Design principles:
--   - Fire-and-forget inserts; never block user-facing requests
--   - user_id is the anonymous omterminal_uid cookie (nullable for server events)
--   - properties JSONB allows flexible per-event metadata without schema changes
--   - No personal data beyond the existing anonymous identity model
--
-- Tracked event types:
--   signal_opened       — user viewed a signal detail page
--   alert_opened        — user opened the notification panel
--   alert_read          — user marked an alert as read (or mark-all)
--   entity_tracked      — user added an entity to their watchlist
--   entity_untracked    — user removed an entity from their watchlist
--   digest_sent         — daily digest was dispatched (server-side)
--   digest_skipped      — digest was skipped (no subscription / already sent)
--   email_click         — user clicked a link in a digest email (via redirect)

CREATE TABLE IF NOT EXISTS product_events (
  id           BIGSERIAL   PRIMARY KEY,
  event_type   TEXT        NOT NULL,
  user_id      TEXT,
  entity_slug  TEXT,
  signal_id    TEXT,
  alert_id     TEXT,
  properties   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_event_type ON product_events (event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_user_id    ON product_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_events_signal_id  ON product_events (signal_id) WHERE signal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events (created_at DESC);
