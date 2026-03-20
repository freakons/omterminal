/**
 * Omterminal — Story Clustering Engine
 *
 * Groups multiple articles covering the same underlying event or story into
 * a single story cluster. This is separate from deduplication (which discards
 * copies) and from signal clustering (which groups higher-order signals).
 *
 * Story clustering operates at the article level, below events and signals.
 * It identifies when multiple outlets are reporting on the same underlying
 * story (e.g. a product launch, funding round, or regulation) without removing
 * any article records.
 *
 * Algorithm:
 *   1. Load articles ingested in the last LOOKBACK_HOURS (default 72h)
 *   2. Extract significant keyword tokens from each normalized title
 *   3. Run union-find clustering — two articles belong to the same story if:
 *      a. Same title fingerprint (near-identical headline, any time within window)
 *      b. Title Jaccard similarity ≥ TITLE_SIMILARITY_THRESHOLD (0.40)
 *      c. Same category + ≥2 shared keywords + published within 48h of each other
 *   4. For each cluster of ≥ MIN_CLUSTER_SIZE (2) articles:
 *      a. Identify seed article (oldest published_at — stable for ID generation)
 *      b. Identify canonical article (highest source_weight, then oldest)
 *      c. Compute source_diversity and avg_source_weight
 *      d. Upsert to story_clusters table (ON CONFLICT (id) DO UPDATE)
 *      e. Bulk-update articles.story_cluster_id for all members
 *   5. Emit structured clustering summary per run:
 *      articles_processed, clusters_formed, articles_in_clusters,
 *      avg_articles_per_cluster, top clusters by article count
 *
 * Production safety guarantees:
 *   - No embeddings or heavy NLP — only normalized title tokens + Jaccard
 *   - O(n²) pair comparison: acceptable for typical runs (<500 articles)
 *   - All DB operations wrapped in try/catch; failures are non-fatal
 *   - Original article records are never modified except for story_cluster_id
 *   - Idempotent: re-running with the same articles produces the same clusters
 *
 * Reuses existing infrastructure:
 *   - normalizeTitle() + titleSimilarity() from normalization/helpers
 *   - stringHash() for deterministic ID generation
 *   - source_weight / source_tier / source_category from article metadata
 *
 * Pipeline position:
 *   RSS/GNews ingestion → storyClustering → event extraction → signals engine
 */

import { dbQuery }             from '@/db/client';
import { normalizeTitle, titleSimilarity, stringHash } from '@/services/normalization/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hours to look back when loading articles for clustering.
 * 72h catches staggered coverage patterns (e.g. a story broken at 9am then
 * picked up by slower outlets over the following two days).
 */
const LOOKBACK_HOURS = 72;

/**
 * Jaccard title similarity threshold for same-story detection.
 * Deliberately lower than the deduplication threshold (0.80) to catch
 * reworded headlines covering the same event.
 *
 * Example: "OpenAI Releases GPT-5" vs "OpenAI Launches New GPT-5 Model"
 * → shared tokens: {openai, gpt5} out of ~7 unique → Jaccard ≈ 0.29
 *   Falls below this threshold — caught by Layer 3 (keyword + proximity) instead.
 *
 * Example: "Meta unveils Llama 4 open model" vs "Meta releases Llama 4"
 * → shared tokens: {meta, llama} out of ~6 unique → Jaccard ≈ 0.33
 *   Close to threshold; Layer 3 captures remaining cases.
 */
const TITLE_SIMILARITY_THRESHOLD = 0.40;

/**
 * Minimum shared significant keywords for category+proximity clustering.
 * Requires ≥2 substantive tokens to prevent false merges on single generic
 * terms like "funding" or "model".
 */
const MIN_SHARED_KEYWORDS = 2;

/**
 * Minimum keyword Jaccard ratio for category+proximity clustering.
 * Lower than TITLE_SIMILARITY_THRESHOLD because we require category match
 * and publication time proximity as additional guards.
 */
const KEYWORD_JACCARD_THRESHOLD = 0.15;

/**
 * Maximum hours between two articles' publish times for proximity clustering.
 * 48h covers same-day reporting + next-day follow-up coverage patterns.
 */
