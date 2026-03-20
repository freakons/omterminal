export const runtime = 'nodejs';
/**
 * Omterminal — Entity Momentum Index API
 *
 * GET /api/intelligence/momentum
 *   Returns entities ranked by their Entity Momentum Index score, computed
 *   from recent signal activity in a rolling window.
 *
 * Query params:
 *   window  — rolling window in days (default: 7, max: 30)
 *   limit   — max entities to return (default: 20, max: 100)
 *   debug   — "true" to include per-factor score breakdown
 *
 * Response shape:
 *   {
 *     ok: true,
 *     window_days: 7,
 *     computed_at: "<ISO>",
 *     count: N,
 *     entities: EntityMomentum[],
 *   }
 *
 * Error responses:
 *   503 — database unavailable
 *   500 — unexpected computation error
 *
 * Caching: 60-second CDN cache; stale-while-revalidate=300.
 * This endpoint is read-only and does not affect existing feed behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment } from '@/lib/env';
import { getCache, setCache, MEM_TTL } from '@/lib/memoryCache';
import { computeEntityMomentum, MOMENTUM_WINDOW_DAYS } from '@/lib/intelligence/momentumIndex';

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
};

export async function GET(req: NextRequest) {
  const t0 = Date.now();

  try {
    validateEnvironment(['DATABASE_URL']);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Database not configured', entities: [] },
      { status: 503, headers: CACHE_HEADERS },
    );
  }

  const { searchParams } = new URL(req.url);

  const windowDays = Math.min(
    Math.max(parseInt(searchParams.get('window') ?? String(MOMENTUM_WINDOW_DAYS), 10), 1),
    30,
  );
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1),
    100,
  );
  const debug = searchParams.get('debug') === 'true';

  // In-process memory cache (60 s); debug mode bypasses for fresh breakdowns.
  const memKey = `intelligence:momentum:w${windowDays}:l${limit}:d${debug}:v1`;
  if (!debug) {
    const cached = getCache<Record<string, unknown>>(memKey, MEM_TTL.INTELLIGENCE_SIGNALS);
    if (cached) {
      return NextResponse.json(cached, { headers: { ...CACHE_HEADERS, 'x-data-origin': 'cache' } });
    }
  }

  try {
    const entities = await computeEntityMomentum({ windowDays, limit, debug });

    const payload = {
      ok: true,
      window_days:  windowDays,
      computed_at:  new Date().toISOString(),
      count:        entities.length,
      entities,
      meta: {
        formula: {
          signal_volume:    0.25,
          avg_significance: 0.30,
          corroboration:    0.15,
          recency:          0.20,
          type_diversity:   0.10,
        },
        description:
          'Entity Momentum Index: measures how much attention an entity is ' +
          'attracting right now, combining signal frequency, quality, ' +
          'corroboration, freshness, and signal-type breadth.',
      },
      ms: Date.now() - t0,
    };

    if (entities.length > 0 && !debug) {
      setCache(memKey, payload, MEM_TTL.INTELLIGENCE_SIGNALS);
    }

    return NextResponse.json(payload, {
      headers: { ...CACHE_HEADERS, 'x-data-origin': 'db' },
    });
  } catch (err) {
    console.error('[api/intelligence/momentum] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to compute momentum index', entities: [] },
      { status: 500, headers: CACHE_HEADERS },
    );
  }
}
