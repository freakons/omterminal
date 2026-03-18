'use client';

/**
 * AlertsPanel — in-app surface for watchlist alerts.
 *
 * Displays platform and personal alerts grouped by entity (personal first),
 * sorted latest first. "New" badges mark alerts created since the user's
 * last visit (tracked via localStorage — same pattern as WatchlistDigest).
 *
 * Data flow: /api/alerts (GET) → alerts[] + unreadCount
 * Read state: PATCH /api/alerts { id } or { all: true }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { AlertRecord } from '@/db/queries';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LAST_VISIT_KEY = 'omterminal_alerts_last_visit';

// ─────────────────────────────────────────────────────────────────────────────
// Alert type → visual config
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  signal_high_impact:         { label: 'High Impact', color: 'var(--rose, #fb7185)' },
  signal_rising_momentum:     { label: 'Momentum',    color: 'var(--amber, #fbbf24)' },
  trend_detected:             { label: 'Trend',       color: 'var(--violet, #a78bfa)' },
  trend_rising:               { label: 'Rising',      color: 'var(--amber, #fbbf24)' },
  watched_entity_high_impact: { label: 'High Impact', color: 'var(--rose, #fb7185)' },
  watched_entity_rising:      { label: 'Momentum',    color: 'var(--amber, #fbbf24)' },
  watched_entity_trend:       { label: 'Trend',       color: 'var(--violet, #a78bfa)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: 'var(--r)',
  background: 'var(--glass)',
  border: '1px solid var(--border)',
};

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AlertTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? { label: type, color: 'var(--text2)' };
  return (
    <span style={{
      fontFamily: 'var(--fm)',
      fontSize: 8,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: config.color,
      border: `1px solid ${config.color}`,
      borderRadius: 4,
      padding: '2px 5px',
      flexShrink: 0,
    }}>
      {config.label}
    </span>
  );
}

function NewBadge() {
  return (
    <span style={{
      fontFamily: 'var(--fm)',
      fontSize: 8,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#4ade80',
      background: 'rgba(74,222,128,0.10)',
      border: '1px solid rgba(74,222,128,0.25)',
      borderRadius: 4,
      padding: '2px 5px',
      flexShrink: 0,
    }}>
      new
    </span>
  );
}

function WatchingBadge() {
  return (
    <span style={{
      fontFamily: 'var(--fm)',
      fontSize: 8,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--indigo, #4f46e5)',
      border: '1px solid var(--indigo, #4f46e5)',
      borderRadius: 4,
      padding: '2px 5px',
      flexShrink: 0,
      opacity: 0.8,
    }}>
      watching
    </span>
  );
}

interface AlertRowProps {
  alert: AlertRecord;
  isNew: boolean;
  onMarkRead: (id: string) => void;
}

function AlertRow({ alert, isNew, onMarkRead }: AlertRowProps) {
  const href = alert.signalId
    ? `/signals/${encodeURIComponent(alert.signalId)}`
    : undefined;

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: '12px 0 12px 10px',
    borderBottom: '1px solid var(--border)',
    opacity: alert.read ? 0.55 : 1,
    transition: 'opacity 0.2s',
    textDecoration: 'none',
    cursor: href ? 'pointer' : 'default',
  };

  const content = (
    <>
      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <AlertTypeBadge type={alert.type} />
        {alert.userId && <WatchingBadge />}
        {isNew && <NewBadge />}
        {!alert.read && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--indigo, #4f46e5)',
            display: 'inline-block',
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* Title */}
      <span style={{
        fontFamily: 'var(--fd)',
        fontSize: 14,
        fontStyle: 'italic',
        color: 'var(--text)',
        letterSpacing: '-0.01em',
        lineHeight: 1.4,
      }}>
        {alert.title}
      </span>

      {/* Message */}
      {alert.message && (
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 11,
          color: 'var(--text2)',
          lineHeight: 1.5,
        }}>
          {alert.message}
        </span>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {alert.entityName && (
          <span style={{
            fontFamily: 'var(--fm)',
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}>
            {alert.entityName}
          </span>
        )}
        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
          {timeAgo(alert.createdAt)}
        </span>
        {href && (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--indigo, #4f46e5)', letterSpacing: '0.04em' }}>
            View signal →
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} style={rowStyle} onClick={() => { if (!alert.read) onMarkRead(alert.id); }}>
        {content}
      </Link>
    );
  }

  return <div style={rowStyle}>{content}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert grouping
// ─────────────────────────────────────────────────────────────────────────────

interface AlertGroup {
  key: string;
  label: string;
  isPersonal: boolean;
  slug: string | null;
  alerts: AlertRecord[];
}

