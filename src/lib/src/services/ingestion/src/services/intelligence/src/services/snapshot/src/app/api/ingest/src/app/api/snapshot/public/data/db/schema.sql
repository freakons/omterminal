-- OM Terminal — Neon PostgreSQL Schema
-- Sprint 3: AI Intelligence Data Engine
--
-- Run this SQL in your Neon console to set up the database.
-- Navigate to: https://console.neon.tech → SQL Editor → Run
--
-- Bloomberg-Style Architecture:
-- This DB is write-only for the application.
-- The UI reads from public/data/intelligence.json (static snapshot).

-- ============================================================
-- Intelligence Events Table
-- Stores all AI intelligence events from GNews ingestion.
-- ============================================================

CREATE TABLE IF NOT EXISTS intelligence_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
      summary      TEXT,
        source_url   TEXT UNIQUE NOT NULL,    -- Unique constraint prevents duplicates
          source_name  TEXT,
            category     TEXT NOT NULL DEFAULT 'COMPANY_MOVE',
                            -- Values: MODEL_RELEASE, REGULATION, FUNDING, COMPANY_MOVE, RESEARCH, POLICY
                              organization TEXT,
                                impact_level TEXT,
                                                -- Values: high, medium, low
                                                  published_at TIMESTAMPTZ,
                                                    created_at   TIMESTAMPTZ DEFAULT NOW()
                                                    );

                                                    -- Index for fast category filtering
                                                    CREATE INDEX IF NOT EXISTS idx_intelligence_category ON intelligence_events(category);

                                                    -- Index for date-range queries (most recent first)
                                                    CREATE INDEX IF NOT EXISTS idx_intelligence_published_at ON intelligence_events(published_at DESC);

                                                    -- ============================================================
                                                    -- Email Subscribers Table
                                                    -- Managed by Resend Audiences API (not direct inserts).
                                                    -- This table is for analytics/backup only.
                                                    -- ============================================================

                                                    CREATE TABLE IF NOT EXISTS email_subscribers (
                                                      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                        email      TEXT UNIQUE NOT NULL,
                                                          source     TEXT DEFAULT 'omterminal-waitlist',
                                                            created_at TIMESTAMPTZ DEFAULT NOW()
                                                            );

                                                            -- ============================================================
                                                            -- Snapshot Audit Log (optional but useful)
                                                            -- Tracks when snapshots were built and how many events.
                                                            -- ============================================================

                                                            CREATE TABLE IF NOT EXISTS snapshot_log (
                                                              id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                                total_events INTEGER NOT NULL DEFAULT 0,
                                                                  categories   TEXT[],
                                                                    built_at     TIMESTAMPTZ DEFAULT NOW()
                                                                    );