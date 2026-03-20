/**
 * Omterminal — Article Store
 *
 * Persistence layer for raw articles ingested from RSS and news sources.
 * Articles are the foundation of the intelligence pipeline — events and
 * signals are derived from them.
 *
 * Pipeline position:
 *   RSS/GNews ingestion → articleStore → eventStore → signals engine
 *
 * Deduplication strategy (layered):
 *   1. Title fingerprint   — EXACT title match + 48h publish window (app-level)
 *   2. Content fingerprint — title + leading description hash + 48h window (app-level)
 *   3. Exact URL match     — UNIQUE constraint on `url` column (DB-enforced)
 *
 * articles table schema (src/db/schema.sql + migrations 021-023):
 *   id                   TEXT PRIMARY KEY
 *   title                TEXT NOT NULL
 *   source               TEXT NOT NULL
 *   url                  TEXT NOT NULL UNIQUE
 *   published_at         TIMESTAMPTZ NOT NULL
 *   category             TEXT NOT NULL
 *   title_fingerprint    TEXT           -- nullable for backward compat
 *   content_fingerprint  TEXT           -- nullable for backward compat (migration 022)
 *   source_tier          SMALLINT       -- nullable for backward compat (migration 021)
 *   source_weight        NUMERIC(3,1)   -- nullable for backward compat (migration 021)
 *   source_category      TEXT           -- nullable for backward compat (migration 023)
 *   created_at           TIMESTAMPTZ DEFAULT NOW()
 */

import { dbQuery } from '@/db/client';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Time window (hours) for fingerprint-based near-duplicate detection.
 * Articles with the same fingerprint published within this window are
 * considered duplicates. 48 hours is conservative enough to avoid collapsing
 * genuinely different stories that happen to share a title or snippet.
 */
const NEAR_DEDUP_WINDOW_HOURS = 48;

// ─────────────────────────────────────────────────────────────────────────────
// Input type
// ─────────────────────────────────────────────────────────────────────────────

