/**
 * Weekly Product Intelligence Report Generator
 *
 * Queries product_events for the past 7 days and produces an actionable
 * internal report covering:
 *   - Most clicked pages, signals, and entities
 *   - Features with high views but low downstream engagement (confusion)
 *   - Likely ignored modules
 *   - 3 short recommendations
 *
 * Heuristic definitions:
 *
 *   CONFUSION = page has high view count but very low engagement ratio.
 *     - A page/feature is "confusing" if it gets views but users rarely take
 *       a follow-up action (click, track, copy, compare). Specifically:
 *       views >= 5 AND downstream_actions / views < 0.1 (10%)
 *
 *   IGNORED = feature/page has zero or near-zero views relative to the
 *     median across all tracked pages. Specifically:
 *     views < max(1, median_views * 0.1)
 */

import { dbQuery } from '@/db/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyReportData {
  weekStart: string; // ISO date
  weekEnd: string;   // ISO date
  generatedAt: string;

  // Core metrics
  totalEvents: number;
  uniqueUsers: number;

  // Rankings
  mostClickedPages: Array<{ path: string; views: number }>;
  mostClickedSignals: Array<{ signalId: string; opens: number }>;
  mostClickedEntities: Array<{ entitySlug: string; views: number }>;

  // Engagement analysis
  featureEngagement: Array<{
    feature: string;
    views: number;
    actions: number;
    engagementRate: number;
  }>;

  // Heuristic-inferred insights
  confusionHotspots: Array<{
    feature: string;
    views: number;
    actions: number;
    engagementRate: number;
    reason: string;
  }>;

  ignoredModules: Array<{
    feature: string;
    views: number;
    reason: string;
  }>;

  // Recommendations
  recommendations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Known features/pages we expect to see engagement for
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_FEATURES = [
  { name: 'Homepage', pathPrefix: '/', exact: true },
  { name: 'Signals Dashboard', pathPrefix: '/dashboard/signals' },
  { name: 'Entity Pages', pathPrefix: '/entity/' },
  { name: 'Graph', pathPrefix: '/graph' },
  { name: 'Compare', pathPrefix: '/compare' },
  { name: 'Watchlist', pathPrefix: '/watchlist' },
  { name: 'Alerts', pathPrefix: '/alerts' },
];