const PROXIMITY_WINDOW_HOURS = 48;

/** Minimum articles required to form a story cluster (singletons are skipped). */
const MIN_CLUSTER_SIZE = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Stop words — filter noise from keyword extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common words excluded from keyword extraction.
 * Extends the base stop-word set with action verbs commonly found in news
 * headlines (announces, launches, releases) that carry no topic identity.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'this', 'that', 'these',
  'those', 'it', 'its', 'not', 'no', 'as', 'if', 'than', 'new', 'first',
  'via', 'under', 'into', 'per', 'up', 'out', 'all', 'more', 'says',
  'said', 'report', 'reports', 'just', 'now', 'latest', 'announces',
  'announced', 'launches', 'launch', 'releases', 'release', 'update',
  'how', 'what', 'why', 'who', 'when', 'where', 'unveils', 'unveil',
  'introduces', 'introduce', 'here', 'big', 'major', 'key', 'top',
]);

function extractKeywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal DB row type
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleRow {
  id:                 string;
  title:              string;
  source:             string;
  category:           string;
  published_at:       string;
  title_fingerprint:  string | null;
  source_weight:      number | null;
  source_tier:        number | null;
  source_category:    string | null;
  story_cluster_id:   string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Same-story detection
// ─────────────────────────────────────────────────────────────────────────────

function hoursApart(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 3_600_000;
}

/**
 * Returns true when articles A and B are likely covering the same story.
 *
 * Three layers checked in order of precision:
 *
 *   Layer 1 — Title fingerprint match
 *     Exact hash match on normalized title + same publish window.
 *     Catches syndicated stories where the headline is identical or near-identical.
 *
 *   Layer 2 — High title similarity (Jaccard ≥ 0.40)
 *     Word-token Jaccard on normalized titles (no stop words stripped).
 *     Catches reworded headlines for the same event.
 *
 *   Layer 3 — Category + keyword overlap + time proximity
 *     Same DB category AND ≥2 shared significant tokens AND Jaccard ≥ 0.15
 *     AND published within 48h of each other.
 *     Catches stories where the headline structure differs but the topic
 *     keywords (company name, product name) overlap significantly.
 */
function isSameStory(
  a: ArticleRow,
  b: ArticleRow,
  kwA: Set<string>,
  kwB: Set<string>,
): boolean {
  // ── Layer 1: same title fingerprint ────────────────────────────────────────
  if (
    a.title_fingerprint &&
    b.title_fingerprint &&
    a.title_fingerprint === b.title_fingerprint
  ) {
    return true;
  }

  // ── Layer 2: high title similarity ─────────────────────────────────────────
  const normA = normalizeTitle(a.title);
  const normB = normalizeTitle(b.title);
  if (normA && normB && titleSimilarity(normA, normB) >= TITLE_SIMILARITY_THRESHOLD) {
    return true;
  }

  // ── Layer 3: category + keyword overlap + proximity ─────────────────────────
  if (a.category === b.category && hoursApart(a.published_at, b.published_at) <= PROXIMITY_WINDOW_HOURS) {
    let overlap = 0;
    for (const w of kwA) {
      if (kwB.has(w)) overlap++;
    }
    if (overlap >= MIN_SHARED_KEYWORDS) {
      const unionSize = kwA.size + kwB.size - overlap;
      if (unionSize > 0 && overlap / unionSize >= KEYWORD_JACCARD_THRESHOLD) {
        return true;
      }
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Union-Find (path-compressed, union-by-rank)
// ─────────────────────────────────────────────────────────────────────────────

function buildUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank   = new Array<number>(n).fill(0);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb])      parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  }

  return { find, union };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster ID generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a stable story cluster ID from the seed article ID.
 * Seed = oldest article by published_at (stable across re-runs with same data).
 * Format: stc_<8-char hex hash>
 */
function generateClusterId(seedArticleId: string): string {
  return `stc_${stringHash(seedArticleId)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public result type
// ─────────────────────────────────────────────────────────────────────────────

export interface StoryClusteringSummary {
  articlesProcessed:    number;
  clustersFormed:       number;
  articlesInClusters:   number;
  avgArticlesPerCluster: number;
  /** Top clusters sorted by article count, capped at 10 for logging. */
  topClusters: Array<{
    id:                 string;
    representativeTitle: string;
    articleCount:       number;
    sourceDiversity:    number;
    category:           string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main clustering function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run story clustering over recently ingested articles.
 *
 * Safe to call multiple times with the same data — idempotent via ON CONFLICT.
 * Failures at the DB layer are caught and logged; the function always resolves.
 *
 * @param lookbackHours  How far back to load articles (default: 72h).
 * @returns              A summary of clustering results for pipeline logging.
 */
export async function clusterStories(
  lookbackHours = LOOKBACK_HOURS,
): Promise<StoryClusteringSummary> {
  const empty: StoryClusteringSummary = {
    articlesProcessed:    0,
    clustersFormed:       0,
    articlesInClusters:   0,
    avgArticlesPerCluster: 0,
    topClusters:          [],
  };

  // ── Load recent articles ────────────────────────────────────────────────────
  let articles: ArticleRow[];
  try {
    const cutoff = new Date(Date.now() - lookbackHours * 3_600_000).toISOString();
    articles = await dbQuery<ArticleRow>`
      SELECT
        id, title, source, category, published_at,
        title_fingerprint, source_weight, source_tier, source_category,
        story_cluster_id
      FROM articles
      WHERE created_at >= ${cutoff}
      ORDER BY published_at ASC
    `;
  } catch (err) {
    console.error(
      '[storyClustering] Failed to load articles:',
      err instanceof Error ? err.message : String(err),
    );
    return empty;
  }

  const n = articles.length;

  if (n < MIN_CLUSTER_SIZE) {
    console.log(`[storyClustering] ${n} articles loaded — too few to cluster (min=${MIN_CLUSTER_SIZE})`);
    return { ...empty, articlesProcessed: n };
  }

  // ── Pre-compute keyword sets (one pass, O(n)) ────────────────────────────────
  const keywordSets = articles.map(a => extractKeywords(a.title));

  // ── Union-Find clustering (O(n²) pair comparison) ───────────────────────────
  const { find, union } = buildUnionFind(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isSameStory(articles[i], articles[j], keywordSets[i], keywordSets[j])) {
        union(i, j);
      }
    }
  }

  // ── Collect groups by root ────────────────────────────────────────────────────
  const groups = new Map<number, number[]>(); // root → article indices
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  // ── Filter to valid clusters (≥ MIN_CLUSTER_SIZE) ──────────────────────────
  const validGroups: number[][] = [];
  for (const indices of groups.values()) {
    if (indices.length >= MIN_CLUSTER_SIZE) validGroups.push(indices);
  }

  if (validGroups.length === 0) {
    console.log(
      `[storyClustering] ${n} articles → 0 clusters formed ` +
      `(no groups of ≥${MIN_CLUSTER_SIZE} same-story articles)`,
    );
    return { ...empty, articlesProcessed: n };
  }

  // ── Persist clusters and update articles ──────────────────────────────────────
  const topClusters: StoryClusteringSummary['topClusters'] = [];
  let articlesInClusters = 0;

  for (const indices of validGroups) {
    // Sort by published_at ASC — oldest first (seed = stable ID anchor)
    indices.sort((a, b) =>
      new Date(articles[a].published_at).getTime() -
      new Date(articles[b].published_at).getTime(),
    );

    const group = indices.map(i => articles[i]);
    const seed  = group[0]; // oldest = stable cluster seed
    const clusterId = generateClusterId(seed.id);

    // Canonical article: highest source_weight, then earliest published_at
    const canonical = group.reduce((best, curr) => {
      const bw = best.source_weight ?? 0.7;
      const cw = curr.source_weight ?? 0.7;
      if (cw > bw) return curr;
      if (cw === bw && new Date(curr.published_at) < new Date(best.published_at)) return curr;
      return best;
    });

    // Cluster metadata
    const distinctSources = new Set(group.map(a => a.source)).size;
    const weights  = group.map(a => a.source_weight ?? 0.7);
    const avgWeight = Math.round(
      (weights.reduce((s, w) => s + w, 0) / weights.length) * 1000,
    ) / 1000;

    // Dominant category (majority vote)
    const catCounts = new Map<string, number>();
    for (const a of group) catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1);
    const dominantCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const firstSeen = group[0].published_at;
    const lastSeen  = group[group.length - 1].published_at;
    const memberIds = group.map(a => a.id);

    try {
      // Upsert story cluster record
      await dbQuery`
        INSERT INTO story_clusters (
          id, category, canonical_article_id, representative_title,
          article_count, source_diversity, avg_source_weight,
          first_seen_at, last_seen_at, updated_at
        ) VALUES (
          ${clusterId},
          ${dominantCategory},
          ${canonical.id},
          ${canonical.title},
          ${group.length},
          ${distinctSources},
          ${avgWeight},
          ${firstSeen},
          ${lastSeen},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          article_count        = EXCLUDED.article_count,
          source_diversity     = EXCLUDED.source_diversity,
          avg_source_weight    = EXCLUDED.avg_source_weight,
          last_seen_at         = EXCLUDED.last_seen_at,
          canonical_article_id = EXCLUDED.canonical_article_id,
          representative_title = EXCLUDED.representative_title,
          updated_at           = NOW()
      `;

      // Bulk-update articles.story_cluster_id for all cluster members
      await dbQuery`
        UPDATE articles
        SET story_cluster_id = ${clusterId}
        WHERE id = ANY(${memberIds})
      `;

      articlesInClusters += group.length;
      topClusters.push({
        id:                  clusterId,
        representativeTitle: canonical.title,
        articleCount:        group.length,
        sourceDiversity:     distinctSources,
        category:            dominantCategory,
      });
    } catch (err) {
      console.error(
        `[storyClustering] Failed to persist cluster ${clusterId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── Clustering summary ────────────────────────────────────────────────────────
  const clustersFormed       = topClusters.length;
  const avgArticlesPerCluster =
    clustersFormed > 0
      ? Math.round((articlesInClusters / clustersFormed) * 10) / 10
      : 0;

  console.log(
    `[storyClustering] summary:` +
    ` articles_processed=${n}` +
    ` clusters_formed=${clustersFormed}` +
    ` articles_in_clusters=${articlesInClusters}` +
    ` avg_articles_per_cluster=${avgArticlesPerCluster}`,
  );

  // Log the top clusters (up to 5) for pipeline visibility
  const topN = [...topClusters]
    .sort((a, b) => b.articleCount - a.articleCount)
    .slice(0, 5);

  for (const c of topN) {
    console.log(
      `[storyClustering]   ${c.id}: "${c.representativeTitle.slice(0, 70)}"` +
      ` articles=${c.articleCount} sources=${c.sourceDiversity} category=${c.category}`,
    );
  }

  return {
    articlesProcessed:    n,
    clustersFormed,
    articlesInClusters,
    avgArticlesPerCluster,
    topClusters: topClusters.sort((a, b) => b.articleCount - a.articleCount),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers (for API / admin dashboard)
// ─────────────────────────────────────────────────────────────────────────────

interface StoryClusterRow {
  id:                   string;
  category:             string | null;
  canonical_article_id: string | null;
  representative_title: string;
  article_count:        number;
  source_diversity:     number;
  avg_source_weight:    number | null;
  first_seen_at:        string;
  last_seen_at:         string;
  created_at:           string;
}

/**
 * Retrieve recent story clusters ordered by size, for the API or admin tools.
 * Returns at most 200 rows; defaults to 50.
 */
export async function getStoryClusters(limit = 50): Promise<StoryClusterRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 200);
  return dbQuery<StoryClusterRow>`
    SELECT
      id, category, canonical_article_id, representative_title,
      article_count, source_diversity, avg_source_weight,
      first_seen_at, last_seen_at, created_at
    FROM story_clusters
    ORDER BY article_count DESC, last_seen_at DESC
    LIMIT ${safeLimit}
  `;
}
