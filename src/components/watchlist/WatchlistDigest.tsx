'use client';

/**
 * WatchlistDigest — on-site daily digest panel for watched entities.
 *
 * Surfaces:
 *   • Top signals ranked by significance (significance_score → confidence)
 *   • Count of new signals in last 24h / 7d
 *   • Most active tracked entities by signal volume
 *   • Freshness cues: "new" badges, recency timestamps, new-since-last-visit count
 *
 * All computation is client-side over the signals already fetched by the
 * watchlist page — no additional API calls.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Signal } from '@/data/mockSignals';
import type { WatchedEntity } from '@/hooks/useWatchlist';
import { SignalImpactBadge } from '@/components/signals/SignalImpactBadge';
import { SignalMomentumBadge } from '@/components/signals/SignalMomentumBadge';
import { Badge } from '@/components/ui/Badge';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LAST_VISIT_KEY = 'omterminal_watchlist_last_visit';
const TOP_SIGNALS_COUNT = 5;
const MOST_ACTIVE_COUNT = 3;

const H24_MS = 24 * 60 * 60 * 1000;
const D7_MS = 7 * H24_MS;

// ─────────────────────────────────────────────────────────────────────────────
// Styles (matching existing watchlist page patterns)
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 16,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: 'var(--r)',
  background: 'var(--glass)',
  border: '1px solid var(--border)',
};

const STAT_LABEL: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 9,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
};

const STAT_VALUE: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 22,
  fontWeight: 500,
  color: 'var(--text)',
  lineHeight: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function signalRankScore(signal: Signal): number {
  return signal.significanceScore ?? signal.confidence ?? 0;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return 'just now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'less than 1h ago';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function isNew24h(dateStr: string): boolean {
  try {
    return Date.now() - new Date(dateStr).getTime() < H24_MS;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

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

function DigestStatBar({
  new24h,
  new7d,
  newSinceVisit,
}: {
  new24h: number;
  new7d: number;
  newSinceVisit: number | null;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={STAT_VALUE}>{new24h}</div>
        <div style={{ ...STAT_LABEL, marginTop: 4 }}>new · 24h</div>
      </div>
      <div>
        <div style={STAT_VALUE}>{new7d}</div>
        <div style={{ ...STAT_LABEL, marginTop: 4 }}>signals · 7d</div>
      </div>
      {newSinceVisit !== null && newSinceVisit > 0 && (
        <div>
          <div style={{ ...STAT_VALUE, color: '#4ade80' }}>{newSinceVisit}</div>
          <div style={{ ...STAT_LABEL, marginTop: 4 }}>since last visit</div>
        </div>
      )}
    </div>
  );
}

function TopSignalRow({ signal }: { signal: Signal }) {
  const fresh = isNew24h(signal.date);
  return (
    <Link
      href={`/signals/${encodeURIComponent(signal.id)}`}
      style={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        padding: '12px 0 12px 10px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <Badge category={signal.category} />
        <SignalImpactBadge
          signal={{
            significanceScore: signal.significanceScore,
            confidenceScore: signal.confidence,
            sourceSupportCount: signal.sourceSupportCount,
            affectedEntitiesCount: signal.context?.affectedEntities?.length ?? null,
          }}
          showLabel={false}
        />
        {signal.momentum && (
          <SignalMomentumBadge momentum={signal.momentum} showLabel={false} />
        )}
        {fresh && <NewBadge />}
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
        {signal.title}
      </span>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }}>
          {signal.entityName || 'Intelligence'}
        </span>
        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
          {formatRelativeTime(signal.date)}
        </span>
        {signal.significanceScore != null && (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}
            title="Significance score">
            sig {signal.significanceScore}
          </span>
        )}
      </div>
    </Link>
  );
}

function MostActiveRow({
  entity,
  count,
  latestDate,
}: {
  entity: WatchedEntity;
  count: number;
  latestDate: string | null;
}) {
  return (
    <Link
      href={`/entity/${entity.slug}`}
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0 10px 10px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--fd)',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {entity.name}
        </span>
        {latestDate && (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
            latest {formatRelativeTime(latestDate)}
          </span>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 11,
          color: 'var(--text2)',
        }}>
          {count}
        </span>
        <span style={STAT_LABEL}>signals</span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface WatchlistDigestProps {
  signals: Signal[];
  entities: WatchedEntity[];
}

export function WatchlistDigest({ signals, entities }: WatchlistDigestProps) {
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  // Read last visit timestamp, then update it after a short delay so the user
  // sees "new since last visit" counts before they're reset.
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

  // ── Computed digest values ────────────────────────────────────────────────

  const now = Date.now();

  const { new24h, new7d, newSinceVisit, topSignals, mostActiveEntities } = useMemo(() => {
    const new24h = signals.filter((s) => {
      try { return now - new Date(s.date).getTime() < H24_MS; } catch { return false; }
    }).length;

    const new7d = signals.filter((s) => {
      try { return now - new Date(s.date).getTime() < D7_MS; } catch { return false; }
    }).length;

    const newSinceVisit = lastVisit
      ? signals.filter((s) => {
          try { return new Date(s.date) > lastVisit; } catch { return false; }
        }).length
      : null;

    // Top signals ranked by significance → confidence
    const topSignals = [...signals]
      .sort((a, b) => signalRankScore(b) - signalRankScore(a))
      .slice(0, TOP_SIGNALS_COUNT);

    // Most active entities: signal count + latest signal date
    const entityMap = new Map<string, { count: number; latestDate: string | null }>();
    for (const signal of signals) {
      const name = signal.entityName;
      if (!name) continue;
      const prev = entityMap.get(name) ?? { count: 0, latestDate: null };
      const sDate = signal.date;
      const isLater =
        !prev.latestDate ||
        (sDate && new Date(sDate) > new Date(prev.latestDate));
      entityMap.set(name, {
        count: prev.count + 1,
        latestDate: isLater ? sDate : prev.latestDate,
      });
    }

    const sortedEntities = [...entityMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, MOST_ACTIVE_COUNT);

    // Resolve WatchedEntity objects for the active entity names
    const entityByName = new Map(entities.map((e) => [e.name, e]));
    const mostActiveEntities = sortedEntities
      .map(([name, stats]) => ({
        entity: entityByName.get(name),
        count: stats.count,
        latestDate: stats.latestDate,
        name,
      }))
      .filter((r) => r.entity !== undefined) as Array<{
        entity: WatchedEntity;
        count: number;
        latestDate: string | null;
        name: string;
      }>;

    return { new24h, new7d, newSinceVisit, topSignals, mostActiveEntities };
  }, [signals, entities, lastVisit, now]);

  if (signals.length === 0) return null;

  return (
    <div style={GLASS_CARD}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={SECTION_HEADER}>Today&apos;s Digest</div>
        <span style={{
          fontFamily: 'var(--fm)',
          fontSize: 9,
          color: 'var(--text3)',
          letterSpacing: '0.06em',
          marginBottom: 14,
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Stat bar */}
      <DigestStatBar new24h={new24h} new7d={new7d} newSinceVisit={newSinceVisit} />

      {/* Top signals */}
      {topSignals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...SECTION_HEADER, marginBottom: 4 }}>Top Signals</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {topSignals.map((signal) => (
              <TopSignalRow key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}

      {/* Most active entities */}
      {mostActiveEntities.length > 0 && (
        <div>
          <div style={{ ...SECTION_HEADER, marginTop: 20, marginBottom: 4 }}>Most Active</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {mostActiveEntities.map((row) => (
              <MostActiveRow
                key={row.name}
                entity={row.entity}
                count={row.count}
                latestDate={row.latestDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
