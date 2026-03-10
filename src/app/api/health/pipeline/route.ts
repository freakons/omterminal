export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getPipelineHealth } from '@/lib/pipelineHealth';

/**
 * GET /api/health/pipeline
 *
 * Requires x-admin-secret header for access.
 * Returns in-process pipeline health state (last_run, signals_ingested, status).
 */
export function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const provided    = req.headers.get('x-admin-secret') ?? '';

  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ ok: false, status: 'unauthorized' }, { status: 401 });
  }

  return Response.json(getPipelineHealth());
}
