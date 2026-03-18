/**
 * Omterminal — Alert Preferences API
 *
 * GET  /api/alerts/preferences  — Fetch current preferences for the calling user.
 *                                 Returns DEFAULT_ALERT_PREFERENCES if no row exists yet.
 * POST /api/alerts/preferences  — Upsert one or more preference fields.
 *                                 Only provided fields are updated.
 *
 * Request body (POST, all fields optional):
 *   { digestEnabled?: boolean, highImpactOnly?: boolean, includeTrendAlerts?: boolean }
 *
 * Requires the omterminal_uid cookie (anonymous user identity).
 * Returns 401 if the cookie is absent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/userId';
import {
  getAlertPreferences,
  upsertAlertPreferences,
  DEFAULT_ALERT_PREFERENCES,
} from '@/db/queries';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'No user identity' }, { status: 401 });
  }

  try {
    const prefs = await getAlertPreferences(userId);
    return NextResponse.json({
      ok: true,
      preferences: prefs
        ? {
            digestEnabled: prefs.digestEnabled,
            highImpactOnly: prefs.highImpactOnly,
            includeTrendAlerts: prefs.includeTrendAlerts,
          }
        : { ...DEFAULT_ALERT_PREFERENCES },
    });
  } catch (err) {
    console.error('[preferences] GET error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'No user identity' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Only accept known boolean fields
  const update: Partial<{ digestEnabled: boolean; highImpactOnly: boolean; includeTrendAlerts: boolean }> = {};

  if ('digestEnabled' in body) {
    if (typeof body.digestEnabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'digestEnabled must be a boolean' }, { status: 400 });
    }
    update.digestEnabled = body.digestEnabled;
  }
  if ('highImpactOnly' in body) {
    if (typeof body.highImpactOnly !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'highImpactOnly must be a boolean' }, { status: 400 });
    }
    update.highImpactOnly = body.highImpactOnly;
  }
  if ('includeTrendAlerts' in body) {
    if (typeof body.includeTrendAlerts !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'includeTrendAlerts must be a boolean' }, { status: 400 });
    }
    update.includeTrendAlerts = body.includeTrendAlerts;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields provided' }, { status: 400 });
  }

  try {
    const saved = await upsertAlertPreferences(userId, update);
    return NextResponse.json({
      ok: true,
      preferences: {
        digestEnabled: saved.digestEnabled,
        highImpactOnly: saved.highImpactOnly,
        includeTrendAlerts: saved.includeTrendAlerts,
      },
    });
  } catch (err) {
    console.error('[preferences] POST error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to save preferences' }, { status: 500 });
  }
}
