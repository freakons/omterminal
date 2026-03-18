/**
 * GET /api/admin/analytics — Internal product analytics data
 *
 * Returns aggregated engagement metrics for the /admin/analytics dashboard.
 * Requires x-admin-secret header matching ADMIN_SECRET env variable.
 *
 * Response shape:
 *   engagement      — overall engagement summary (watchers, events 7d, alert read rate)
 *   topEntities     — top watched entities by distinct watcher count
 *   topSignals      — most opened signals in the last 30 days
 *   alertVolume     — alert counts grouped by type with unread breakdown
 *   digest          — digest delivery stats (total sends, recipients, 7-day window)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getEngagementSummary,
  getTopWatchedEntities,
  getTopOpenedSignals,
  getAlertVolumeByType,
  getDigestStats,
} from '@/db/queries';

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !adminSecret) return false;
  if (!adminSecret) return true;
  const header = req.headers.get('x-admin-secret') ?? '';
  return header === adminSecret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [engagement, topEntities, topSignals, alertVolume, digest] = await Promise.all([
    getEngagementSummary(),
    getTopWatchedEntities(20),
    getTopOpenedSignals(10),
    getAlertVolumeByType(),
    getDigestStats(),
  ]);

  return NextResponse.json(
    { ok: true, engagement, topEntities, topSignals, alertVolume, digest },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