export interface ArticleInput {
  /** Stable article ID, e.g. art_<urlhash16> */
  id: string;
  /** Article headline */
  title: string;
  /** Publisher / source name, e.g. "VentureBeat" */
  source: string;
  /** Canonical article URL */
  url: string;
  /** ISO 8601 publication timestamp */
  publishedAt: string;
  /**
   * DB-friendly category: 'models' | 'funding' | 'regulation' |
   * 'research' | 'product' | 'agents'
   * (not the ArticleCategory type from intelligence.ts)
   */
  category: string;
  /**
   * Title fingerprint for near-duplicate detection.
   * Generated via generateTitleFingerprint() in normalization/helpers.ts.
   * Nullable for backward compatibility with older ingestion paths.
   */
  titleFingerprint?: string;
  /**
   * Content fingerprint for cross-field near-duplicate detection.
   * Generated via generateContentFingerprint() in normalization/helpers.ts.
   * Hash of normalized title + leading description text.
   * Nullable for backward compatibility with older ingestion paths.
   */
  contentFingerprint?: string;
  /**
   * Source tier (1 | 2 | 3) derived from the source's reliability score.
   * Nullable for backward compatibility with pre-weighting ingestion paths.
   */
  sourceTier?: 1 | 2 | 3;
  /**
   * Numeric weight for this article's source (1.0 | 0.7 | 0.4).
   * Nullable for backward compatibility with pre-weighting ingestion paths.
   */
  sourceWeight?: number;
  /**
   * Source registry category ('news' | 'company' | 'research' | 'developer' | 'social' | 'policy').
   * Carried from SourceDefinition.category at ingestion time.
   * Nullable for backward compatibility with pre-023 ingestion paths.
   */
  sourceCategory?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Near-duplicate detection
// ─────────────────────────────────────────────────────────────────────────────

type NearDupReason = 'title_fingerprint' | 'content_fingerprint' | null;

interface NearDupResult {
  existingUrl: string;
  reason: NearDupReason;
}

/**
 * Checks if a near-duplicate article already exists in the DB using:
 *   1. Title fingerprint + 48h publish-time window
 *   2. Content fingerprint + 48h publish-time window
 *
 * Returns the URL of the existing article and the detection reason, or
 * null if no near-duplicate was found.
 *
 * Both checks are conservative — they require BOTH:
 *   - Fingerprint match (exact hash)
 *   - Published within ±NEAR_DEDUP_WINDOW_HOURS of the candidate
 */
async function findNearDuplicate(
  article: ArticleInput,
): Promise<NearDupResult | null> {
  const pubDate = new Date(article.publishedAt);
  const windowMs = NEAR_DEDUP_WINDOW_HOURS * 60 * 60 * 1000;
  const windowStart = new Date(pubDate.getTime() - windowMs).toISOString();
  const windowEnd = new Date(pubDate.getTime() + windowMs).toISOString();

  // ── Check 1: Title fingerprint ───────────────────────────────────────────
  if (article.titleFingerprint) {
    const rows = await dbQuery<{ url: string }>`
      SELECT url FROM articles
      WHERE title_fingerprint = ${article.titleFingerprint}
        AND published_at >= ${windowStart}
        AND published_at <= ${windowEnd}
      LIMIT 1
    `;
    if (rows.length > 0) {
      return { existingUrl: rows[0].url, reason: 'title_fingerprint' };
    }
  }

  // ── Check 2: Content fingerprint ────────────────────────────────────────
  if (article.contentFingerprint) {
    const rows = await dbQuery<{ url: string }>`
      SELECT url FROM articles
      WHERE content_fingerprint = ${article.contentFingerprint}
        AND published_at >= ${windowStart}
        AND published_at <= ${windowEnd}
      LIMIT 1
    `;
    if (rows.length > 0) {
      return { existingUrl: rows[0].url, reason: 'content_fingerprint' };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist a single article to the articles table.
 *
 * Deduplication is layered:
 *   1. Title fingerprint + 48h window   — app-level near-dup detection
 *   2. Content fingerprint + 48h window — app-level near-dup detection
 *   3. Exact URL match                  — UNIQUE constraint (DB-enforced)
 *
 * Must be called BEFORE saveEvent() for the corresponding event so the
 * events.source_article_id FK reference is satisfied.
 *
 * @returns true if the row was newly inserted, false if already existed or
 *          was detected as a near-duplicate.
 */
export async function saveArticle(article: ArticleInput): Promise<boolean> {
  // Layers 1 & 2: Near-duplicate detection via fingerprints
  const nearDup = await findNearDuplicate(article);
  if (nearDup) {
    console.log(
      `[articleStore] Near-duplicate detected (${nearDup.reason}): ` +
      `"${article.title}" matches existing article at ${nearDup.existingUrl}`,
    );
    return false;
  }

  // Layer 3: Exact URL dedup via DB UNIQUE constraint
  const rows = await dbQuery<{ id: string }>`
    INSERT INTO articles (
      id, title, source, url, published_at, category,
      title_fingerprint, content_fingerprint,
      source_tier, source_weight, source_category
    )
    VALUES (
      ${article.id},
      ${article.title},
      ${article.source},
      ${article.url},
      ${article.publishedAt},
      ${article.category},
      ${article.titleFingerprint ?? null},
      ${article.contentFingerprint ?? null},
      ${article.sourceTier ?? null},
      ${article.sourceWeight ?? null},
      ${article.sourceCategory ?? null}
    )
    ON CONFLICT (url) DO NOTHING
    RETURNING id
  `;

  if (rows.length === 0) {
    console.log(`[articleStore] Exact URL duplicate skipped: "${article.url}"`);
  }
  return rows.length > 0;
}

/**
 * Persist an array of articles in parallel, skipping duplicates.
 *
 * Individual failures are caught and logged; they do not abort the batch.
 *
 * @returns Counts of newly inserted vs. already-existing (deduped) articles.
 */
export async function saveArticles(
  articles: ArticleInput[],
): Promise<{ inserted: number; deduped: number }> {
  if (articles.length === 0) return { inserted: 0, deduped: 0 };

  const results = await Promise.allSettled(articles.map(saveArticle));

  let inserted = 0;
  let deduped = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value) inserted++;
      else deduped++;
    } else {
      console.error('[articleStore] Failed to save article:', result.reason);
    }
  }

  console.log(
    `[articleStore] saveArticles: ${inserted} inserted, ${deduped} near/exact duplicates dropped ` +
    `(of ${articles.length} total)`,
  );
  return { inserted, deduped };
}
