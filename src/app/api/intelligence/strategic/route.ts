export const runtime = 'nodejs';
/**
 * Omterminal — Strategic Importance Index API
 *
 * GET /api/intelligence/strategic
 *   Returns signals ranked by Strategic Importance Index, plus an optional
 *   per-entity aggregate view.  Strategic importance surfaces major ecosystem-
 *   shaping developments even if they are not the most frequent.
 *
 * Query params:
 *   mode    — signal quality mode: raw | standard | premium (default: standard)
 *   limit   — signals to score (default: 50, max: 200)
 *   entity  — "true" to include per-entity aggregate (default: false)
 *   debug   — "true" to include per-factor score breakdown per signal
 *
 * Response shape:
 *   {
 *     ok: true,
 *     computed_at: "<ISO>",
 *     count: N,
 *     signals: SignalStrategic[],
 *     entities?: EntityStrategic[],   // only when entity=true
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
import { getSignals } from '@/db/queries';
import { parseSignalMode } from '@/lib/signals/signalModes';
import {
  rankSignalsByStrategic,
  computeEntityStrategic,
} from '@/lib/intelligence/strategicIndex';

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
};

export async function GET(req: NextRequest) {
  const t0 = Date.now();

  try {
    validateEnvironment(['DATABASE_URL']);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Database not configured', signals: [] },
      { status: 503, headers: CACHE_HEADERS },
    );
  }

  const { searchParams } = new URL(req.url);

  const mode         = parseSignalMode(searchParams.get('mode'));
  const limit        = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const includeEntity = searchParams.get('entity') === 'true';
  const debug        = searchParams.get('debug') === 'true';

  // In-process memory cache; debug mode bypasses for fresh breakdowns.
  const memKey = `intelligence:strategic:${mode}:${limit}:${includeEntity}:${debug}:v1`;
  if (!debug) {
    const cached = getCache<Record<string, unknown>>(memKey, MEM_TTL.INTELLIGENCE_SIGNALS);
    if (cached) {
      return NextResponse.json(cached, { headers: { ...CACHE_HEADERS, 'x-data-origin': 'cache' } });
    }
  }

  try {
    // Reuse the existing getSignals() path — no additional DB queries.
    const rawSignals = await getSignals(limit, mode);

    // Compute strategic scores (pure, synchronous).
    const scoredSignals = rankSignalsByStrategic(rawSignals, debug);

    const payload: Record<string, unknown> = {
      ok: true,
      mode,
      computed_at: new Date().toISOString(),
      count: scoredSignals.length,
      signals: scoredSignals,
      meta: {
        formula: {
          base_significance:     0.35,
          type_importance:       0.25,
          entity_prominence:     0.20,
          corroboration_quality: 0.15,
          ecosystem_breadth:     0.05,
        },
        description:
          'Strategic Importance Index: surfaces ecosystem-shaping signals based ' +
          'on structural significance, signal type impact, entity prominence, ' +
          'source corroboration quality, and ecosystem breadth.  Complements ' +
          'momentum (which tracks trending frequency) by prioritizing signals ' +
          'that matter even if infrequent.',
      },
      ms: Date.now() - t0,
    };

    // Optional: per-entity aggregate view
    if (includeEntity) {
      payload.entities = computeEntityStrategic(scoredSignals);
    }

    if (scoredSignals.length > 0 && !debug) {
      setCache(memKey, payload, MEM_TTL.INTELLIGENCE_SIGNALS);
    }

    return NextResponse.json(payload, {
      headers: { ...CACHE_HEADERS, 'x-data-origin': 'db' },
    });
  } catch (err) {
    console.error('[api/intelligence/strategic] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to compute strategic index', signals: [] },
      { status: 500, headers: CACHE_HEADERS },
    );
  }
}
