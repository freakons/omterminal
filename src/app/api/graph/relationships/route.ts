export const runtime = 'nodejs';
/**
 * Omterminal — Graph Relationships API Route
 *
 * Returns signal-driven entity relationships and the weighted graph.
 * Falls back to mock data when the database is unavailable or empty.
 *
 * GET /api/graph/relationships
 *   Returns all entity relationships with strength scores, shared signal
 *   counts, recency data, and the full weighted graph.
 *
 * Query params:
 *   entity  — optional entity ID to filter connections for a single entity
 *   min     — minimum relationship strength to include (default 1, range 0–100)
 *   limit   — max entities to load (default 50, max 200)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEntities, getEvents, getSignals } from '@/db/queries';
import { MOCK_ENTITIES } from '@/data/mockEntities';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import { buildIntelligentGraph } from '@/lib/graphUtils';
import { getEntityConnections } from '@/lib/relationshipIntelligence';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityFilter = searchParams.get('entity') ?? undefined;
  const minStrength = Math.max(0, Math.min(100,
    parseInt(searchParams.get('min') ?? '1', 10) || 1,
  ));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)), 200);

  try {
    // Attempt to load from DB
    const [dbEntities, dbEvents, dbSignals] = await Promise.all([
      getEntities(limit),
      getEvents(500),
      getSignals(500),
    ]);

    const hasDbData = dbEntities.length > 0;

    // Use DB data or fall back to mocks
    let entities = hasDbData ? dbEntities : (IS_PRODUCTION ? [] : MOCK_ENTITIES.slice(0, limit));
    const events   = hasDbData ? dbEvents   : (IS_PRODUCTION ? [] : MOCK_EVENTS);
    const signals  = hasDbData ? dbSignals  : (IS_PRODUCTION ? [] : MOCK_SIGNALS);
    const source   = hasDbData ? 'db' : (IS_PRODUCTION ? 'empty' : 'mock');

    // Prioritize entities by signal activity so the most connected nodes are
    // always included when the entity list is trimmed to the limit.
    // For DB entities, derive counts from the signals array (signalCount = 0 in rowToEntity).
    // For mock entities, signalCount is pre-populated.
    if (entities.length > 1) {
      const signalCountById = new Map<string, number>();
      for (const sig of signals) {
        if (sig.entityId) {
          signalCountById.set(sig.entityId, (signalCountById.get(sig.entityId) ?? 0) + 1);
        }
      }
      entities = [...entities].sort((a, b) => {
        const countA = signalCountById.get(a.id) ?? a.signalCount ?? 0;
        const countB = signalCountById.get(b.id) ?? b.signalCount ?? 0;
        return countB - countA;
      });
    }

    if (entities.length === 0) {
      return NextResponse.json({
        ok: true,
        source,
        graph: { nodes: [], links: [] },
        relationships: [],
        count: 0,
      }, { headers: { 'x-data-origin': source } });
    }

    // Shallow-copy signals before passing to graph builder so the original
    // mock/DB objects are not mutated. Do NOT fall back entityId to s.id —
    // that would create self-loop links (signal → itself) which crash D3.
    const adaptedSignals = signals.map(s => ({ ...s }));

    const { graph, relationships } = buildIntelligentGraph({
      entities,
      events,
      signals: adaptedSignals,
      minStrength,
    });

    // If entity filter is specified, return connection profile
    if (entityFilter) {
      const nameMap = new Map(entities.map(e => [e.id, e.name]));
      const profile = getEntityConnections(entityFilter, relationships, nameMap);

      return NextResponse.json({
        ok: true,
        source,
        entity: profile,
        count: profile.connectionCount,
      }, { headers: { 'x-data-origin': source } });
    }

    return NextResponse.json({
      ok: true,
      source,
      graph,
      relationships,
      count: relationships.length,
    }, { headers: { 'x-data-origin': source } });

  } catch (err) {
    console.error('[api/graph/relationships] error:', err);

    if (IS_PRODUCTION) {
      return NextResponse.json(
        { ok: false, source: 'error', error: 'graph relationships query failed' },
        { status: 503, headers: { 'x-data-origin': 'error' } },
      );
    }

    // Dev fallback: compute from mock data
    const { graph, relationships } = buildIntelligentGraph({
      entities: MOCK_ENTITIES,
      events: MOCK_EVENTS,
      signals: MOCK_SIGNALS,
      minStrength,
    });

    return NextResponse.json({
      ok: true,
      source: 'mock',
      graph,
      relationships,
      count: relationships.length,
    }, { headers: { 'x-data-origin': 'mock' } });
  }
}
