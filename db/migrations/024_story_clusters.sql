-- Migration 024: Story Clusters
--
-- Introduces lightweight article-level story clustering: groups multiple
-- articles covering the same underlying event/story into a single cluster
-- without deleting or merging any article records.
--
-- story_clusters
--   Stores metadata about each detected story cluster, including the most
--   authoritative ("canonical") article, source diversity, and timing.
--   canonical_article_id is TEXT (not FK) to avoid circular dependency with
--   articles.story_cluster_id. Consistent with signal_clusters pattern.
--
-- articles.story_cluster_id
--   Optional back-reference assigned by the story clustering engine after
--   ingestion. NULL means the article has not yet been assigned to a cluster
--   (single-article story or not yet clustered). No FK constraint for the
--   same circular-dependency reason; validated at application layer.
--
-- Idempotent: uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS story_clusters (
  -- Deterministic ID: stc_<hash(seed_article_id)>
  id                    TEXT PRIMARY KEY,
  -- Dominant category of articles in the cluster
  category              TEXT,
  -- ID of the most authoritative article (highest source_weight, then oldest)
  canonical_article_id  TEXT,
  -- Headline of the canonical article — human-readable cluster label
  representative_title  TEXT NOT NULL,
  -- Number of articles assigned to this cluster
  article_count         INTEGER NOT NULL DEFAULT 1,
  -- Number of distinct sources (publishers) in the cluster
  source_diversity      INTEGER NOT NULL DEFAULT 1,
  -- Average source_weight across cluster members (1.0 | 0.7 | 0.4)
  avg_source_weight     NUMERIC(4, 3),
  -- Publication time of the oldest article in the cluster
  first_seen_at         TIMESTAMPTZ NOT NULL,
  -- Publication time of the most recently published article in the cluster
  last_seen_at          TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup by category for filtering / analytics
CREATE INDEX IF NOT EXISTS idx_story_clusters_category
  ON story_clusters (category);

-- Fast recency-ordered listing (newest clusters first)
CREATE INDEX IF NOT EXISTS idx_story_clusters_created_at
  ON story_clusters (created_at DESC);

-- Fast lookup of large clusters (for signal enrichment)
CREATE INDEX IF NOT EXISTS idx_story_clusters_article_count
  ON story_clusters (article_count DESC);

-- Back-reference on articles: which cluster does this article belong to?
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS story_cluster_id TEXT;

-- Index supports: find all articles in a cluster, enrich events with cluster data
CREATE INDEX IF NOT EXISTS idx_articles_story_cluster_id
  ON articles (story_cluster_id)
  WHERE story_cluster_id IS NOT NULL;
