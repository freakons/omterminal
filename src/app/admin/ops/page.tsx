/**
 * /admin/ops — Internal Operations Dashboard (protected)
 *
 * Server-rendered dashboard for monitoring pipeline health, ingestion quality,
 * intelligence generation, source reliability, and LLM provider status.
 *
 * Auth: requires ?key=<ADMIN_SECRET> query parameter.
 *   - Production with no ADMIN_SECRET: fails closed.
 *   - Development with no ADMIN_SECRET: accessible for ergonomics.
 *
 * Data sources (fetched in parallel at request time, no-store):
 *   GET /api/health          — subsystem grades, pipeline runs, LLM, warnings
 *   GET /api/pipeline/status — freshness, data counts, recent runs, lock state
 *   GET /api/sources/health  — source reliability + category coverage
 */

import { headers } from 'next/headers';

export const metadata = { title: 'Ops Dashboard | OM Terminal' };
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the shapes returned by each API endpoint
// ─────────────────────────────────────────────────────────────────────────────

interface SubsystemStatus {
  status: 'healthy' | 'degraded' | 'failing' | 'unavailable';
  message?: string;
}

interface PipelineRun {
  id: number;
  run_at: string;
  stage: string;
  status: string;
  ingested: number | null;
  signals_generated: number | null;
  duration_ms: number | null;
  trigger_type: string | null;
  correlation_id: string | null;
  error_summary: string | null;
}

interface HealthResponse {
  status: string;
  ok: boolean;
  subsystems: Record<string, SubsystemStatus>;
  pipeline: {
    lastRun: Record<string, unknown> | null;
    lastSuccessfulRun: Record<string, unknown> | null;
    lastIngestRun: Record<string, unknown> | null;
    lastSignalsRun: Record<string, unknown> | null;
    totalRuns: number;
    dataStale: boolean;
    lock: { locked: boolean; lockedBy?: string; lockAgeSeconds?: number; isStale?: boolean };
    intelligenceLock: { locked: boolean; lockedBy?: string; lockAgeSeconds?: number; isStale?: boolean };
  };
  llm: {
    provider: string;
    intelligenceEnabled: boolean;
    groqKeyPresent: boolean;
    grokKeyPresent: boolean;
    openaiKeyPresent: boolean;
    error?: string;
    rateLimitProtection?: { active: boolean; maxConcurrentRequests?: number; maxRetriesOnRateLimit?: number };
  };
  cache: { configured: boolean; status: string };
  warnings?: string[];
  dataConsistency?: { overallSeverity: string; issuesFound: number; summary: { critical: number; warning: number } };
}

interface PipelineStatusResponse {
  ok: boolean;
  freshness: {
    grade: 'fresh' | 'stale' | 'critical' | 'unknown';
    hoursSinceLastSuccess: number | null;
    lastSuccessfulRun: PipelineRun | null;
    lastFailedRun: PipelineRun | null;
  };
  locks: {
    pipeline: { locked: boolean; lockedBy?: string; lockAgeSeconds?: number; isStale?: boolean };
    intelligence: { locked: boolean; lockedBy?: string; lockAgeSeconds?: number; isStale?: boolean };
    anyStale: boolean;
  };
  recentRuns: PipelineRun[];
  dataCounts: {
    articles: { total: string; last_24h: string; latest_at: string | null } | null;
    signals: { total: string; last_24h: string; latest_at: string | null } | null;
    events: { total: string; last_24h: string; latest_at: string | null } | null;
  };
}

