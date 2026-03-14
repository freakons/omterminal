/**
 * Omterminal — Personal Intelligence Alert Generator
 *
 * Evaluates signals and clusters to produce user-facing alerts that are
 * persisted to the `alerts` table.
 *
 * Platform alert types (active):
 *   signal_high_impact    — signal significance_score >= 75
 *   signal_rising_momentum — signal cluster momentum = 'rising'
 *   trend_detected        — new cluster detected with >= 3 signals
 *   trend_rising          — cluster with rising momentum
 *
 * Personal alert types (future use, disabled):
 *   entity_watch          — signal mentions a watched entity
 *   trend_watch           — user-subscribed trend activity
 *   category_watch        — user-subscribed category activity
 */

import { dbQuery } from '@/db/client';
import type { Signal } from '@/data/mockSignals';
import type { SignalCluster } from '@/lib/signals/clusterSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Platform alerts — generated automatically from signal/trend analysis. */
export type PlatformAlertType =
  | 'signal_high_impact'
  | 'signal_rising_momentum'
  | 'trend_detected'
  | 'trend_rising';

/** Personal alerts — future use, disabled for now. */
export type PersonalAlertType =
  | 'entity_watch'
  | 'trend_watch'
  | 'category_watch';

export type AlertType = PlatformAlertType | PersonalAlertType;

/** Priority levels: 0 = low, 1 = medium, 2 = high */
export type AlertPriority = 0 | 1 | 2;

/** Map alert types to their default priority. */
export const ALERT_PRIORITY_MAP: Record<PlatformAlertType, AlertPriority> = {
  signal_high_impact: 2,
  signal_rising_momentum: 1,
  trend_detected: 1,
  trend_rising: 0,
};

export interface PersonalAlert {
  id: string;
  userId: string | null;
  type: AlertType;
  entityName: string | null;
  signalId: string | null;
  trendId: string | null;
  title: string;
  message: string;
  priority: AlertPriority;
  createdAt: string;
  read: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_IMPACT_THRESHOLD = 75;
const DEDUP_WINDOW_HOURS = 24;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function alertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a duplicate alert already exists within the last 24 hours.
 * Matches on (type AND signal_id) OR (type AND trend_id).
 */
async function isDuplicate(
  type: AlertType,
  signalId: string | null,
  trendId: string | null,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  if (signalId) {
    const rows = await dbQuery<{ count: string }>`
      SELECT COUNT(*) AS count FROM alerts
      WHERE type = ${type} AND signal_id = ${signalId} AND created_at > ${cutoff}
    `;
    if (parseInt(rows[0]?.count ?? '0', 10) > 0) return true;
  }

  if (trendId) {
    const rows = await dbQuery<{ count: string }>`
      SELECT COUNT(*) AS count FROM alerts
      WHERE type = ${type} AND trend_id = ${trendId} AND created_at > ${cutoff}
    `;
    if (parseInt(rows[0]?.count ?? '0', 10) > 0) return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert generators (platform alerts only — personal alerts disabled)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate alerts for high-impact signals (significance_score >= 75).
 */
function generateHighImpactAlerts(signals: Signal[]): PersonalAlert[] {
  const alerts: PersonalAlert[] = [];

  for (const signal of signals) {
    const score = signal.significanceScore ?? (signal.confidence * 100);
    if (score < HIGH_IMPACT_THRESHOLD) continue;

    alerts.push({
      id: alertId(),
      userId: null,
      type: 'signal_high_impact',
      entityName: signal.entityName,
      signalId: signal.id,
      trendId: null,
      title: 'High-impact signal detected',
      message: `${signal.entityName}: ${signal.title}`,
      priority: ALERT_PRIORITY_MAP.signal_high_impact,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return alerts;
}

/**
 * Generate alerts for rising momentum clusters.
 */
function generateMomentumAlerts(clusters: SignalCluster[]): PersonalAlert[] {
  const alerts: PersonalAlert[] = [];

  for (const cluster of clusters) {
    if (cluster.momentum !== 'rising') continue;

    alerts.push({
      id: alertId(),
      userId: null,
      type: 'signal_rising_momentum',
      entityName: cluster.entities[0] ?? null,
      signalId: cluster.signals[0]?.id ?? null,
      trendId: cluster.id,
      title: 'Signal momentum rising',
      message: `${cluster.signalCount} signals indicate accelerating activity in ${cluster.entities.slice(0, 3).join(', ')}.`,
      priority: ALERT_PRIORITY_MAP.signal_rising_momentum,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return alerts;
}

/**
 * Generate alerts when new clusters are detected.
 */
function generateTrendAlerts(clusters: SignalCluster[]): PersonalAlert[] {
  return clusters.map((cluster) => ({
    id: alertId(),
    userId: null,
    type: 'trend_detected' as const,
    entityName: cluster.entities[0] ?? null,
    signalId: null,
    trendId: cluster.id,
    title: 'Emerging trend detected',
    message: cluster.summary,
    priority: ALERT_PRIORITY_MAP.trend_detected,
    createdAt: new Date().toISOString(),
    read: false,
  }));
}

/**
 * Generate alerts for clusters with rising momentum (trend_rising).
 */
function generateTrendRisingAlerts(clusters: SignalCluster[]): PersonalAlert[] {
  const alerts: PersonalAlert[] = [];

  for (const cluster of clusters) {
    if (cluster.momentum !== 'rising') continue;

    alerts.push({
      id: alertId(),
      userId: null,
      type: 'trend_rising',
      entityName: cluster.entities[0] ?? null,
      signalId: null,
      trendId: cluster.id,
      title: 'Signal momentum rising',
      message: `Trend "${cluster.title}" is gaining momentum with ${cluster.signalCount} signals.`,
      priority: ALERT_PRIORITY_MAP.trend_rising,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

async function persistAlerts(alerts: PersonalAlert[]): Promise<void> {
  for (const alert of alerts) {
    await dbQuery`
      INSERT INTO alerts (id, user_id, type, entity_name, signal_id, trend_id, title, message, priority, created_at, read)
      VALUES (
        ${alert.id},
        ${alert.userId},
        ${alert.type},
        ${alert.entityName},
        ${alert.signalId},
        ${alert.trendId},
        ${alert.title},
        ${alert.message},
        ${alert.priority},
        ${alert.createdAt},
        ${alert.read}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateAlertsInput {
  signals: Signal[];
  clusters: SignalCluster[];
}

/**
 * Evaluate signals and clusters against platform alert rules.
 * Deduplicates against existing alerts within 24h before persisting.
 * Personal alerts (entity_watch, trend_watch, category_watch) are disabled.
 */
export async function generateAlerts(input: GenerateAlertsInput): Promise<PersonalAlert[]> {
  const { signals, clusters } = input;

  const candidates = [
    ...generateHighImpactAlerts(signals),
    ...generateMomentumAlerts(clusters),
    ...generateTrendAlerts(clusters),
    ...generateTrendRisingAlerts(clusters),
  ];

  // Deduplicate: skip alerts that already exist within the last 24h
  const unique: PersonalAlert[] = [];
  for (const alert of candidates) {
    const dup = await isDuplicate(alert.type, alert.signalId, alert.trendId);
    if (!dup) {
      unique.push(alert);
    }
  }

  if (unique.length > 0) {
    await persistAlerts(unique);
  }

  return unique;
}