// Which event types count as "downstream actions" (not just views)
const ACTION_EVENT_TYPES = new Set([
  'signal_opened',
  'entity_tracked',
  'entity_untracked',
  'quick_action_clicked',
  'filter_used',
  'graph_interaction',
  'compare_used',
  'copy_insight',
  'alert_read',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWeeklyReport(): Promise<WeeklyReportData> {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const startIso = weekStart.toISOString();
  const endIso = weekEnd.toISOString();

  // ── 1. Total events & unique users ──

  type SummaryRow = { total: string; users: string };
  const summaryRows = await dbQuery<SummaryRow>`
    SELECT
      COUNT(*)::text AS total,
      COUNT(DISTINCT user_id)::text AS users
    FROM product_events
    WHERE created_at >= ${startIso}
      AND created_at <= ${endIso}
  `;
  const totalEvents = parseInt(summaryRows[0]?.total ?? '0', 10);
  const uniqueUsers = parseInt(summaryRows[0]?.users ?? '0', 10);

  // ── 2. Events by type ──

  type EventTypeRow = { event_type: string; cnt: string };
  const eventsByType = await dbQuery<EventTypeRow>`
    SELECT event_type, COUNT(*)::text AS cnt
    FROM product_events
    WHERE created_at >= ${startIso}
      AND created_at <= ${endIso}
    GROUP BY event_type
    ORDER BY COUNT(*) DESC
  `;

  // ── 3. Page views by path ──

  type PageViewRow = { path: string; views: string };
  const pageViews = await dbQuery<PageViewRow>`
    SELECT
      properties->>'path' AS path,
      COUNT(*)::text AS views
    FROM product_events
    WHERE event_type = 'page_view'
      AND created_at >= ${startIso}
      AND created_at <= ${endIso}
      AND properties->>'path' IS NOT NULL
    GROUP BY properties->>'path'
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;
  const mostClickedPages = pageViews.map((r) => ({
    path: r.path,
    views: parseInt(r.views, 10),
  }));

  // ── 4. Most opened signals ──

  type SignalRow = { signal_id: string; opens: string };
  const signalRows = await dbQuery<SignalRow>`
    SELECT signal_id, COUNT(*)::text AS opens
    FROM product_events
    WHERE event_type = 'signal_opened'
      AND signal_id IS NOT NULL
      AND created_at >= ${startIso}
      AND created_at <= ${endIso}
    GROUP BY signal_id
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `;
  const mostClickedSignals = signalRows.map((r) => ({
    signalId: r.signal_id,
    opens: parseInt(r.opens, 10),
  }));

  // ── 5. Most viewed entities (page_view to /entity/ paths + entity_tracked) ──

  type EntityRow = { entity_slug: string; views: string };
  const entityRows = await dbQuery<EntityRow>`
    SELECT
      COALESCE(
        entity_slug,
        REGEXP_REPLACE(properties->>'path', '^/entity/', '')
      ) AS entity_slug,
      COUNT(*)::text AS views
    FROM product_events
    WHERE created_at >= ${startIso}
      AND created_at <= ${endIso}
      AND (
        (event_type = 'page_view' AND properties->>'path' LIKE '/entity/%')
        OR event_type = 'entity_tracked'
      )
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `;
  const mostClickedEntities = entityRows.map((r) => ({
    entitySlug: r.entity_slug,
    views: parseInt(r.views, 10),
  }));

  // ── 6. Feature engagement analysis ──

  // Build a map: feature → { views, actions }
  const featureMap = new Map<string, { views: number; actions: number }>();
  for (const feat of KNOWN_FEATURES) {
    featureMap.set(feat.name, { views: 0, actions: 0 });
  }

  // Count page_view events per feature
  for (const pv of mostClickedPages) {
    for (const feat of KNOWN_FEATURES) {
      if (feat.exact && pv.path === feat.pathPrefix) {
        const entry = featureMap.get(feat.name)!;
        entry.views += pv.views;
      } else if (!feat.exact && pv.path.startsWith(feat.pathPrefix)) {
        const entry = featureMap.get(feat.name)!;
        entry.views += pv.views;
      }
    }
  }

  // Count action events per feature mapping
  const eventTypeCounts = new Map<string, number>();
  for (const row of eventsByType) {
    eventTypeCounts.set(row.event_type, parseInt(row.cnt, 10));
  }

  // Attribute actions to features
  const featureActionMap: Record<string, string[]> = {
    'Homepage': ['quick_action_clicked'],
    'Signals Dashboard': ['signal_opened', 'filter_used'],
    'Entity Pages': ['entity_tracked', 'entity_untracked', 'copy_insight'],
    'Graph': ['graph_interaction'],
    'Compare': ['compare_used'],
    'Watchlist': ['entity_tracked', 'entity_untracked'],
    'Alerts': ['alert_read'],
  };

  for (const [featName, actionTypes] of Object.entries(featureActionMap)) {
    const entry = featureMap.get(featName);
    if (!entry) continue;
    for (const at of actionTypes) {
      entry.actions += eventTypeCounts.get(at) ?? 0;
    }
  }

  const featureEngagement = Array.from(featureMap.entries()).map(([feature, data]) => ({
    feature,
    views: data.views,
    actions: data.actions,
    engagementRate: data.views > 0 ? Math.round((data.actions / data.views) * 100) / 100 : 0,
  }));

  // ── 7. Confusion heuristic ──
  // High views but low engagement rate (< 10%) and at least 5 views

  const confusionHotspots = featureEngagement
    .filter((f) => f.views >= 5 && f.engagementRate < 0.1)
    .map((f) => ({
      feature: f.feature,
      views: f.views,
      actions: f.actions,
      engagementRate: f.engagementRate,
      reason: `${f.views} views but only ${f.actions} follow-up actions (${Math.round(f.engagementRate * 100)}% engagement) — users may not know what to do next`,
    }));

  // ── 8. Ignored heuristic ──
  // Features with views below 10% of the median

  const viewCounts = featureEngagement.map((f) => f.views).sort((a, b) => a - b);
  const medianViews = viewCounts.length > 0
    ? viewCounts[Math.floor(viewCounts.length / 2)]
    : 0;
  const ignoreThreshold = Math.max(1, Math.floor(medianViews * 0.1));

  const ignoredModules = featureEngagement
    .filter((f) => f.views < ignoreThreshold)
    .map((f) => ({
      feature: f.feature,
      views: f.views,
      reason: f.views === 0
        ? 'Zero views this week — feature may be undiscoverable'
        : `Only ${f.views} views (threshold: ${ignoreThreshold}) — significantly below median`,
    }));

  // ── 9. Generate recommendations ──

  const recommendations: string[] = [];

  if (confusionHotspots.length > 0) {
    const top = confusionHotspots[0];
    recommendations.push(
      `Add clearer CTAs to ${top.feature} — it gets ${top.views} views but only ${top.actions} follow-up actions.`
    );
  }

  if (ignoredModules.length > 0) {
    const top = ignoredModules[0];
    recommendations.push(
      `Increase visibility of ${top.feature} — it had only ${top.views} views this week. Consider adding homepage links or prompts.`
    );
  }

  if (mostClickedEntities.length > 0) {
    const topEntity = mostClickedEntities[0];
    recommendations.push(
      `Double down on ${topEntity.entitySlug} content — it was the most viewed entity with ${topEntity.views} interactions.`
    );
  }

  // Fill to 3 if needed
  if (recommendations.length < 3 && totalEvents > 0) {
    const totalActions = eventsByType
      .filter((r) => ACTION_EVENT_TYPES.has(r.event_type))
      .reduce((sum, r) => sum + parseInt(r.cnt, 10), 0);
    const overallRate = totalEvents > 0 ? Math.round((totalActions / totalEvents) * 100) : 0;
    recommendations.push(
      `Overall engagement rate is ${overallRate}% (${totalActions} actions / ${totalEvents} events). ${overallRate < 20 ? 'Consider adding more interactive elements.' : 'Engagement is healthy.'}`
    );
  }

  while (recommendations.length < 3) {
    recommendations.push('Not enough data to generate additional recommendations — check back next week.');
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    generatedAt: now.toISOString(),
    totalEvents,
    uniqueUsers,
    mostClickedPages,
    mostClickedSignals,
    mostClickedEntities,
    featureEngagement,
    confusionHotspots,
    ignoredModules,
    recommendations: recommendations.slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

/** Persist a weekly report to the database (upsert by week_start). */
export async function saveWeeklyReport(report: WeeklyReportData): Promise<void> {
  await dbQuery`
    INSERT INTO weekly_reports (week_start, week_end, report_data)
    VALUES (${report.weekStart}, ${report.weekEnd}, ${JSON.stringify(report)})
    ON CONFLICT (week_start)
    DO UPDATE SET
      week_end = EXCLUDED.week_end,
      report_data = EXCLUDED.report_data,
      created_at = NOW()
  `;
}

/** Get the latest weekly report. */
export async function getLatestWeeklyReport(): Promise<WeeklyReportData | null> {
  type Row = { report_data: WeeklyReportData };
  const rows = await dbQuery<Row>`
    SELECT report_data
    FROM weekly_reports
    ORDER BY week_start DESC
    LIMIT 1
  `;
  return rows[0]?.report_data ?? null;
}

/** Get all weekly reports (most recent first). */
export async function getWeeklyReports(limit = 12): Promise<WeeklyReportData[]> {
  type Row = { report_data: WeeklyReportData };
  const rows = await dbQuery<Row>`
    SELECT report_data
    FROM weekly_reports
    ORDER BY week_start DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.report_data);
}
