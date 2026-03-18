/**
 * /admin/analytics — Product Analytics Dashboard (protected)
 *
 * Lightweight internal view of user engagement with signals, watchlists,
 * alerts, and digests. All data is derived from existing tables plus the
 * product_events log added in migration 019.
 *
 * Auth: requires ?key=<ADMIN_SECRET> query parameter.
 *   - Production with no ADMIN_SECRET: fails closed.
 *   - Development with no ADMIN_SECRET: accessible for ergonomics.
 *
 * Data source: GET /api/admin/analytics
 *
 * Answers product questions such as:
 *   - Which entities are users actually tracking?
 *   - Which signals generate the most engagement?
 *   - What is the alert read rate?
 *   - How many users receive digests, and how recently?
 *   - What interactions happened in the last 7 days?
 */

import { headers } from 'next/headers';

export const metadata = { title: 'Product Analytics | OM Terminal' };
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EngagementSummary {
  total_watchers: number;
  total_watchlist_entries: number;
  product_events_7d: number;
  product_events_by_type: Array<{ event_type: string; count: number }>;
  alert_read_rate: number | null;
}

interface TopWatchedEntity {
  entity_slug: string;
  entity_name: string;
  watcher_count: number;
}

interface TopOpenedSignal {
  signal_id: string;
  open_count: number;
}

interface AlertVolumeRow {
  type: string;
  total: number;
  unread: number;
}

interface DigestStats {
  total_sends: number;
  unique_recipients: number;
  sends_last_7d: number;
  last_sent_at: string | null;
}

interface TimeToEngagementTrendPoint {
  day: string;
  avg_seconds: number;
}

interface TimeToEngagementMetric {
  avg_seconds: number | null;
  median_seconds: number | null;
  trend_7d: TimeToEngagementTrendPoint[];
}

interface TimeToEngagementStats {
  signal: TimeToEngagementMetric;
  alert: TimeToEngagementMetric;
}

