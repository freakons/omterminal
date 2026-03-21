import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment } from '@/lib/env';
import { MIGRATION_STATEMENTS, ensureSchema } from '@/db/ensureSchema';

export const runtime = 'nodejs';

/**
 * Table names that are created (or verified) by this migration.
 *
 * ── Operator runbook ──────────────────────────────────────────────────────────
 *
 *  Step 1 — Apply schema (idempotent, safe to re-run):
 *    POST /api/migrate?key=<ADMIN_SECRET>
 *
 *  Step 2 — Seed static data into regulations / ai_models / funding_rounds:
 *    POST /api/seed?key=<ADMIN_SECRET>
 *    (uses ON CONFLICT DO NOTHING — safe to re-run; only inserts missing rows)
 *
 *  Step 3 — Verify:
 *    GET /api/health/db
 *
 *  Notes:
 *  - Migration 004 adds the amount_usd_m column; the seed route populates it.
 *  - Re-running /api/seed after new static data is added will insert new rows
 *    but will NOT overwrite existing ones.  To force an update, delete the
 *    target rows first and then re-seed.
 *  - The ADMIN_SECRET query param must match process.env.ADMIN_SECRET.
 *  - Schema is also auto-ensured at the start of each /api/pipeline/run cycle.
 * ──────────────────────────────────────────────────────────────────────────────
 */
const TABLES_CREATED = [
  'articles',
  'intelligence_events',
  'snapshots',
  'signals',
  'events',
  'entities',
  'signal_entities',
  'access_requests',
  'trend_timeseries',
  'trends',
  'insights',
  'pipeline_runs',
  // migration 003
  'regulations',
  'ai_models',
  'funding_rounds',
  // migration 004 column additions
  'funding_rounds.amount_usd_m (column)',
  // migration 005
  'pipeline_locks',
  'page_snapshots',
  'pipeline_runs (extended: trigger_type, articles_*, errors_count, correlation_id, ...)',
  // migration 006
  'signal_contexts',
  // migration 007
  'signal_contexts — composite indexes (status+created_at, signal_id+status)',
  // migration 008
  'signals.significance_score (column)',
  'signals.source_support_count (column)',
  'signals — significance indexes (significance_score, significance_score+created_at)',
  // migration 009
  'alerts',
  // migration 011
  'user_watchlists',
  // migration 012
  'user_email_subscriptions',
  'digest_sends',
  // migration 019
  'product_events',
  // migration 020
  'weekly_reports',
  // migration 014
  'signals.why_this_matters (column)',
  'signals.strategic_impact (column)',
  'signals.who_should_care (column)',
  'signals.prediction (column)',
  // migration 015
  'signals.insight_generated (column)',
  'signals.insight_generated_at (column)',
  'signals.insight_generation_error (column)',
  // migration 016
  'source_health',
  // migration 017
  'signal_clusters',
  // migration 018
  'user_alert_preferences',
  // migration 021
  'articles.source_tier (column)',
  'articles.source_weight (column)',
  // migration 022
  'articles.content_fingerprint (column)',
  // migration 023
  'articles.source_category (column)',
  // migration 024
  'story_clusters',
  'articles.story_cluster_id (column)',
  // title_fingerprint (schema.sql)
  'articles.title_fingerprint (column)',
];

export async function POST(req: NextRequest) {
  validateEnvironment(['DATABASE_URL', 'ADMIN_SECRET', 'CRON_SECRET']);

  const url = new URL(req.url);

  // ADMIN_SECRET is required — accept it via ?key= query param only.
  const keyParam    = url.searchParams.get('key') || '';
  const adminSecret = process.env.ADMIN_SECRET    || '';

  if (!adminSecret || keyParam !== adminSecret) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ok = await ensureSchema();
    if (!ok) {
      return NextResponse.json({ status: 'error', message: 'Migration failed — check logs' }, { status: 500 });
    }

    return NextResponse.json({
      status:        'success',
      statements:     MIGRATION_STATEMENTS.length,
      tablesCreated:  TABLES_CREATED,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[migrate] error:', message);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
