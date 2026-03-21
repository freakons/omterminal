export const runtime = 'nodejs';

/**
 * Omterminal — Source Quality Intelligence API
 *
 * GET /api/sources/quality
 *
 * Returns ranked source quality reports for operational monitoring.
 * Uses cumulative metrics from source_health (migration 025) to identify:
 *   - best-performing sources (highest new articles + high significance)
 *   - weakest/noisiest sources (high failure rate, low insertion rate)
 *   - high-duplicate sources (fetching content that's mostly already known)
 *   - high-signal sources (highest avg significance score)
 *
 * Auth: x-admin-secret header or ?secret= query param.
 *
 * Query params:
 *   ?view=best|weakest|duplicates|signals|all  (default: all)
 *   ?limit=N  (default: 15)
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, tableExists } from '@/db/client';
import { getSourceById, getEnabledSources, allSources } from '@/config/sources/index';

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthenticated(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  if (!adminSecret) return false;
  const header = req.headers.get('x-admin-secret') ?? '';
  if (header === adminSecret) return true;
  const query = new URL(req.url).searchParams.get('secret') ?? '';
  if (query === adminSecret) return true;
  return false;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QualityRow {
  source_id: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  articles_fetched: number;
  total_articles_fetched: number;
  total_articles_inserted: number;
  total_duplicates_dropped: number;
  total_events_generated: number;
  total_signals_contributed: number;
  avg_significance_score: number;
  fetch_streak: number;
  total_fetches: number;
  total_successes: number;
  total_failures: number;
  last_article_inserted_at: string | null;
}

interface SourceQualityReport {
  sourceId: string;
  name: string;
  category: string;
  reliability: number;
  enabled: boolean;
  // Lifetime metrics
  totalFetches: number;
  successRate: number;          // 0-100%
  totalArticlesFetched: number;
  totalArticlesInserted: number;
  totalDuplicatesDropped: number;
  insertionRate: number;        // 0-100% (inserted / fetched)
  totalEventsGenerated: number;
  totalSignalsContributed: number;
  avgSignificanceScore: number;
  // Current state
  failureCount: number;
  fetchStreak: number;
  lastSuccessAt: string | null;
  lastArticleInsertedAt: string | null;
  // Derived quality score (0-100)
  qualityScore: number;
}

// ── Quality score computation ────────────────────────────────────────────────

/**
 * Composite quality score (0-100) that considers:
 *   - success rate (25%)
 *   - insertion rate (25%)
 *   - significance score (25%)
 *   - volume contribution (15%)
 *   - reliability (10%)
 */
function computeQualityScore(row: QualityRow): number {
  const sourceDef = getSourceById(row.source_id);
  const reliability = sourceDef?.reliability ?? 5;

  const totalFetches = row.total_fetches || 1;
  const successRate = (row.total_successes || 0) / totalFetches;
  const totalFetched = row.total_articles_fetched || 1;
  const insertionRate = (row.total_articles_inserted || 0) / totalFetched;
  const significance = (row.avg_significance_score || 0) / 100;
  const volumeScore = Math.min((row.total_articles_inserted || 0) / 50, 1);
  const reliabilityNorm = reliability / 10;

  const raw =
    successRate * 25 +
    insertionRate * 25 +
    significance * 25 +
    volumeScore * 15 +
    reliabilityNorm * 10;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const tableReady = await tableExists('source_health');
  if (!tableReady) {
    return NextResponse.json(
      { ok: false, error: 'source_health table not found — run migrations' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const view = url.searchParams.get('view') ?? 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '15', 10), 50);

  const rows = await dbQuery<QualityRow>`
    SELECT
      source_id,
      last_success_at,
      last_failure_at,
      failure_count,
      articles_fetched,
      COALESCE(total_articles_fetched, 0) as total_articles_fetched,
      COALESCE(total_articles_inserted, 0) as total_articles_inserted,
      COALESCE(total_duplicates_dropped, 0) as total_duplicates_dropped,
      COALESCE(total_events_generated, 0) as total_events_generated,
      COALESCE(total_signals_contributed, 0) as total_signals_contributed,
      COALESCE(avg_significance_score, 0) as avg_significance_score,
      COALESCE(fetch_streak, 0) as fetch_streak,
      COALESCE(total_fetches, 0) as total_fetches,
      COALESCE(total_successes, 0) as total_successes,
      COALESCE(total_failures, 0) as total_failures,
      last_article_inserted_at
    FROM source_health
  `;

  // Build full reports
  const reports: SourceQualityReport[] = rows.map((row) => {
    const sourceDef = getSourceById(row.source_id);
    const totalFetches = row.total_fetches || 1;
    const totalFetched = row.total_articles_fetched || 1;

    return {
      sourceId: row.source_id,
      name: sourceDef?.name ?? row.source_id,
      category: sourceDef?.category ?? 'unknown',
      reliability: sourceDef?.reliability ?? 0,
      enabled: sourceDef?.enabled ?? false,
      totalFetches: row.total_fetches,
      successRate: Math.round(((row.total_successes || 0) / totalFetches) * 100),
      totalArticlesFetched: row.total_articles_fetched,
      totalArticlesInserted: row.total_articles_inserted,
      totalDuplicatesDropped: row.total_duplicates_dropped,
      insertionRate: Math.round(((row.total_articles_inserted || 0) / totalFetched) * 100),
      totalEventsGenerated: row.total_events_generated,
      totalSignalsContributed: row.total_signals_contributed,
      avgSignificanceScore: row.avg_significance_score,
      failureCount: row.failure_count,
      fetchStreak: row.fetch_streak,
      lastSuccessAt: row.last_success_at,
      lastArticleInsertedAt: row.last_article_inserted_at,
      qualityScore: computeQualityScore(row),
    };
  });

  // Ranked views
  const best = [...reports]
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit);

  const weakest = [...reports]
    .sort((a, b) => a.qualityScore - b.qualityScore)
    .slice(0, limit);

  const highDuplicate = [...reports]
    .filter((r) => r.totalArticlesFetched > 0)
    .sort((a, b) => (b.totalDuplicatesDropped / (b.totalArticlesFetched || 1)) - (a.totalDuplicatesDropped / (a.totalArticlesFetched || 1)))
    .slice(0, limit);

  const highSignal = [...reports]
    .filter((r) => r.totalSignalsContributed > 0)
    .sort((a, b) => b.avgSignificanceScore - a.avgSignificanceScore)
    .slice(0, limit);

  // Summary stats
  const enabledSources = getEnabledSources();
  const totalConfigured = allSources.length;
  const totalEnabled = enabledSources.length;
  const totalTracked = reports.length;
  const avgQuality = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.qualityScore, 0) / reports.length)
    : 0;

  const result: Record<string, unknown> = {
    ok: true,
    summary: {
      totalConfigured,
      totalEnabled,
      totalTracked,
      avgQualityScore: avgQuality,
      sourcesNeedingAttention: reports.filter((r) => r.qualityScore < 20).length,
    },
  };

  if (view === 'best' || view === 'all') result.bestPerforming = best;
  if (view === 'weakest' || view === 'all') result.weakest = weakest;
  if (view === 'duplicates' || view === 'all') result.highDuplicate = highDuplicate;
  if (view === 'signals' || view === 'all') result.highSignal = highSignal;

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
