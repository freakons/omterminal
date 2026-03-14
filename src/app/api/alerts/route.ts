/**
 * Omterminal — Alerts API
 *
 * GET  /api/alerts              — fetch recent alerts + unread count
 *   ?since=<ISO timestamp>      — only return alerts created after this time
 *   ?limit=<number>             — max alerts to return (default 20)
 * PATCH /api/alerts             — mark alert(s) as read
 *   body: { id: string }        — mark single alert read
 *   body: { all: true }         — mark all alerts read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, getUnreadAlertCount, markAlertRead, markAllAlertsRead } from '@/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const since = searchParams.get('since') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);

    const [alerts, unreadCount] = await Promise.all([
      getAlerts(limit, since),
      getUnreadAlertCount(),
    ]);
    return NextResponse.json({ alerts, unreadCount });
  } catch {
    return NextResponse.json({ alerts: [], unreadCount: 0 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (body.all === true) {
      await markAllAlertsRead();
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === 'string') {
      await markAlertRead(body.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Missing id or all parameter' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}
