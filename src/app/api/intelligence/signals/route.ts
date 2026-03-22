export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '@/db/queries';
import { createRequestId, logWithRequestId } from '@/lib/requestId';
import { parseSignalMode } from '@/lib/signals/signalModes';
import { getCache, setCache, MEM_TTL } from '@/lib/memoryCache';
import { composeFeed } from '@/lib/signals/feedComposer';
import { enrichSignalsWithLinks, buildSignalClusters } from '@/lib/signals/crossSignalLinker';

// s-maxage=10 keeps CDN copies fresh; stale-while-revalidate extends TTL gracefully
const CACHE_HEADERS = { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' };

export async function GET(req: NextRequest) {
  const t0    = Date.now();
  const reqId = createRequestId();

  const { searchParams } = new URL(req.url);
  const mode  = parseSignalMode(searchParams.get('mode'));
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 200);
  const cursor = Math.max(0, parseInt(searchParams.get('cursor') ?? '0', 10) || 0);
  const includeLinks = searchParams.get('links') === 'true';
  const debug = searchParams.get('debug') === 'true';
  const isFirstPage = cursor === 0;

  // In-process memory cache (instance-local, 10 s).
  // Reduces repeated DB reads on hot polling cycles between pipeline runs.
  // Debug mode and paginated requests bypass cache.
  const memKey = `intelligence:signals:${mode}:${limit}:${includeLinks}:v3`;
  const memCached = getCache<Record<string, unknown>>(memKey, MEM_TTL.INTELLIGENCE_SIGNALS);
  if (memCached && !debug && isFirstPage) {
    logWithRequestId(reqId, 'intelligence/signals', `cache_hit source=memory mode=${mode} ms=${Date.now() - t0}`);
    return NextResponse.json(memCached, { headers: { ...CACHE_HEADERS, 'x-data-origin': 'cache' } });
  }

  try {
    // Fetch one extra row to detect whether more results exist.
    const rawSignals = await getSignals(limit + 1, mode, cursor);

    const hasMore = rawSignals.length > limit;
    const pageSignals = hasMore ? rawSignals.slice(0, limit) : rawSignals;

    // Apply feed composition: rank scoring, dedup, diversity guardrails.
    // For standard mode, apply a minimum significance threshold to filter noise.
    const composed = composeFeed(pageSignals, {
      minSignificance: mode === 'standard' ? 30 : mode === 'premium' ? 50 : 0,
      debug,
    });

    // Optionally enrich signals with cross-signal intelligence links.
    const outputSignals = includeLinks
      ? enrichSignalsWithLinks(composed, 5)
      : composed;

    // Build signal clusters when links are requested.
    const clusters = includeLinks
      ? buildSignalClusters(composed)
      : undefined;

    const source = composed.length > 0 ? 'db' : 'empty';
    logWithRequestId(reqId, 'intelligence/signals', `cache_miss source=${source} mode=${mode} raw=${pageSignals.length} composed=${composed.length} hasMore=${hasMore} cursor=${cursor} links=${includeLinks} ms=${Date.now() - t0}`);
    const payload = {
      ok: true,
      mode,
      signals: outputSignals,
      count: outputSignals.length,
      source,
      hasMore,
      nextCursor: hasMore ? cursor + limit : null,
      ...(clusters !== undefined ? { clusters } : {}),
    };
    // Only cache non-empty first-page results; paginated and empty results
    // should not be locked into stale cache views.
    if (composed.length > 0 && isFirstPage) setCache(memKey, payload, MEM_TTL.INTELLIGENCE_SIGNALS);
    return NextResponse.json(payload, { headers: { ...CACHE_HEADERS, 'x-data-origin': source } });
  } catch (err) {
    console.error('[api/intelligence/signals] DB error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch signals', signals: [] },
      { status: 503, headers: { 'x-data-origin': 'error' } },
    );
  }
}
