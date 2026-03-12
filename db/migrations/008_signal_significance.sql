-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Signal Significance Foundation
--
-- Adds two columns to the signals table to support significance-based ranking:
--
--   significance_score   INTEGER (0–100)
--     A composite score computed at write time by the significance engine.
--     Combines confidence, source diversity, velocity, signal type weighting,
--     and entity spread.  Higher = more strategically significant.
--
--   source_support_count INTEGER
--     Number of distinct source articles/feeds that contributed evidence
--     for this signal.  Used as an input to significance_score and also
--     exposed directly for transparency.
--
-- Both columns are nullable for backward compatibility with existing rows.
-- New signals written after this migration will always have both columns set.
--
-- Safe to re-run: all statements use IF NOT EXISTS / nullable ADD COLUMN.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add significance_score column (0–100, nullable for old rows)
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS significance_score INTEGER
    CHECK (significance_score IS NULL OR (significance_score >= 0 AND significance_score <= 100));

-- Add source_support_count column (nullable for old rows)
ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS source_support_count INTEGER;

-- Index for significance-based ordering.
-- Primary read path for premium mode once Step 2 wires the query path.
CREATE INDEX IF NOT EXISTS idx_signals_significance
  ON signals (significance_score DESC NULLS LAST);

-- Composite index for premium queries: filter by confidence, order by significance.
-- Supports: WHERE confidence_score >= ? ORDER BY significance_score DESC
CREATE INDEX IF NOT EXISTS idx_signals_confidence_significance
  ON signals (confidence_score DESC, significance_score DESC NULLS LAST);
