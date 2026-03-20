/**
 * POST /api/analytics/track — Lightweight product event capture
 *
 * Fire-and-forget endpoint for recording user interactions with signals,
 * watchlists, alerts, and digests. Always returns HTTP 200 so that callers
 * can safely skip awaiting the response and the event capture never
 * interrupts product flows.
 *
 * Body (all optional except eventType):
 *   eventType   string   — one of the ProductEventType enum values
 *   userId      string   — anonymous omterminal_uid (client can omit; server reads cookie)
 *   entitySlug  string   — entity involved in the event
 *   signalId    string   — signal involved in the event
 *   alertId     string   — alert involved in the event
 *   properties  object   — arbitrary per-event metadata (capped at 2 KB)
 *
 * Privacy: no IP addresses, emails, or PII stored. userId is the same
 * anonymous cookie UUID already used by watchlists and digests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackProductEvent, type ProductEventType } from '@/db/queries';
import { getUserIdFromRequest } from '@/lib/userId';

const ALLOWED_EVENT_TYPES = new Set<ProductEventType>([
  'signal_opened',
  'alert_opened',
  'alert_read',
  'entity_tracked',
  'entity_untracked',
  'digest_sent',
  'digest_skipped',
  'email_click',
  'page_view',
  'filter_used',
  'quick_action_clicked',
  'graph_interaction',
  'compare_used',
  'copy_insight',
]);

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // malformed JSON — still return 200 to not block callers
      return NextResponse.json({ ok: false, error: 'invalid json' });
    }

    const eventType = body.eventType as string | undefined;
    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType as ProductEventType)) {
      return NextResponse.json({ ok: false, error: 'unknown event type' });
    }

    // prefer userId from body, fall back to cookie
    const userId =
      typeof body.userId === 'string' ? body.userId : (getUserIdFromRequest(req) ?? null);

    const properties = body.properties && typeof body.properties === 'object'
      ? body.properties as Record<string, unknown>
      : null;

    // Silently cap properties payload to prevent abuse
    const propsJson = properties ? JSON.stringify(properties) : null;
    const safeProps = propsJson && propsJson.length <= 2048 ? properties : null;

    // non-blocking insert — errors are swallowed inside trackProductEvent
    void trackProductEvent({
      eventType: eventType as ProductEventType,
      userId,
      entitySlug: typeof body.entitySlug === 'string' ? body.entitySlug : null,
      signalId: typeof body.signalId === 'string' ? body.signalId : null,
      alertId: typeof body.alertId === 'string' ? body.alertId : null,
      properties: safeProps,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // analytics must never surface errors to callers
    return NextResponse.json({ ok: false });
  }
}