interface SourceHealthResponse {
  totalSources: number;
  healthySources: number;
  failingSources: number;
  staleSources: number;
  worstSources: Array<{
    sourceId: string;
    failureCount: number;
    articlesFetched: number;
    lastSuccessAt: string | null;
    lastError: string | null;
    score: number;
  }>;
  registry?: {
    totalConfigured: number;
    totalEnabled: number;
    categoryCoverage: Array<{ category: string; configured: number; enabled: number; recentlyHealthy: number }>;
  };
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

async function fetchHealth(base: string, adminSecret: string): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${base}/api/health`, {
      headers: { 'x-admin-secret': adminSecret },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchPipelineStatus(base: string, adminSecret: string): Promise<PipelineStatusResponse | null> {
  try {
    const res = await fetch(`${base}/api/pipeline/status`, {
      headers: { 'x-admin-secret': adminSecret },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchSourceHealth(base: string): Promise<SourceHealthResponse | null> {
  try {
    const res = await fetch(`${base}/api/sources/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTimestamp(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  return new Date(isoStr).toUTCString().replace(' GMT', ' UTC');
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

type StatusGrade = 'healthy' | 'degraded' | 'failing' | 'unavailable' | 'fresh' | 'stale' | 'critical' | 'unknown' | 'ok' | 'error';

const GRADE_STYLES: Record<string, string> = {
  healthy:     'bg-green-950/60   text-green-400   ring-green-500/30',
  fresh:       'bg-green-950/60   text-green-400   ring-green-500/30',
  ok:          'bg-green-950/60   text-green-400   ring-green-500/30',
  degraded:    'bg-amber-950/60   text-amber-400   ring-amber-500/30',
  stale:       'bg-amber-950/60   text-amber-400   ring-amber-500/30',
  failing:     'bg-red-950/60     text-red-400     ring-red-500/30',
  critical:    'bg-red-950/60     text-red-400     ring-red-500/30',
  error:       'bg-red-950/60     text-red-400     ring-red-500/30',
  unavailable: 'bg-zinc-900       text-zinc-400    ring-zinc-600/30',
  unknown:     'bg-zinc-900       text-zinc-400    ring-zinc-600/30',
};

function GradeBadge({ grade, dot = true }: { grade: string; dot?: boolean }) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-widest ring-1 ${style}`}>
      {dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.split('text-')[1]?.split(' ')[0] ? `bg-${style.split('text-')[1]?.split(' ')[0]}` : 'bg-zinc-400'}`} />}
      {grade}
    </span>
  );
}

