-- ─────────────────────────────────────────────────────────────────────────────
-- Omterminal — Regulations, Models & Funding Rounds Tables
-- 003_regulations_models_funding.sql
--
-- Adds three new tables that mirror the shape of the static seed arrays in
-- src/lib/data/{regulations,models,funding}.ts.
--
-- Safe to run multiple times (all statements use IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Regulations ───────────────────────────────────────────────────────────────
-- Stores global AI regulatory acts, bills, executive orders, and policy reports.
-- Mirrors: src/lib/data/regulations.ts → Regulation interface

CREATE TABLE IF NOT EXISTS regulations (
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
);

CREATE INDEX IF NOT EXISTS idx_regulations_status  ON regulations (status);
CREATE INDEX IF NOT EXISTS idx_regulations_type    ON regulations (type);
CREATE INDEX IF NOT EXISTS idx_regulations_country ON regulations (country);
CREATE INDEX IF NOT EXISTS idx_regulations_created ON regulations (created_at DESC);

-- ── AI Models ─────────────────────────────────────────────────────────────────
-- Stores frontier and notable AI model releases.
-- Mirrors: src/lib/data/models.ts → AIModel interface
-- Named `ai_models` to avoid potential conflicts with other uses of `models`.

CREATE TABLE IF NOT EXISTS ai_models (
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
);

CREATE INDEX IF NOT EXISTS idx_ai_models_company  ON ai_models (company);
CREATE INDEX IF NOT EXISTS idx_ai_models_type     ON ai_models (type);
CREATE INDEX IF NOT EXISTS idx_ai_models_created  ON ai_models (created_at DESC);

-- ── Funding Rounds ────────────────────────────────────────────────────────────
-- Stores AI company funding rounds, valuations, and investor data.
-- Mirrors: src/lib/data/funding.ts → FundingRound interface

CREATE TABLE IF NOT EXISTS funding_rounds (
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
);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_company ON funding_rounds (company);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_round   ON funding_rounds (round);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_created ON funding_rounds (created_at DESC);
