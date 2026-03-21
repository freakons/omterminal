/**
 * Omterminal — Idempotent Schema Ensurer
 *
 * Runs all DDL migration statements in order.  Every statement uses
 * IF NOT EXISTS / IF EXISTS guards, so calling this function multiple
 * times is safe and fast (Postgres short-circuits when the object
 * already exists).
 *
 * Shared between:
 *   - /api/migrate  (operator-triggered, full response)
 *   - /api/pipeline/run  (auto-ensure before each pipeline cycle)
 */

import { dbExec } from '@/db/client';

export const MIGRATION_STATEMENTS: string[] = [
  // ── Core articles table (legacy, kept for compatibility) ──────────────────
  `CREATE TABLE IF NOT EXISTS articles (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    source       TEXT NOT NULL,
    url          TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ NOT NULL,
    category     TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_source ON articles (source)`,

  // ── title_fingerprint: near-duplicate detection ──────────────────────────
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_fingerprint TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_articles_title_fingerprint ON articles (title_fingerprint)`,

  // ── Intelligence events (primary ingestion table used by gnewsFetcher) ────
  `CREATE TABLE IF NOT EXISTS intelligence_events (
    id           SERIAL PRIMARY KEY,
    title        TEXT NOT NULL,
    summary      TEXT NOT NULL DEFAULT '',
    source_url   TEXT NOT NULL UNIQUE,
    source_name  TEXT NOT NULL DEFAULT '',
    category     TEXT NOT NULL DEFAULT 'GENERAL',
    published_at TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_intel_events_published_at ON intelligence_events (published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_intel_events_category ON intelligence_events (category)`,
  `CREATE INDEX IF NOT EXISTS idx_intel_events_source_name ON intelligence_events (source_name)`,

  // ── Snapshot persistence (replaces /public/data/ file writes) ─────────────
  `CREATE TABLE IF NOT EXISTS snapshots (
    id           SERIAL PRIMARY KEY,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total        INTEGER NOT NULL DEFAULT 0,
    payload      JSONB NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_snapshots_generated_at ON snapshots (generated_at DESC)`,

  // ── Signals (intelligence engine output) ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS signals (
    id               TEXT PRIMARY KEY,
    signal_type      TEXT CHECK (signal_type IN (
                       'CAPITAL_ACCELERATION','MODEL_RELEASE_WAVE',
                       'REGULATION_ACTIVITY','RESEARCH_MOMENTUM','COMPANY_EXPANSION'
                     )),
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    supporting_events TEXT[] NOT NULL DEFAULT '{}',
    confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.0
                     CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    direction        TEXT CHECK (direction IN ('bullish','bearish','neutral','uncertain')),
    affected_entities TEXT[],
    recommendation   TEXT,
    human_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON signals (signal_type)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals (direction)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_confidence ON signals (confidence_score DESC)`,

  // ── Extend signals with frontend-facing columns ───────────────────────────
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS category    TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS entity_id   TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS entity_name TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS summary     TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS confidence  INTEGER`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS date        TEXT`,

  // ── Extend signals with publishing / trust columns ────────────────────────
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS status      TEXT CHECK (status IN ('auto','published','review','internal','rejected'))`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS trust_score INTEGER`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS source      TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS ai_model    TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS entities    JSONB`,

  // ── Events (legacy structured events table) ───────────────────────────────
  `CREATE TABLE IF NOT EXISTS events (
    id                TEXT PRIMARY KEY,
    type              TEXT NOT NULL,
    company           TEXT NOT NULL,
    related_model     TEXT,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    timestamp         TIMESTAMPTZ NOT NULL,
    source_article_id TEXT REFERENCES articles (id) ON DELETE SET NULL,
    tags              TEXT[],
    region            TEXT,
    payload           JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_type ON events (type)`,
  `CREATE INDEX IF NOT EXISTS idx_events_company ON events (company)`,
  `CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_events_source_article_id ON events (source_article_id)`,

  // ── Extend events with frontend-facing columns ────────────────────────────
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS entity_id   TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS entity_name TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS amount      TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS signal_ids  TEXT[]`,

  // ── Entities (AI ecosystem actors: companies, labs, funds) ───────────────
  `CREATE TABLE IF NOT EXISTS entities (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'company',
    description     TEXT NOT NULL DEFAULT '',
    sector          TEXT,
    country         TEXT,
    founded         INTEGER,
    website         TEXT,
    risk_level      TEXT CHECK (risk_level IN ('low','medium','high')) DEFAULT 'low',
    tags            TEXT[],
    financial_scale TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_entities_type       ON entities (type)`,
  `CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities (created_at DESC)`,

  // ── Ensure entities.name is unique (required for upsert deduplication) ──
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_name ON entities (name)`,

  // ── Signal–entity relationships (graph edges) ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS signal_entities (
    signal_id  TEXT          NOT NULL REFERENCES signals (id) ON DELETE CASCADE,
    entity_id  TEXT          NOT NULL REFERENCES entities (id) ON DELETE CASCADE,
    confidence NUMERIC(4,3)  NOT NULL DEFAULT 0.8
                             CHECK (confidence BETWEEN 0.0 AND 1.0),
    PRIMARY KEY (signal_id, entity_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_signal_entities_signal_id ON signal_entities (signal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_signal_entities_entity_id ON signal_entities (entity_id)`,

  // ── Access requests ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS access_requests (
    id         SERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests (created_at DESC)`,

  // ── Trend time-series ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS trend_timeseries (
    id           SERIAL PRIMARY KEY,
    topic        TEXT NOT NULL,
    signal_count INT NOT NULL,
    recorded_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trend_timeseries_topic_time ON trend_timeseries(topic, recorded_at DESC)`,

  // ── Trends (aggregated trend snapshots) ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS trends (
    id               SERIAL PRIMARY KEY,
    topic            TEXT NOT NULL,
    direction        TEXT CHECK (direction IN ('rising','falling','stable')),
    score            NUMERIC(5,2)  NOT NULL DEFAULT 0,
    signal_count     INT           NOT NULL DEFAULT 0,
    summary          TEXT,
    category         TEXT,
    entities         JSONB,
    confidence       NUMERIC(5,2)  NOT NULL DEFAULT 0,
    importance_score NUMERIC(5,2)  NOT NULL DEFAULT 0,
    velocity_score   NUMERIC(5,2)  NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_trends_topic      ON trends (topic)`,
  `CREATE INDEX        IF NOT EXISTS idx_trends_created_at ON trends (created_at DESC)`,
  // Backfill any columns missing from a pre-existing trends table
  `ALTER TABLE trends ADD COLUMN IF NOT EXISTS category         TEXT`,
  `ALTER TABLE trends ADD COLUMN IF NOT EXISTS entities         JSONB`,
  `ALTER TABLE trends ADD COLUMN IF NOT EXISTS confidence       NUMERIC(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE trends ADD COLUMN IF NOT EXISTS importance_score NUMERIC(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE trends ADD COLUMN IF NOT EXISTS velocity_score   NUMERIC(5,2) NOT NULL DEFAULT 0`,

  // ── Insights (AI-generated narrative summaries from trends) ──────────────
  `CREATE TABLE IF NOT EXISTS insights (
    id         SERIAL PRIMARY KEY,
    title      TEXT          NOT NULL,
    summary    TEXT          NOT NULL DEFAULT '',
    category   TEXT,
    topics     JSONB,
    confidence NUMERIC(5,2)  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_title      ON insights (title)`,
  `CREATE INDEX        IF NOT EXISTS idx_insights_created_at ON insights (created_at DESC)`,

  // ── Pipeline runs (health monitoring) ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pipeline_runs (
    id                SERIAL PRIMARY KEY,
    stage             TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('ok','error','partial')),
    duration_ms       INT,
    ingested          INT,
    signals_generated INT,
    error_msg         TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_at ON pipeline_runs (created_at DESC)`,

  // ── Migration 003: Regulations ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS regulations (
    id          TEXT        PRIMARY KEY,
    title       TEXT        NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('law', 'bill', 'exec', 'policy', 'report')),
    country     TEXT        NOT NULL,
    flag        TEXT        NOT NULL DEFAULT '',
    status      TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'pending', 'passed')),
    summary     TEXT        NOT NULL DEFAULT '',
    date        TEXT        NOT NULL DEFAULT '',
    impact      TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_regulations_status  ON regulations (status)`,
  `CREATE INDEX IF NOT EXISTS idx_regulations_type    ON regulations (type)`,
  `CREATE INDEX IF NOT EXISTS idx_regulations_country ON regulations (country)`,
  `CREATE INDEX IF NOT EXISTS idx_regulations_created ON regulations (created_at DESC)`,

  // ── Migration 003: AI Models ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS ai_models (
    id              TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    company         TEXT        NOT NULL,
    icon            TEXT        NOT NULL DEFAULT '',
    release_date    TEXT        NOT NULL DEFAULT '',
    type            TEXT        NOT NULL DEFAULT 'proprietary'
                      CHECK (type IN ('proprietary', 'open-weight', 'open-source')),
    context_window  TEXT        NOT NULL DEFAULT '',
    key_capability  TEXT        NOT NULL DEFAULT '',
    summary         TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ai_models_company  ON ai_models (company)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_models_type     ON ai_models (type)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_models_created  ON ai_models (created_at DESC)`,

  // ── Migration 003: Funding Rounds ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS funding_rounds (
    id          TEXT        PRIMARY KEY,
    company     TEXT        NOT NULL,
    icon        TEXT        NOT NULL DEFAULT '',
    amount      TEXT        NOT NULL,
    valuation   TEXT        NOT NULL DEFAULT '',
    round       TEXT        NOT NULL,
    date        TEXT        NOT NULL DEFAULT '',
    investors   TEXT[]      NOT NULL DEFAULT '{}',
    summary     TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_funding_rounds_company ON funding_rounds (company)`,
  `CREATE INDEX IF NOT EXISTS idx_funding_rounds_round   ON funding_rounds (round)`,
  `CREATE INDEX IF NOT EXISTS idx_funding_rounds_created ON funding_rounds (created_at DESC)`,

  // ── Migration 004: funding amount normalisation ───────────────────────────
  `ALTER TABLE funding_rounds
     ADD COLUMN IF NOT EXISTS amount_usd_m NUMERIC(12, 2)`,
  `CREATE INDEX IF NOT EXISTS idx_funding_rounds_amount_usd
     ON funding_rounds (amount_usd_m DESC NULLS LAST)`,

  // ── Migration 005: pipeline hardening ────────────────────────────────────
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS run_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS trigger_type      TEXT        DEFAULT 'internal'`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS started_at        TIMESTAMPTZ`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS articles_fetched  INTEGER`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS articles_inserted INTEGER`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS articles_deduped  INTEGER`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS events_created    INTEGER`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS warnings_count    INTEGER DEFAULT 0`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS errors_count      INTEGER DEFAULT 0`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS error_summary     TEXT`,
  `ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS correlation_id    TEXT`,
  `ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_status_check`,
  `ALTER TABLE pipeline_runs ADD CONSTRAINT pipeline_runs_status_check
     CHECK (status IN ('ok', 'error', 'partial', 'skipped', 'started'))`,
  `CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status      ON pipeline_runs (status)`,
  `CREATE INDEX IF NOT EXISTS idx_pipeline_runs_trigger     ON pipeline_runs (trigger_type)`,
  `CREATE INDEX IF NOT EXISTS idx_pipeline_runs_correlation ON pipeline_runs (correlation_id)`,

  // pipeline_locks: distributed lock table
  `CREATE TABLE IF NOT EXISTS pipeline_locks (
    lock_key   TEXT        PRIMARY KEY,
    locked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    run_id     TEXT,
    locked_by  TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pipeline_locks_expires ON pipeline_locks (expires_at)`,

  // page_snapshots: precomputed read models for public pages
  `CREATE TABLE IF NOT EXISTS page_snapshots (
    key          TEXT        PRIMARY KEY,
    payload      JSONB       NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_seconds  INTEGER     NOT NULL DEFAULT 300
  )`,
  `CREATE INDEX IF NOT EXISTS idx_page_snapshots_generated_at ON page_snapshots (generated_at DESC)`,

  // ── Migration 006: Signal Intelligence Context Layer ──────────────────────
  `CREATE TABLE IF NOT EXISTS signal_contexts (
    id                     TEXT        PRIMARY KEY,
    signal_id              TEXT        NOT NULL UNIQUE
                             REFERENCES signals (id) ON DELETE CASCADE,
    summary                TEXT,
    why_it_matters         TEXT,
    affected_entities      JSONB       NOT NULL DEFAULT '[]',
    implications           TEXT[]      NOT NULL DEFAULT '{}',
    confidence_explanation TEXT,
    source_basis           TEXT,
    model_provider         TEXT        NOT NULL DEFAULT '',
    model_name             TEXT        NOT NULL DEFAULT '',
    prompt_version         TEXT        NOT NULL DEFAULT '',
    status                 TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'ready', 'failed')),
    generation_error       TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_contexts_signal_id
     ON signal_contexts (signal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_signal_contexts_status
     ON signal_contexts (status)`,
  `CREATE INDEX IF NOT EXISTS idx_signal_contexts_created_at
     ON signal_contexts (created_at DESC)`,

  // ── Migration 007: Signal Context Hardening ───────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_signal_contexts_status_created_at
     ON signal_contexts (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_signal_contexts_signal_id_status
     ON signal_contexts (signal_id, status)`,

  // ── Migration 008: Signal Significance Foundation ─────────────────────────
  `ALTER TABLE signals
     ADD COLUMN IF NOT EXISTS significance_score INTEGER
       CHECK (significance_score >= 0 AND significance_score <= 100)`,
  `ALTER TABLE signals
     ADD COLUMN IF NOT EXISTS source_support_count INTEGER`,
  `CREATE INDEX IF NOT EXISTS idx_signals_significance
     ON signals (significance_score DESC NULLS LAST)`,
  `CREATE INDEX IF NOT EXISTS idx_signals_significance_created_at
     ON signals (significance_score DESC NULLS LAST, created_at DESC)`,

  // ── Migration 009: Personal Intelligence Alerts ────────────────────────
  `CREATE TABLE IF NOT EXISTS alerts (
    id          TEXT        PRIMARY KEY,
    user_id     TEXT,
    type        TEXT        NOT NULL CHECK (type IN (
                              'signal_high_impact',
                              'signal_momentum',
                              'entity_watch',
                              'trend_detected'
                            )),
    entity_name TEXT,
    signal_id   TEXT,
    trend_id    TEXT,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read        BOOLEAN     NOT NULL DEFAULT FALSE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_read       ON alerts (read)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_type       ON alerts (type)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_user_id    ON alerts (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_signal_id  ON alerts (signal_id)`,

  // ── Migration 010: Alert System Refinement ────────────────────────────
  `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check`,
  // Rename legacy type value BEFORE adding the new constraint so that
  // existing rows with type='signal_momentum' don't violate the check.
  `UPDATE alerts SET type = 'signal_rising_momentum' WHERE type = 'signal_momentum'`,
  `ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN (
    'signal_high_impact',
    'signal_rising_momentum',
    'trend_detected',
    'trend_rising',
    'entity_watch',
    'trend_watch',
    'category_watch',
    'watched_entity_high_impact',
    'watched_entity_rising',
    'watched_entity_trend'
  ))`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts (priority DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_dedup_signal ON alerts (type, signal_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_dedup_trend  ON alerts (type, trend_id, created_at DESC)`,

  // ── Migration 011: Server-side persistent watchlists ────────────────────
  `CREATE TABLE IF NOT EXISTS user_watchlists (
    id           SERIAL       PRIMARY KEY,
    user_id      TEXT         NOT NULL,
    entity_slug  TEXT         NOT NULL,
    entity_name  TEXT         NOT NULL,
    sector       TEXT,
    country      TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_watchlists_user_entity
     ON user_watchlists (user_id, entity_slug)`,
  `CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id
     ON user_watchlists (user_id, created_at DESC)`,

  // ── Migration 012: Email Digest Subscriptions ──────────────────────────
  `CREATE TABLE IF NOT EXISTS user_email_subscriptions (
    id         SERIAL       PRIMARY KEY,
    user_id    TEXT         NOT NULL UNIQUE,
    email      TEXT         NOT NULL,
    is_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subs_user_id
     ON user_email_subscriptions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_email_subs_enabled
     ON user_email_subscriptions (is_enabled) WHERE is_enabled = TRUE`,

  // ── Migration 013: Digest Send Tracking ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS digest_sends (
    id            SERIAL       PRIMARY KEY,
    user_id       TEXT         NOT NULL,
    sent_for_date DATE         NOT NULL,
    sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_sends_user_date
     ON digest_sends (user_id, sent_for_date)`,

  // ── Migration 019: Product Events ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS product_events (
    id           BIGSERIAL   PRIMARY KEY,
    event_type   TEXT        NOT NULL,
    user_id      TEXT,
    entity_slug  TEXT,
    signal_id    TEXT,
    alert_id     TEXT,
    properties   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_product_events_event_type ON product_events (event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_product_events_user_id    ON product_events (user_id) WHERE user_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_product_events_signal_id  ON product_events (signal_id) WHERE signal_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events (created_at DESC)`,

  // ── Migration 020: Weekly Reports ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS weekly_reports (
    id           BIGSERIAL   PRIMARY KEY,
    week_start   DATE        NOT NULL,
    week_end     DATE        NOT NULL,
    report_data  JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_weekly_reports_week UNIQUE (week_start)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports (week_start DESC)`,

  // ── Migration 014: Signal Intelligence Layer ────────────────────────────
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS why_this_matters TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS strategic_impact TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS who_should_care TEXT`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS prediction TEXT`,

  // ── Migration 015: Signal Intelligence Hardening ────────────────────────
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS insight_generated BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS insight_generated_at TIMESTAMPTZ`,
  `ALTER TABLE signals ADD COLUMN IF NOT EXISTS insight_generation_error TEXT`,
  // Backfill: mark existing signals that already have intelligence as generated.
  `UPDATE signals
   SET insight_generated = TRUE,
       insight_generated_at = updated_at
   WHERE why_this_matters IS NOT NULL
     AND insight_generated IS NOT TRUE`,

  // ── Migration 016: Source Health Monitoring ─────────────────────────────
  `CREATE TABLE IF NOT EXISTS source_health (
    id               TEXT PRIMARY KEY,
    source_id        TEXT NOT NULL,
    last_success_at  TIMESTAMPTZ,
    last_failure_at  TIMESTAMPTZ,
    failure_count    INTEGER DEFAULT 0,
    last_error       TEXT,
    last_checked_at  TIMESTAMPTZ,
    articles_fetched INTEGER DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_health_source_id ON source_health (source_id)`,

  // ── Migration 017: Signal Clusters ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS signal_clusters (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity           TEXT,
    topic            TEXT,
    confidence_score INTEGER,
    signal_count     INTEGER,
    created_at       TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_signal_clusters_entity ON signal_clusters (entity)`,

  // ── Migration 018: User Alert Preferences ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS user_alert_preferences (
    user_id              TEXT        PRIMARY KEY,
    digest_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
    high_impact_only     BOOLEAN     NOT NULL DEFAULT TRUE,
    include_trend_alerts BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── Migration 021: Source Weighting ────────────────────────────────────
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_tier   SMALLINT`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_weight NUMERIC(3, 1)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_source_tier ON articles (source_tier)`,

  // ── Migration 022: Content Fingerprint ─────────────────────────────────
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fingerprint TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_articles_content_fingerprint ON articles (content_fingerprint)`,

  // ── Migration 023: Source Category ─────────────────────────────────────
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_category TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_articles_source_category ON articles (source_category)`,

  // ── Migration 024: Story Clusters ──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS story_clusters (
    id                   TEXT PRIMARY KEY,
    category             TEXT,
    canonical_article_id TEXT,
    representative_title TEXT        NOT NULL,
    article_count        INTEGER     NOT NULL DEFAULT 1,
    source_diversity     INTEGER     NOT NULL DEFAULT 1,
    avg_source_weight    NUMERIC(4, 3),
    first_seen_at        TIMESTAMPTZ NOT NULL,
    last_seen_at         TIMESTAMPTZ NOT NULL,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_story_clusters_category      ON story_clusters (category)`,
  `CREATE INDEX IF NOT EXISTS idx_story_clusters_created_at    ON story_clusters (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_story_clusters_article_count ON story_clusters (article_count DESC)`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS story_cluster_id TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_articles_story_cluster_id
     ON articles (story_cluster_id) WHERE story_cluster_id IS NOT NULL`,
];

/**
 * Run all migration statements sequentially.
 * Returns true if schema was ensured successfully, false on error.
 */
export async function ensureSchema(): Promise<boolean> {
  try {
    for (const stmt of MIGRATION_STATEMENTS) {
      await dbExec(stmt);
    }
    console.log('[ensureSchema] database schema verified');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ensureSchema] error:', message);
    return false;
  }
}
