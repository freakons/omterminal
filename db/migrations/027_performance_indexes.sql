-- Migration 027: High-Impact Performance Indexes
--
-- Evidence-driven additions targeting the hottest query patterns on
-- /api/signals, /api/alerts, /api/graph/relationships, and entity lookups.
-- All statements use IF NOT EXISTS for safe re-runs.

-- events(entity_id): entity-linked event lookups used across entity dossier
-- and graph routes.  Partial (entity_id IS NOT NULL) keeps the index small.
CREATE INDEX IF NOT EXISTS idx_events_entity_id
  ON events (entity_id) WHERE entity_id IS NOT NULL;

-- LOWER(signals.entity_name): every entity-linked signal query uses
-- LOWER(entity_name) = LOWER($name) — no functional index existed, causing
-- full-table scans on getRelatedSignals and getSignalsForEntity fallback.
CREATE INDEX IF NOT EXISTS idx_signals_entity_name_lower
  ON signals (LOWER(entity_name)) WHERE entity_name IS NOT NULL;

-- LOWER(events.entity_name): same pattern in getEventsForEntity and the
-- event-count leg of getEntityMetrics — no index existed.
CREATE INDEX IF NOT EXISTS idx_events_entity_name_lower
  ON events (LOWER(entity_name)) WHERE entity_name IS NOT NULL;

-- LOWER(entities.name): used in all junction-table entity lookups
-- (getSignalsForEntity, getRelatedEntities, getEntityMetrics via JOIN).
-- The unique index on name is case-sensitive; this covers LOWER() queries.
CREATE INDEX IF NOT EXISTS idx_entities_name_lower
  ON entities (LOWER(name));

-- alerts(priority DESC, created_at DESC) WHERE user_id IS NULL: the most
-- common /api/alerts pattern is platform alerts (anonymous, first-page).
-- The existing idx_alerts_priority has no user_id predicate, so Postgres
-- must filter after sorting; this partial index targets that exact pattern.
CREATE INDEX IF NOT EXISTS idx_alerts_platform
  ON alerts (priority DESC, created_at DESC) WHERE user_id IS NULL;