interface AnalyticsResponse {
  ok: boolean;
  engagement: EngagementSummary;
  topEntities: TopWatchedEntity[];
  topSignals: TopOpenedSignal[];
  alertVolume: AlertVolumeRow[];
  digest: DigestStats;
  timeToEngagement: TimeToEngagementStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

function isAdminAuthorized(searchParams: Record<string, string | string[] | undefined>): boolean {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !adminSecret) return false;
  if (!adminSecret) return true;
  const key = typeof searchParams.key === 'string' ? searchParams.key : '';
  return key === adminSecret;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

async function getBaseUrl(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

async function fetchAnalytics(base: string, adminSecret: string): Promise<AnalyticsResponse | null> {
  try {
    const res = await fetch(`${base}/api/admin/analytics`, {
      headers: { 'x-admin-secret': adminSecret },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a duration in seconds as a human-readable string (e.g. "2h 30m", "45m", "30s"). */
function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtRelative(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const ms = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtEventType(t: string): string {
  return t.replace(/_/g, ' ');
}

function fmtAlertType(t: string): string {
  return t.replace(/_/g, ' ');
}

function barWidth(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-serif text-2xl italic text-zinc-100 mb-4">Access Denied</h1>
      <p className="text-sm font-mono text-zinc-500">
        This page requires admin authentication.
      </p>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{ background: 'var(--glass)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }} className="px-5 py-3">
      <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">{title}</span>
    </div>
  );
}

function TableRow({ label, value, last = false }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <tr style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <td className="px-5 py-3.5 text-xs font-mono text-zinc-400 whitespace-nowrap w-56">{label}</td>
      <td className="px-5 py-3.5">{value}</td>
    </tr>
  );
}

function Mono({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span className={`font-mono text-sm tabular-nums ${dim ? 'text-zinc-500' : 'text-zinc-100'}`}>
      {children}
    </span>
  );
}

function Num({ n, suffix = '' }: { n: number; suffix?: string }) {
  return <Mono>{n.toLocaleString()}{suffix}</Mono>;
}

function StatBlock({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-mono tabular-nums text-zinc-100">{value}</div>
      {sub && <div className="text-xs font-mono text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!isAdminAuthorized(params)) return <AccessDenied />;

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const base = await getBaseUrl();
  const data = await fetchAnalytics(base, adminSecret);

  const noData = !data || !data.ok;

  const engagement = data?.engagement ?? {
    total_watchers: 0,
    total_watchlist_entries: 0,
    product_events_7d: 0,
    product_events_by_type: [],
    alert_read_rate: null,
  };
  const topEntities = data?.topEntities ?? [];
  const topSignals = data?.topSignals ?? [];
  const alertVolume = data?.alertVolume ?? [];
  const digest = data?.digest ?? {
    total_sends: 0,
    unique_recipients: 0,
    sends_last_7d: 0,
    last_sent_at: null,
  };
  const timeToEngagement = data?.timeToEngagement ?? {
    signal: { avg_seconds: null, median_seconds: null, trend_7d: [] },
    alert: { avg_seconds: null, median_seconds: null, trend_7d: [] },
  };

  const maxWatchers = topEntities[0]?.watcher_count ?? 1;
  const maxSignalOpens = topSignals[0]?.open_count ?? 1;
  const maxAlertCount = alertVolume[0]?.total ?? 1;
  const maxEventCount = engagement.product_events_by_type[0]?.count ?? 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl italic text-zinc-100">Product Analytics</h1>
        <p className="mt-1 text-sm font-mono text-zinc-500">
          Internal engagement view — watchlists, signals, alerts, digests
        </p>
        {noData && (
          <div className="mt-3 rounded-lg px-4 py-2.5 text-sm font-mono text-amber-400"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
            Analytics data unavailable. Run the migration and check the database connection.
          </div>
        )}
      </div>

      {/* ── Engagement Overview ── */}
      <Card>
        <SectionHeader title="Engagement Overview" />
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0"
          style={{ borderColor: 'var(--border)' }}>
          <StatBlock label="Unique Watchers" value={engagement.total_watchers.toLocaleString()} />
          <StatBlock label="Watchlist Entries" value={engagement.total_watchlist_entries.toLocaleString()} />
          <StatBlock label="Events (7d)" value={engagement.product_events_7d.toLocaleString()} />
          <StatBlock
            label="Alert Read Rate"
            value={engagement.alert_read_rate != null ? `${engagement.alert_read_rate}%` : '—'}
          />
        </div>

        {engagement.product_events_by_type.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <SectionHeader title="Events by Type (last 7d)" />
            </div>
            <div className="px-5 py-3 space-y-2.5">
              {engagement.product_events_by_type.map((ev) => (
                <div key={ev.event_type} className="flex items-center gap-3">
                  <span className="w-36 text-xs font-mono text-zinc-400 shrink-0">{fmtEventType(ev.event_type)}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass3)' }}>
                    <div
                      className="h-full rounded-full bg-sky-500/60"
                      style={{ width: barWidth(ev.count, maxEventCount) }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-mono tabular-nums text-zinc-300">
                    {ev.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── Top Tracked Entities + Top Opened Signals (side by side) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Top Tracked Entities */}
        <Card>
          <SectionHeader title="Top Tracked Entities" />
          {topEntities.length === 0 ? (
            <p className="px-5 py-5 text-xs font-mono text-zinc-500">No watchlist data yet.</p>
          ) : (
            <div className="px-5 py-3 space-y-2.5">
              {topEntities.slice(0, 15).map((e) => (
                <div key={e.entity_slug} className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 text-xs font-mono text-zinc-300 truncate">{e.entity_name}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--glass3)' }}>
                    <div
                      className="h-full rounded-full bg-cyan-500/60"
                      style={{ width: barWidth(e.watcher_count, maxWatchers) }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums text-zinc-400 shrink-0">
                    {e.watcher_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Most Opened Signals */}
        <Card>
          <SectionHeader title="Most Opened Signals (30d)" />
          {topSignals.length === 0 ? (
            <p className="px-5 py-5 text-xs font-mono text-zinc-500">
              No signal_opened events yet. Events are recorded when users view signal detail pages.
            </p>
          ) : (
            <div className="px-5 py-3 space-y-2.5">
              {topSignals.map((s) => (
                <div key={s.signal_id} className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 text-xs font-mono text-zinc-400 truncate">{s.signal_id}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--glass3)' }}>
                    <div
                      className="h-full rounded-full bg-violet-500/60"
                      style={{ width: barWidth(s.open_count, maxSignalOpens) }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums text-zinc-400 shrink-0">
                    {s.open_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Alert Volume by Type ── */}
      <Card>
        <SectionHeader title="Alert Volume by Type" />
        {alertVolume.length === 0 ? (
          <p className="px-5 py-5 text-xs font-mono text-zinc-500">No alerts recorded yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Type</th>
                <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Total</th>
                <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Unread</th>
                <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Read %</th>
                <th className="px-5 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody>
              {alertVolume.map((row, i) => {
                const readPct = row.total > 0 ? Math.round(((row.total - row.unread) / row.total) * 100) : 0;
                return (
                  <tr
                    key={row.type}
                    style={i < alertVolume.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  >
                    <td className="px-5 py-3.5 text-xs font-mono text-zinc-300">{fmtAlertType(row.type)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-zinc-100 text-right">{row.total.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-zinc-400 text-right">{row.unread.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-zinc-400 text-right">{readPct}%</td>
                    <td className="px-5 py-3.5">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass3)' }}>
                        <div
                          className="h-full rounded-full bg-rose-500/60"
                          style={{ width: barWidth(row.total, maxAlertCount) }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Digest Delivery ── */}
      <Card>
        <SectionHeader title="Digest Delivery" />
        <table className="w-full">
          <tbody>
            <TableRow label="Total sends" value={<Num n={digest.total_sends} />} />
            <TableRow label="Unique recipients" value={<Num n={digest.unique_recipients} />} />
            <TableRow label="Sends (last 7d)" value={<Num n={digest.sends_last_7d} />} />
            <TableRow
              label="Last sent"
              value={<Mono dim={!digest.last_sent_at}>{fmtRelative(digest.last_sent_at)}</Mono>}
              last
            />
          </tbody>
        </table>
      </Card>

      {/* ── Time to Engagement ── */}
      <Card>
        <SectionHeader title="Time to Engagement" />
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x"
          style={{ borderColor: 'var(--border)' }}>

          {/* Signal engagement */}
          <div>
            <div style={{ borderBottom: '1px solid var(--border)' }} className="px-5 py-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                Signal — creation → first open
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border)' }}>
              <StatBlock
                label="Avg time"
                value={fmtDuration(timeToEngagement.signal.avg_seconds)}
                sub="all time"
              />
              <StatBlock
                label="Median time"
                value={fmtDuration(timeToEngagement.signal.median_seconds)}
                sub="all time"
              />
            </div>
            {timeToEngagement.signal.trend_7d.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-2">
                  Daily avg (last 7d)
                </div>
                <div className="space-y-1.5">
                  {timeToEngagement.signal.trend_7d.map((pt) => {
                    const maxSec = Math.max(...timeToEngagement.signal.trend_7d.map((p) => p.avg_seconds), 1);
                    return (
                      <div key={pt.day} className="flex items-center gap-3">
                        <span className="w-20 text-[10px] font-mono text-zinc-500 shrink-0">
                          {new Date(pt.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass3)' }}>
                          <div
                            className="h-full rounded-full bg-emerald-500/60"
                            style={{ width: barWidth(pt.avg_seconds, maxSec) }}
                          />
                        </div>
                        <span className="w-14 text-right text-[10px] font-mono tabular-nums text-zinc-400 shrink-0">
                          {fmtDuration(pt.avg_seconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {timeToEngagement.signal.avg_seconds == null && (
              <p className="px-5 py-4 text-xs font-mono text-zinc-500">
                No signal engagement data yet.
              </p>
            )}
          </div>

          {/* Alert engagement */}
          <div>
            <div style={{ borderBottom: '1px solid var(--border)' }} className="px-5 py-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                Alert — creation → first read
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border)' }}>
              <StatBlock
                label="Avg time"
                value={fmtDuration(timeToEngagement.alert.avg_seconds)}
                sub="all time"
              />
              <StatBlock
                label="Median time"
                value={fmtDuration(timeToEngagement.alert.median_seconds)}
                sub="all time"
              />
            </div>
            {timeToEngagement.alert.trend_7d.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-2">
                  Daily avg (last 7d)
                </div>
                <div className="space-y-1.5">
                  {timeToEngagement.alert.trend_7d.map((pt) => {
                    const maxSec = Math.max(...timeToEngagement.alert.trend_7d.map((p) => p.avg_seconds), 1);
                    return (
                      <div key={pt.day} className="flex items-center gap-3">
                        <span className="w-20 text-[10px] font-mono text-zinc-500 shrink-0">
                          {new Date(pt.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass3)' }}>
                          <div
                            className="h-full rounded-full bg-amber-500/60"
                            style={{ width: barWidth(pt.avg_seconds, maxSec) }}
                          />
                        </div>
                        <span className="w-14 text-right text-[10px] font-mono tabular-nums text-zinc-400 shrink-0">
                          {fmtDuration(pt.avg_seconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {timeToEngagement.alert.avg_seconds == null && (
              <p className="px-5 py-4 text-xs font-mono text-zinc-500">
                No alert engagement data yet.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Footer ── */}
      <p className="text-[10px] font-mono text-zinc-600 text-center pb-4">
        Internal use only · All user IDs are anonymous cookie UUIDs · No PII stored
      </p>
    </div>
  );
}