function Pill({ label, style }: { label: string; style?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-widest ring-1 ${style ?? 'bg-zinc-900 text-zinc-400 ring-zinc-600/30'}`}>
      {label}
    </span>
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

function Mono({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span className={`font-mono text-sm tabular-nums ${dim ? 'text-zinc-500' : 'text-zinc-100'}`}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subsystem grid
// ─────────────────────────────────────────────────────────────────────────────

function SubsystemGrid({ subsystems }: { subsystems: Record<string, SubsystemStatus> }) {
  const order = ['database', 'schema', 'cache', 'pipeline', 'llm', 'cron', 'dataConsistency', 'environment'];
  const entries = order
    .filter(k => subsystems[k])
    .map(k => [k, subsystems[k]] as [string, SubsystemStatus]);

  // Append any extra keys not in the order list
  for (const k of Object.keys(subsystems)) {
    if (!order.includes(k)) entries.push([k, subsystems[k]]);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {entries.map(([key, sub]) => (
        <div
          key={key}
          className="rounded-xl px-4 py-3"
          style={{ background: 'var(--glass)', border: '1px solid var(--border)' }}
        >
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-2">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </p>
          <GradeBadge grade={sub.status} />
          {sub.message && (
            <p className="mt-1.5 text-[10px] font-mono text-zinc-500 leading-relaxed line-clamp-2">
              {sub.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent runs table
// ─────────────────────────────────────────────────────────────────────────────

function RunsTable({ runs }: { runs: PipelineRun[] }) {
  if (!runs.length) {
    return (
      <p className="px-5 py-4 text-xs font-mono text-zinc-600">No pipeline runs recorded.</p>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'ok' || s === 'completed') return 'text-green-400';
    if (s === 'error') return 'text-red-400';
    if (s === 'skipped_active_run') return 'text-amber-400';
    return 'text-zinc-400';
  };

  const stageColor = (s: string) => {
    if (s === 'ingest')      return 'text-cyan-400';
    if (s === 'signals')     return 'text-violet-400';
    if (s === 'insights')    return 'text-indigo-400';
    if (s === 'intelligence') return 'text-indigo-400';
    if (s === 'snapshots')   return 'text-sky-400';
    if (s === 'full')        return 'text-emerald-400';
    return 'text-zinc-400';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['ID', 'Stage', 'Status', 'Trigger', 'Ingested', 'Signals', 'Duration', 'Run At'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-zinc-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <tr
              key={run.id}
              style={i < runs.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
              className="hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-4 py-2.5 text-zinc-500 tabular-nums">{run.id}</td>
              <td className={`px-4 py-2.5 ${stageColor(run.stage)}`}>{run.stage}</td>
              <td className={`px-4 py-2.5 font-semibold ${statusColor(run.status)}`}>{run.status}</td>
              <td className="px-4 py-2.5 text-zinc-500">{run.trigger_type ?? '—'}</td>
              <td className="px-4 py-2.5 text-zinc-300 tabular-nums">{run.ingested ?? '—'}</td>
              <td className="px-4 py-2.5 text-zinc-300 tabular-nums">{run.signals_generated ?? '—'}</td>
              <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{fmtDuration(run.duration_ms)}</td>
              <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{fmtRelative(run.run_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!isAdminAuthorized(params)) {
    return <AccessDenied />;
  }

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const base = await getBaseUrl();

  const [health, pipelineStatus, sourceHealth] = await Promise.all([
    fetchHealth(base, adminSecret),
    fetchPipelineStatus(base, adminSecret),
    fetchSourceHealth(base),
  ]);

  const checkedAt = new Date().toUTCString();

  // Derive intelligence-specific run metrics from recent runs
  const recentRuns = pipelineStatus?.recentRuns ?? [];
  const intelligenceRuns = recentRuns.filter(r =>
    r.stage === 'intelligence' || r.stage === 'insights' || r.stage === 'harvester' || r.stage === 'trends'
  );
  const lastIntelRun = intelligenceRuns[0] ?? null;
  const intelSuccessCount = intelligenceRuns.filter(r => r.status === 'ok' || r.status === 'completed').length;
  const intelFailCount = intelligenceRuns.filter(r => r.status === 'error').length;

  const signals = pipelineStatus?.dataCounts.signals;
  const articles = pipelineStatus?.dataCounts.articles;
  const events = pipelineStatus?.dataCounts.events;

  const warnings = health?.warnings ?? [];
  const locks = pipelineStatus?.locks;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500">
          Admin · Internal
        </p>
        <h1 className="mt-1 font-serif text-2xl italic text-zinc-100">
          Operations Dashboard
        </h1>
        <p className="mt-1 text-xs font-mono text-zinc-500">
          Checked at {checkedAt}
        </p>
      </div>

      {/* ── Warnings ───────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div
          className="rounded-xl px-5 py-4 space-y-1"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-red-400 mb-2">
            {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
          </p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs font-mono text-red-300/80 leading-relaxed">
              · {w}
            </p>
          ))}
        </div>
      )}

      {/* ── System Health ─────────────────────────────────────────────── */}
      {health?.subsystems && (
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-3">
            System Health
          </p>
          <SubsystemGrid subsystems={health.subsystems} />
        </div>
      )}

      {/* ── Pipeline + Intelligence Status ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Pipeline */}
        <Card>
          <SectionHeader title="Pipeline" />
          <table className="w-full">
            <tbody>
              <TableRow
                label="Freshness"
                value={
                  pipelineStatus?.freshness.grade
                    ? <GradeBadge grade={pipelineStatus.freshness.grade} />
                    : <Mono dim>—</Mono>
                }
              />
              <TableRow
                label="Last success"
                value={<Mono>{fmtRelative(pipelineStatus?.freshness.lastSuccessfulRun?.run_at as string)}</Mono>}
              />
              <TableRow
                label="Hours since success"
                value={
                  <Mono dim={pipelineStatus?.freshness.hoursSinceLastSuccess == null}>
                    {pipelineStatus?.freshness.hoursSinceLastSuccess != null
                      ? `${pipelineStatus.freshness.hoursSinceLastSuccess}h`
                      : '—'}
                  </Mono>
                }
              />
              <TableRow
                label="Last ingest stage"
                value={
                  health?.pipeline.lastIngestRun
                    ? (
                        <span className="flex items-center gap-2">
                          <GradeBadge grade={(health.pipeline.lastIngestRun.status as string) === 'ok' ? 'healthy' : 'degraded'} dot={false} />
                          <Mono dim>{fmtRelative(health.pipeline.lastIngestRun.run_at as string)}</Mono>
                        </span>
                      )
                    : <Mono dim>—</Mono>
                }
              />
              <TableRow
                label="Last signals stage"
                value={
                  health?.pipeline.lastSignalsRun
                    ? (
                        <span className="flex items-center gap-2">
                          <GradeBadge grade={(health.pipeline.lastSignalsRun.status as string) === 'ok' ? 'healthy' : 'degraded'} dot={false} />
                          <Mono dim>{fmtRelative(health.pipeline.lastSignalsRun.run_at as string)}</Mono>
                        </span>
                      )
                    : <Mono dim>—</Mono>
                }
              />
              <TableRow
                label="Total runs"
                value={<Mono>{health?.pipeline.totalRuns ?? '—'}</Mono>}
                last
              />
            </tbody>
          </table>
        </Card>

        {/* Intelligence */}
        <Card>
          <SectionHeader title="Intelligence" />
          <table className="w-full">
            <tbody>
              <TableRow
                label="Last run"
                value={
                  lastIntelRun
                    ? (
                        <span className="flex items-center gap-2">
                          <GradeBadge grade={lastIntelRun.status === 'ok' || lastIntelRun.status === 'completed' ? 'healthy' : lastIntelRun.status === 'error' ? 'failing' : 'degraded'} dot={false} />
                          <Mono dim>{fmtRelative(lastIntelRun.run_at)}</Mono>
                        </span>
                      )
                    : <Mono dim>no intel runs in recent 10</Mono>
                }
              />
              <TableRow
                label="Last stage"
                value={<Mono dim={!lastIntelRun}>{lastIntelRun?.stage ?? '—'}</Mono>}
              />
              <TableRow
                label="Insights succeeded"
                value={
                  <span className="font-mono text-sm tabular-nums text-green-400">
                    {intelSuccessCount > 0 ? intelSuccessCount : <span className="text-zinc-500">0</span>}
                  </span>
                }
              />
              <TableRow
                label="Insights failed"
                value={
                  <span className={`font-mono text-sm tabular-nums ${intelFailCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {intelFailCount}
                  </span>
                }
              />
              <TableRow
                label="LLM provider"
                value={<Mono>{health?.llm.provider ?? '—'}</Mono>}
              />
              <TableRow
                label="Intelligence enabled"
                value={
                  health?.llm.intelligenceEnabled != null
                    ? <GradeBadge grade={health.llm.intelligenceEnabled ? 'healthy' : 'failing'} dot={false} />
                    : <Mono dim>—</Mono>
                }
                last
              />
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Data Counts ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader title="Data Counts" />
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--border)' }}>
          {([
            { label: 'Articles', data: articles, color: 'text-cyan-400' },
            { label: 'Signals',  data: signals,  color: 'text-violet-400' },
            { label: 'Events',   data: events,   color: 'text-indigo-400' },
          ] as const).map(({ label, data, color }) => (
            <div key={label} className="px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-2">{label}</p>
              <p className={`text-2xl font-mono font-semibold tabular-nums ${color}`}>
                {data?.total ?? '—'}
              </p>
              <p className="mt-1 text-xs font-mono text-zinc-500">
                <span className="text-zinc-300">{data?.last_24h ?? '—'}</span> in last 24h
              </p>
              <p className="mt-1 text-[10px] font-mono text-zinc-600">
                latest {fmtRelative(data?.latest_at)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Latest Signal Timestamp ───────────────────────────────────── */}
      {signals?.latest_at && (
        <div
          className="rounded-xl px-5 py-3 flex items-center justify-between"
          style={{ background: 'var(--glass)', border: '1px solid var(--border)' }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">
            Latest Signal Inserted
          </span>
          <span className="font-mono text-xs text-zinc-300 tabular-nums">
            {fmtTimestamp(signals.latest_at)}
            <span className="ml-3 text-zinc-500">({fmtRelative(signals.latest_at)})</span>
          </span>
        </div>
      )}

      {/* ── Lock State ────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader title="Pipeline Locks" />
        <table className="w-full">
          <tbody>
            <TableRow
              label="Pipeline lock"
              value={
                locks?.pipeline.locked
                  ? (
                      <span className="flex items-center gap-2">
                        <Pill label="locked" style="bg-amber-950/60 text-amber-400 ring-amber-500/30" />
                        <span className="text-xs font-mono text-zinc-400">
                          by {locks.pipeline.lockedBy ?? '?'} · {locks.pipeline.lockAgeSeconds ?? '?'}s
                          {locks.pipeline.isStale && <span className="ml-2 text-red-400">(STALE)</span>}
                        </span>
                      </span>
                    )
                  : <Pill label="unlocked" style="bg-green-950/60 text-green-400 ring-green-500/30" />
              }
            />
            <TableRow
              label="Intelligence lock"
              value={
                locks?.intelligence.locked
                  ? (
                      <span className="flex items-center gap-2">
                        <Pill label="locked" style="bg-amber-950/60 text-amber-400 ring-amber-500/30" />
                        <span className="text-xs font-mono text-zinc-400">
                          by {locks.intelligence.lockedBy ?? '?'} · {locks.intelligence.lockAgeSeconds ?? '?'}s
                          {locks.intelligence.isStale && <span className="ml-2 text-red-400">(STALE)</span>}
                        </span>
                      </span>
                    )
                  : <Pill label="unlocked" style="bg-green-950/60 text-green-400 ring-green-500/30" />
              }
              last
            />
          </tbody>
        </table>
        {locks?.anyStale && (
          <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
            <p className="text-[10px] font-mono text-amber-400/80">
              Stale lock detected — POST /api/pipeline/status?action=force_unlock to clear.
            </p>
          </div>
        )}
      </Card>

      {/* ── Source Health ─────────────────────────────────────────────── */}
      <Card>
        <SectionHeader title="Source Health" />
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x" style={{ borderColor: 'var(--border)' }}>
          {([
            { label: 'Total tracked', val: sourceHealth?.totalSources,   color: 'text-zinc-200' },
            { label: 'Healthy (6h)',  val: sourceHealth?.healthySources, color: 'text-green-400' },
            { label: 'Failing (≥3)',  val: sourceHealth?.failingSources, color: sourceHealth?.failingSources ? 'text-red-400' : 'text-zinc-500' },
            { label: 'Stale (24h+)', val: sourceHealth?.staleSources,   color: sourceHealth?.staleSources ? 'text-amber-400' : 'text-zinc-500' },
          ] as const).map(({ label, val, color }) => (
            <div key={label} className="px-4 py-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1">{label}</p>
              <p className={`text-2xl font-mono font-semibold tabular-nums ${color}`}>
                {val ?? '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Category coverage */}
        {sourceHealth?.registry?.categoryCoverage && sourceHealth.registry.categoryCoverage.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">Category Coverage</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Category', 'Configured', 'Enabled', 'Recently Healthy'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceHealth.registry.categoryCoverage.map((cat, i, arr) => (
                    <tr
                      key={cat.category}
                      style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    >
                      <td className="px-4 py-2 text-zinc-300 capitalize">{cat.category}</td>
                      <td className="px-4 py-2 text-zinc-400 tabular-nums">{cat.configured}</td>
                      <td className="px-4 py-2 tabular-nums">
                        <span className={cat.enabled > 0 ? 'text-zinc-300' : 'text-zinc-600'}>{cat.enabled}</span>
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        <span className={
                          cat.recentlyHealthy === 0 && cat.enabled > 0
                            ? 'text-red-400'
                            : cat.recentlyHealthy > 0
                            ? 'text-green-400'
                            : 'text-zinc-600'
                        }>
                          {cat.recentlyHealthy}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Worst sources */}
        {sourceHealth?.worstSources && sourceHealth.worstSources.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">Top Failing Sources</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Source', 'Failures', 'Score', 'Last Success', 'Last Error'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceHealth.worstSources.map((src, i, arr) => (
                    <tr
                      key={src.sourceId}
                      style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                    >
                      <td className="px-4 py-2 text-zinc-300">{src.sourceId}</td>
                      <td className="px-4 py-2 tabular-nums">
                        <span className={src.failureCount >= 3 ? 'text-red-400 font-semibold' : 'text-amber-400'}>
                          {src.failureCount}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 tabular-nums">{src.score}</td>
                      <td className="px-4 py-2 text-zinc-500 whitespace-nowrap">{fmtRelative(src.lastSuccessAt)}</td>
                      <td className="px-4 py-2 text-zinc-600 max-w-xs truncate" title={src.lastError ?? ''}>
                        {src.lastError ? src.lastError.slice(0, 60) + (src.lastError.length > 60 ? '…' : '') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ── LLM Provider ─────────────────────────────────────────────── */}
      {health?.llm && (
        <Card>
          <SectionHeader title="LLM / Intelligence Provider" />
          <table className="w-full">
            <tbody>
              <TableRow label="Active provider"  value={<Mono>{health.llm.provider}</Mono>} />
              <TableRow
                label="Intelligence enabled"
                value={<GradeBadge grade={health.llm.intelligenceEnabled ? 'healthy' : 'failing'} dot={false} />}
              />
              <TableRow
                label="GROQ_API_KEY"
                value={
                  <span className={`font-mono text-xs ${health.llm.groqKeyPresent ? 'text-green-400' : 'text-zinc-600'}`}>
                    {health.llm.groqKeyPresent ? '✓ set' : '✗ missing'}
                  </span>
                }
              />
              <TableRow
                label="GROK_API_KEY"
                value={
                  <span className={`font-mono text-xs ${health.llm.grokKeyPresent ? 'text-green-400' : 'text-zinc-600'}`}>
                    {health.llm.grokKeyPresent ? '✓ set' : '✗ missing'}
                  </span>
                }
              />
              <TableRow
                label="OPENAI_API_KEY"
                value={
                  <span className={`font-mono text-xs ${health.llm.openaiKeyPresent ? 'text-green-400' : 'text-zinc-600'}`}>
                    {health.llm.openaiKeyPresent ? '✓ set' : '✗ missing'}
                  </span>
                }
              />
              {health.llm.rateLimitProtection?.active && (
                <TableRow
                  label="Rate-limit guard"
                  value={
                    <span className="font-mono text-xs text-zinc-400">
                      max {health.llm.rateLimitProtection.maxConcurrentRequests} concurrent ·
                      {' '}{health.llm.rateLimitProtection.maxRetriesOnRateLimit} retries
                    </span>
                  }
                />
              )}
              {health.llm.error && (
                <TableRow
                  label="Provider error"
                  value={<span className="font-mono text-xs text-red-400">{health.llm.error}</span>}
                />
              )}
              <TableRow
                label="Cache layer"
                value={
                  <span className="flex items-center gap-2">
                    <GradeBadge
                      grade={health.cache.status === 'connected' ? 'healthy' : health.cache.configured ? 'degraded' : 'degraded'}
                      dot={false}
                    />
                    <Mono dim>{health.cache.status}</Mono>
                  </span>
                }
                last
              />
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Recent Pipeline Runs ──────────────────────────────────────── */}
      <Card>
        <SectionHeader title={`Recent Pipeline Runs (last ${recentRuns.length})`} />
        <RunsTable runs={recentRuns} />
      </Card>

      {/* ── Data Consistency ─────────────────────────────────────────── */}
      {health?.dataConsistency && 'checksRun' in health.dataConsistency && (
        <Card>
          <SectionHeader title="Data Consistency" />
          <table className="w-full">
            <tbody>
              <TableRow
                label="Overall severity"
                value={<GradeBadge grade={health.dataConsistency.overallSeverity === 'healthy' ? 'healthy' : health.dataConsistency.overallSeverity === 'critical' ? 'failing' : 'degraded'} />}
              />
              <TableRow label="Issues found" value={
                <Mono dim={health.dataConsistency.issuesFound === 0}>
                  {health.dataConsistency.issuesFound}
                </Mono>
              } />
              <TableRow
                label="Critical / Warning"
                value={
                  <span className="font-mono text-sm">
                    <span className={health.dataConsistency.summary.critical > 0 ? 'text-red-400' : 'text-zinc-500'}>
                      {health.dataConsistency.summary.critical} critical
                    </span>
                    <span className="text-zinc-600 mx-2">·</span>
                    <span className={health.dataConsistency.summary.warning > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                      {health.dataConsistency.summary.warning} warning
                    </span>
                  </span>
                }
                last
              />
            </tbody>
          </table>
          <div style={{ borderTop: '1px solid var(--border)' }} className="px-5 py-3">
            <p className="text-[10px] font-mono text-zinc-600">
              Full report: GET /api/admin/consistency
            </p>
          </div>
        </Card>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="text-[10px] font-mono text-zinc-600 pt-2">
        This page is not indexed and must not be exposed publicly in production. · /admin/ops
      </p>

    </div>
  );
}
