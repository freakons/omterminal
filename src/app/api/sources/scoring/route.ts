export const runtime = 'nodejs';

/**
 * Omterminal — Source Scoring API
 *
 * GET  /api/sources/scoring              — view scores, states, breakdowns
 * POST /api/sources/scoring              — trigger manual scoring run
 * PUT  /api/sources/scoring              — set manual override for a source
 *
 * Auth: x-admin-secret header or ?secret= query param.
 *
 * GET query params:
 *   ?view=all|strongest|weakest|throttled|prune|disabled|breakdown  (default: all)
 *   ?limit=N  (default: 20, max: 100)
 *   ?source=<sourceId>  — get single source breakdown
 *
 * PUT body:
 *   { sourceId: string, state: SourceState | null, note?: string }
 *   Pass state=null to clear a manual override.
 */

import { NextRequest, NextResponse } from 'next/server';
import { tableExists } from '@/db/client';
import {
  runSourceScoring,
  getSourceScoreBreakdowns,
  setManualOverride,
  type SourceState,
  type SourceScoreBreakdown,
} from '@/services/scoring/sourceScoring';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_STATES: SourceState[] = [
  'promote', 'stable', 'watch', 'probation', 'throttle', 'prune_candidate', 'disabled',
];

function filterByView(
  breakdowns: SourceScoreBreakdown[],
  view: string,
  limit: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const strongest = [...breakdowns]
    .sort((a, b) => b.sourceScore - a.sourceScore)
    .slice(0, limit);

  const weakest = [...breakdowns]
    .sort((a, b) => a.sourceScore - b.sourceScore)
    .slice(0, limit);

  const throttled = breakdowns.filter(
    (b) => b.sourceState === 'throttle' || b.sourceState === 'probation',
  );

  const pruneCandiates = breakdowns.filter(
    (b) => b.sourceState === 'prune_candidate',
  );

  const disabled = breakdowns.filter(
    (b) => b.sourceState === 'disabled' || b.autoDisabled,
  );

  // Summary
  const stateCounts: Record<string, number> = {};
  for (const b of breakdowns) {
    stateCounts[b.sourceState] = (stateCounts[b.sourceState] || 0) + 1;
  }
  const avgScore = breakdowns.length > 0
    ? Math.round(breakdowns.reduce((s, b) => s + b.sourceScore, 0) / breakdowns.length)
    : 0;

  result.summary = {
    totalScored: breakdowns.length,
    avgScore,
    stateCounts,
    manualOverrides: breakdowns.filter((b) => b.manualOverride).length,
    autoDisabledCount: disabled.filter((b) => b.autoDisabled).length,
  };

  if (view === 'strongest' || view === 'all') result.strongest = strongest;
  if (view === 'weakest' || view === 'all') result.weakest = weakest;
  if (view === 'throttled' || view === 'all') result.throttled = throttled;
  if (view === 'prune' || view === 'all') result.pruneCandidates = pruneCandiates;
  if (view === 'disabled' || view === 'all') result.disabled = disabled;
  if (view === 'breakdown') result.allBreakdowns = breakdowns.slice(0, limit);

  return result;
}

// ── GET handler — view scores ────────────────────────────────────────────────

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
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
  const sourceId = url.searchParams.get('source');

  const breakdowns = await getSourceScoreBreakdowns();

  // Single source lookup
  if (sourceId) {
    const match = breakdowns.find((b) => b.sourceId === sourceId);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: `Source "${sourceId}" not found or not yet scored` },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, source: match }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  const result = filterByView(breakdowns, view, limit);

  return NextResponse.json({ ok: true, ...result }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}

// ── POST handler — trigger manual scoring run ────────────────────────────────

export async function POST(req: NextRequest) {
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

  const scoringResult = await runSourceScoring();

  return NextResponse.json({
    ok: true,
    message: `Scored ${scoringResult.sourcesScored} sources`,
    ...scoringResult,
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}

// ── PUT handler — manual override ────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: { sourceId?: string; state?: string | null; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { sourceId, state, note } = body;

  if (!sourceId) {
    return NextResponse.json(
      { ok: false, error: 'sourceId is required' },
      { status: 400 },
    );
  }

  // Validate state (null = clear override)
  if (state !== null && state !== undefined && !VALID_STATES.includes(state as SourceState)) {
    return NextResponse.json(
      { ok: false, error: `Invalid state. Valid states: ${VALID_STATES.join(', ')}` },
      { status: 400 },
    );
  }

  await setManualOverride(
    sourceId,
    (state === null || state === undefined) ? null : state as SourceState,
    note,
  );

  return NextResponse.json({
    ok: true,
    message: state === null
      ? `Manual override cleared for "${sourceId}"`
      : `Manual override set for "${sourceId}" → ${state}`,
  });
}
