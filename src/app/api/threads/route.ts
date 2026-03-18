export const runtime = 'nodejs';
/**
 * Omterminal — Daily Intelligence Threads API
 *
 * Generates social-ready intelligence threads from top signals.
 *
 * GET /api/threads
 *   Returns Twitter thread + LinkedIn post for today's top signals.
 *
 * GET /api/threads?date=2026-03-18
 *   Returns threads for a specific date (uses all available signals).
 *
 * GET /api/threads?format=twitter
 *   Returns only the Twitter thread.
 *
 * GET /api/threads?format=linkedin
 *   Returns only the LinkedIn post.
 *
 * GET /api/threads?max=3
 *   Limits the number of signals included (default: 5, max: 10).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '@/db/queries';
import { MOCK_SIGNALS } from '@/data/mockSignals';
import type { Signal } from '@/data/mockSignals';
import {
  generateDailyThreads,
  generateTwitterThread,
  generateLinkedInPost,
  selectTopSignals,
} from '@/services/reports/threadGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadSignals(): Promise<{ signals: Signal[]; source: string }> {
  try {
    const dbSignals = await getSignals();
    if (dbSignals && dbSignals.length > 0) {
      return { signals: dbSignals as unknown as Signal[], source: 'db' };
    }
  } catch {
    // DB unavailable — fall through to mock data
  }
  return { signals: MOCK_SIGNALS, source: 'mock' };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const format = searchParams.get('format'); // 'twitter' | 'linkedin' | null (both)
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const maxParam = searchParams.get('max');
  const max = maxParam ? Math.min(Math.max(parseInt(maxParam, 10) || 5, 1), 10) : 5;

  const { signals, source } = await loadSignals();

  if (signals.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No signals available for thread generation' },
      { status: 404 },
    );
  }

  const top = selectTopSignals(signals, max);

  if (format === 'twitter') {
    const twitter = generateTwitterThread(top, date);
    return NextResponse.json({
      ok: true,
      source,
      date,
      twitter,
    });
  }

  if (format === 'linkedin') {
    const linkedin = generateLinkedInPost(top, date);
    return NextResponse.json({
      ok: true,
      source,
      date,
      linkedin,
    });
  }

  // Default: return both formats
  const output = generateDailyThreads(top, date);
  return NextResponse.json({
    ok: true,
    source,
    ...output,
  });
}
