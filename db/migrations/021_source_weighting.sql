-- Migration 021: Source Weighting
--
-- Adds source_tier and source_weight columns to the articles table.
-- These fields are populated by the ingestion layer and carry forward
-- to downstream systems (signals, scoring) without changing ranking.
--
-- source_tier   — 1 | 2 | 3  (derived from source reliability score)
-- source_weight — 1.0 | 0.7 | 0.4  (numeric weight for the tier)
--
-- Both columns are nullable for backward compatibility with rows written
-- before this migration.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source_tier    SMALLINT,
  ADD COLUMN IF NOT EXISTS source_weight  NUMERIC(3, 1);

-- Optional: back-fill a comment for documentation purposes
COMMENT ON COLUMN articles.source_tier IS
  'Source tier derived from reliability score: 1 (9-10), 2 (7-8), 3 (≤6)';

COMMENT ON COLUMN articles.source_weight IS
  'Numeric weight for source tier: Tier 1=1.0, Tier 2=0.7, Tier 3=0.4';
