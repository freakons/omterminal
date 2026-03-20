-- Migration 023: Source Category
--
-- Adds source_category column to the articles table.
-- This carries the SourceDefinition.category value from the source registry
-- ('news' | 'company' | 'research' | 'developer' | 'social' | 'policy')
-- through to storage so downstream systems can filter or weight by source type
-- without re-joining the registry.
--
-- Nullable for backward compatibility with rows written before this migration.
-- New rows populated by rssIngester will always have this column set.
-- GNews rows default to 'news' (news aggregator API).

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS source_category TEXT;

COMMENT ON COLUMN articles.source_category IS
  'Source registry category: news | company | research | developer | social | policy';
