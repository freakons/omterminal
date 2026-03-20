'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatSignalAge, isHot } from '@/lib/signals/signalAge';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RadarSignal {
  id: string;
  title: string;
  summary?: string | null;
  category?: string;
  date: string;
  entityName?: string | null;
  significanceScore?: number | null;
}

interface RadarStreamProps {
  initialSignals: RadarSignal[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** How often we poll for fresh signals (45 s) */
const POLL_INTERVAL_MS = 45_000;

/** How long the NEW badge remains visible after appearing */
const NEW_BADGE_TTL_MS = 12_000;

// ── RadarCard ─────────────────────────────────────────────────────────────────

function RadarCard({ signal, isNew }: { signal: RadarSignal; isNew: boolean }) {
  const hot  = isHot(signal.date);
  const href = `/signals/${encodeURIComponent(signal.id)}`;

  return (
    <Link
      href={href}
      className={[
        'radar-card',
        isNew ? 'radar-card--new' : '',
        hot  ? 'radar-card--hot'  : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Left: timestamp column */}
      <div className="radar-ts-col">
        {hot && <span className="radar-ts-pulse" aria-hidden="true" />}
        <span className={`radar-ts${hot ? ' radar-ts--hot' : ''}`}>
          {formatSignalAge(signal.date)}
        </span>
      </div>

      {/* Body */}
      <div className="radar-card-body">
        <div className="radar-card-meta">
          <Badge category={signal.category ?? 'analysis'} />
          {isNew && (
            <span className="radar-new-badge" aria-label="New signal">NEW</span>
          )}
        </div>
        <p className="radar-card-title">{signal.title}</p>
        {signal.summary && (
          <p className="radar-card-summary">{signal.summary}</p>
        )}
        {signal.entityName && (
          <span className="radar-card-entity">{signal.entityName}</span>
        )}
      </div>

      {/* Right: affordance */}
      <span className="radar-card-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

// ── RadarStream ───────────────────────────────────────────────────────────────

export function RadarStream({ initialSignals }: RadarStreamProps) {
  const [signals, setSignals]       = useState<RadarSignal[]>(initialSignals);
  const [newIds, setNewIds]         = useState<Set<string>>(new Set());
  const [lastSync, setLastSync]     = useState<Date>(new Date());
  const [syncFlash, setSyncFlash]   = useState(false);
  const [newCount, setNewCount]     = useState(0);

  // Track which IDs the client has ever seen — starts with SSR batch
  const seenRef = useRef<Set<string>>(new Set(initialSignals.map((s) => s.id)));

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/signals?limit=30&mode=standard', {
        cache: 'no-store',
      });
      if (!res.ok) return;

      const data = await res.json();
      const incoming: RadarSignal[] = data.signals ?? [];
      if (!incoming.length) return;

      // Identify genuinely new IDs
      const fresh = new Set<string>();
      for (const s of incoming) {
        if (!seenRef.current.has(s.id)) {
          fresh.add(s.id);
          seenRef.current.add(s.id);
        }
      }

      // Re-sort newest first before updating state
      const sorted = [...incoming].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setSignals(sorted);
      setLastSync(new Date());
      setSyncFlash(true);
      setTimeout(() => setSyncFlash(false), 1_500);

      if (fresh.size > 0) {
        setNewIds(fresh);
        setNewCount((c: number) => c + fresh.size);
        // NEW badge fades after TTL
        setTimeout(() => setNewIds(new Set()), NEW_BADGE_TTL_MS);
      }
    } catch {
      // Network errors are silent — page remains functional with cached data
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  const syncTime = lastSync.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="radar-root">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="radar-hdr">
        <div className="radar-hdr-left">
          <span className="radar-live-dot" aria-hidden="true" />
          <span className="radar-live-label">LIVE RADAR</span>
          {newCount > 0 && (
            <span className="radar-hdr-tally">
              +{newCount} since load
            </span>
          )}
        </div>
        <div className="radar-hdr-right">
          <span className={`radar-sync-label${syncFlash ? ' radar-sync-label--flash' : ''}`}>
            SYNCED {syncTime}
          </span>
          <span className="radar-hdr-interval">· refreshes every 45s</span>
        </div>
      </div>

      {/* ── Stream ───────────────────────────────────────────── */}
      <div className="radar-feed" role="feed" aria-label="Signal stream">
        {signals.length === 0 ? (
          <div className="radar-empty">
            <span className="radar-empty-dot" aria-hidden="true" />
            <span>No signals yet — check back shortly.</span>
          </div>
        ) : (
          signals.map((signal: RadarSignal) => (
            <RadarCard
              key={signal.id}
              signal={signal}
              isNew={Boolean(newIds.has(signal.id))}
            />
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="radar-footer">
        <span className="radar-footer-dot" aria-hidden="true" />
        Polling every 45s — no WebSocket connection required
      </div>
    </div>
  );
}
