/**
 * Omterminal — RSS Fetcher
 *
 * Fetches and normalises articles from RSS/Atom feeds tracked in the source
 * registry. Uses the rss-parser npm package (already a project dependency).
 *
 * Architecture:
 *   Source (registry) → fetchArticlesFromSource() → Article[]
 *
 * The returned Article objects conform to the canonical Article type defined
 * in src/types/intelligence.ts, making them ready for the classifier and
 * event extraction pipeline.
 */

import Parser from 'rss-parser';
import type { Source } from '../../config/intelligenceSources';
import type { Article, ArticleCategory } from '../../types/intelligence';
import { withTimeout } from '@/lib/withTimeout';
import {
  canonicalizeUrl,
  cleanText,
  cleanPlainText,
  normalizeSourceName,
  normalizeTimestamp,
  generateArticleId,
} from '../normalization/helpers';

// Per-feed fetch timeout (5–8 s range).  Override with RSS_FEED_TIMEOUT_MS env var.
const RSS_FEED_TIMEOUT_MS = parseInt(process.env.RSS_FEED_TIMEOUT_MS ?? '7000', 10);

// Maximum simultaneous feed fetches.  Caps open connections with 160+ sources.
// Override with RSS_FETCH_CONCURRENCY env var.
const RSS_FETCH_CONCURRENCY = parseInt(process.env.RSS_FETCH_CONCURRENCY ?? '25', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export interface FetchResult {
  /** Source that was fetched */
  sourceId: string;
  /** Normalised articles ready for the pipeline */
  articles: Article[];
  /** Number of raw items returned by the feed */
  rawItemCount: number;
  /** ISO timestamp of when the fetch occurred */
  fetchedAt: string;
  /** Error message if the fetch failed, undefined on success */
  error?: string;
  /** True when the fetch was aborted by the per-source timeout */
  timedOut?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches articles from a single RSS/Atom source and returns normalised
 * Article objects ready for the intelligence pipeline.
 *
 * @param source  A Source object from the INTELLIGENCE_SOURCES registry.
 * @param limit   Maximum number of articles to return (default: 20).
 * @returns       A FetchResult containing normalised articles or an error.
 */
export async function fetchArticlesFromSource(
  source: Source,
  limit = 20
): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const feed = await fetchRawFeed(source.rss);

    const articles: Article[] = feed.items
      .slice(0, limit)
      .filter((item) => item.link && item.title)
      .map((item) => normaliseItem(item, source));

    console.log(
      `[rssFetcher] OK source="${source.id}" articles=${articles.length} rawItems=${feed.items.length}`,
    );

    return {
      sourceId: source.id,
      articles,
      rawItemCount: feed.items.length,
      fetchedAt,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    const message = err instanceof Error ? err.message : String(err);
    if (isTimeout) {
      console.warn(
        `[rssFetcher] TIMEOUT source="${source.id}" (${source.rss}) exceeded ${RSS_FEED_TIMEOUT_MS}ms`,
      );
    } else {
      console.error(`[rssFetcher] FAILED source="${source.id}" (${source.rss}): ${message}`);
    }
    return {
      sourceId: source.id,
      articles: [],
      rawItemCount: 0,
      fetchedAt,
      error: message,
      timedOut: isTimeout,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch fetcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches articles from multiple sources with bounded concurrency.
 * At most RSS_FETCH_CONCURRENCY (default 25) fetches run simultaneously,
 * preventing socket exhaustion when the source list exceeds 100+ entries.
 * Failures for individual sources are caught and returned as error results
 * without halting the entire batch.
 *
 * @param sources  Array of Source objects to fetch.
 * @param limit    Per-source article limit (default: 20).
 * @returns        Array of FetchResults (one per source, order preserved).
 */
export async function fetchArticlesFromSources(
  sources: Source[],
  limit = 20
): Promise<FetchResult[]> {
  console.log(
    `[rssFetcher] Starting batch: ${sources.length} sources, concurrency=${RSS_FETCH_CONCURRENCY}, timeout=${RSS_FEED_TIMEOUT_MS}ms, limit=${limit}`,
  );
  return concurrentMap(
    sources,
    (source) => fetchArticlesFromSource(source, limit),
    RSS_FETCH_CONCURRENCY,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps over `items` with at most `concurrency` async operations running at
 * once.  Uses a worker-pool pattern so the pipeline stays saturated without
 * ever exceeding the concurrency cap.  Order of results matches input order.
 */
async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** rss-parser item shape after parsing */
interface ParsedItem {
  title: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
  description?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
  categories?: string[];
}

/** Parsed feed */
interface ParsedFeed {
  title: string;
  items: ParsedItem[];
}

/**
 * Fetches and parses an RSS/Atom feed using rss-parser.
 * Races against RSS_FEED_TIMEOUT_MS (default 10 s) to avoid hanging on
 * slow or dead feeds.  Uses the shared withTimeout utility so timeout
 * errors carry structured stage/duration metadata.
 */
async function fetchRawFeed(url: string): Promise<ParsedFeed> {
  const parser = new Parser({
    headers: {
      'User-Agent': 'Omterminal/1.0 (AI Intelligence Platform; +https://omterminal.com)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    customFields: {
      item: ['dc:creator', 'content:encoded'],
    },
  });

  const feed = await withTimeout(
    parser.parseURL(url),
    RSS_FEED_TIMEOUT_MS,
    'fetch:rss',
  );

  return {
    title: feed.title ?? '',
    items: (feed.items ?? []).map((item) => ({
      title: (item.title ?? '').trim(),
      link: item.link ?? '',
      pubDate: item.pubDate ?? item.isoDate,
      isoDate: item.isoDate,
      description: item.contentSnippet ?? item.summary,
      contentSnippet: item.contentSnippet,
      content: item['content:encoded'] ?? item.content ?? item.contentSnippet,
      creator: item['dc:creator'] ?? item.creator,
      categories: item.categories,
    })),
  };
}

/**
 * Maps a parsed RSS item to the canonical Article type.
 * Applies centralized normalization to all text fields, URLs, and timestamps.
 */
function normaliseItem(item: ParsedItem, source: Source): Article {
  const cleanUrl = canonicalizeUrl(item.link);
  const id = generateArticleId(cleanUrl);

  // Clean text fields: content may contain HTML, snippets are usually plain text
  const content = cleanText(item.content) || cleanPlainText(item.contentSnippet) || cleanPlainText(item.description);
  const excerpt = (cleanPlainText(item.contentSnippet) || cleanPlainText(item.description)).slice(0, 300) || undefined;

  return {
    id,
    title: cleanPlainText(item.title) || item.title.trim(),
    source: normalizeSourceName(source.name),
    url: cleanUrl,
    publishedAt: normalizeTimestamp(item.pubDate ?? item.isoDate),
    content,
    excerpt,
    category: inferCategory(source),
    authors: item.creator ? [cleanPlainText(item.creator)].filter(Boolean) : undefined,
    tags: item.categories,
  };
}

/**
 * Infers a broad ArticleCategory from the source's category.
 * The classifier in classifier.ts will apply more precise categorisation later.
 */
function inferCategory(source: Source): ArticleCategory {
  const map: Record<string, ArticleCategory> = {
    model_lab: 'model_release',
    big_tech: 'other',
    research: 'research',
    policy: 'policy',
    venture_capital: 'funding',
    industry_analysis: 'other',
  };
  return map[source.category] ?? 'other';
}
