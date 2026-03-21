/**
 * GET  /api/admin/weekly-report — Retrieve the latest (or all) weekly reports
 * POST /api/admin/weekly-report — Generate a new weekly report and persist it
 *
 * Auth: requires x-admin-secret header or CRON_SECRET authorization header
 * (for Vercel cron invocations).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateWeeklyReport,
  saveWeeklyReport,
  getLatestWeeklyReport,
  getWeeklyReports,
} from '@/services/reports/weeklyReportGenerator';

// Vercel function timeout — weekly report generation aggregates across multiple
// tables and can be slow on large datasets.
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !adminSecret && !cronSecret) return false;
  if (!adminSecret && !cronSecret) return true; // dev mode

  const adminHeader = req.headers.get('x-admin-secret') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';

  if (adminSecret && adminHeader === adminSecret) return true;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);

  // Vercel cron triggers GET — detect cron invocations and generate the report
  const isCron = req.headers.get('authorization')?.startsWith('Bearer ') ?? false;
  if (isCron) {
    try {
      const report = await generateWeeklyReport();
      await saveWeeklyReport(report);
      return NextResponse.json({
        ok: true,
        report,
        message: `Weekly report generated for ${report.weekStart} — ${report.weekEnd}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[weekly-report] Cron generation error:', message);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const all = url.searchParams.get('all') === 'true';

  if (all) {
    const reports = await getWeeklyReports(12);
    return NextResponse.json({ ok: true, reports }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const report = await getLatestWeeklyReport();
  return NextResponse.json(
    { ok: true, report },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await generateWeeklyReport();
    await saveWeeklyReport(report);

    return NextResponse.json({
      ok: true,
      report,
      message: `Weekly report generated for ${report.weekStart} — ${report.weekEnd}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[weekly-report] Generation error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