function groupAlerts(alerts: AlertRecord[]): AlertGroup[] {
  const personalByEntity = new Map<string, AlertRecord[]>();
  const platformAlerts: AlertRecord[] = [];

  for (const alert of alerts) {
    if (alert.userId) {
      const entity = alert.entityName ?? 'Other';
      const existing = personalByEntity.get(entity) ?? [];
      existing.push(alert);
      personalByEntity.set(entity, existing);
    } else {
      platformAlerts.push(alert);
    }
  }

  const groups: AlertGroup[] = [];

  // Personal groups first, sorted by most recent alert in group
  for (const [entity, groupAlerts] of personalByEntity.entries()) {
    groups.push({
      key: `personal-${entity}`,
      label: entity,
      isPersonal: true,
      slug: entity.toLowerCase().replace(/\s+/g, '-'),
      alerts: groupAlerts,
    });
  }

  groups.sort((a, b) => {
    const aLatest = Math.max(...a.alerts.map((al) => new Date(al.createdAt).getTime()));
    const bLatest = Math.max(...b.alerts.map((al) => new Date(al.createdAt).getTime()));
    return bLatest - aLatest;
  });

  if (platformAlerts.length > 0) {
    groups.push({
      key: 'platform',
      label: 'Platform Signals',
      isPersonal: false,
      slug: null,
      alerts: platformAlerts,
    });
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch state
// ─────────────────────────────────────────────────────────────────────────────

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; alerts: AlertRecord[]; unreadCount: number };

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function AlertsPanel() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  // Read last visit timestamp on mount, then update it after a short delay so
  // the user sees "new" badges before the timestamp is reset.
  useEffect(() => {
    const stored = localStorage.getItem(LAST_VISIT_KEY);
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setLastVisit(d);
    }
    const t = setTimeout(() => {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?limit=50');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setState({
        status: 'done',
        alerts: data.alerts ?? [],
        unreadCount: data.unreadCount ?? 0,
      });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Optimistic mark-read — update local state then persist
  const markRead = useCallback((id: string) => {
    setState((prev) => {
      if (prev.status !== 'done') return prev;
      return {
        ...prev,
        alerts: prev.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      };
    });
    fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'done') return prev;
      return {
        ...prev,
        alerts: prev.alerts.map((a) => ({ ...a, read: true })),
        unreadCount: 0,
      };
    });
    fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, []);

  const groups = useMemo(() => {
    if (state.status !== 'done') return [];
    return groupAlerts(state.alerts);
  }, [state]);

  const newCount = useMemo(() => {
    if (state.status !== 'done' || !lastVisit) return null;
    return state.alerts.filter((a) => new Date(a.createdAt) > lastVisit).length;
  }, [state, lastVisit]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return (
      <div style={GLASS_CARD}>
        <div style={{ ...SECTION_HEADER, marginBottom: 12 }}>Alerts</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Loading alerts...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={GLASS_CARD}>
        <div style={{ ...SECTION_HEADER, marginBottom: 12 }}>Alerts</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          Unable to load alerts right now. Try again later.
        </p>
      </div>
    );
  }

  if (state.alerts.length === 0) {
    return (
      <div style={{ ...GLASS_CARD, textAlign: 'center', padding: '32px 24px' }}>
        <svg
          viewBox="0 0 24 24"
          width={28}
          height={28}
          fill="none"
          stroke="var(--text3)"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 12, opacity: 0.5 }}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <p style={{
          fontFamily: 'var(--fd)',
          fontSize: 15,
          fontStyle: 'italic',
          color: 'var(--text3)',
          marginBottom: 6,
          marginTop: 0,
        }}>
          No alerts yet
        </p>
        <p style={{
          fontSize: 12,
          color: 'var(--text3)',
          lineHeight: 1.7,
          maxWidth: 360,
          margin: '0 auto',
        }}>
          Alerts are generated when high-impact signals or trends are detected
          for entities you watch.
        </p>
      </div>
    );
  }

  const hasUnread = state.unreadCount > 0;

  return (
    <div style={GLASS_CARD}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={SECTION_HEADER}>
            Alerts · {state.alerts.length}
          </span>
          {hasUnread && (
            <span style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              letterSpacing: '0.08em',
              color: 'var(--indigo, #4f46e5)',
              background: 'rgba(79,70,229,0.12)',
              border: '1px solid rgba(79,70,229,0.25)',
              borderRadius: 10,
              padding: '2px 7px',
            }}>
              {state.unreadCount} unread
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {newCount !== null && newCount > 0 && (
            <span style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: '#4ade80',
            }}>
              {newCount} new since last visit
            </span>
          )}
          {hasUnread && (
            <button
              onClick={markAllRead}
              style={{
                fontFamily: 'var(--fm)',
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text3)',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Alert groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {groups.map((group) => (
          <div key={group.key}>
            {/* Group header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}>
              <span style={{
                fontFamily: 'var(--fm)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: group.isPersonal ? 'var(--text2)' : 'var(--text3)',
                fontWeight: group.isPersonal ? 500 : 400,
              }}>
                {group.label}
              </span>
              {group.isPersonal && group.slug && (
                <Link
                  href={`/entity/${group.slug}`}
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 9,
                    color: 'var(--text3)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                  }}
                  title={`View ${group.label} entity page`}
                >
                  ↗
                </Link>
              )}
              <span style={{
                fontFamily: 'var(--fm)',
                fontSize: 9,
                color: 'var(--text3)',
              }}>
                {group.alerts.length} {group.alerts.length === 1 ? 'alert' : 'alerts'}
              </span>
            </div>

            {/* Alert rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {group.alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isNew={lastVisit !== null && new Date(alert.createdAt) > lastVisit}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
