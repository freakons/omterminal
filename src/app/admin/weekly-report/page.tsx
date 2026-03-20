/**
 * /admin/weekly-report — Weekly Product Intelligence Report (protected)
 *
 * Internal view of the latest weekly report showing:
 *   - Most clicked pages, signals, entities
 *   - Confusion hotspots (high views, low engagement)
 *   - Ignored modules
 *   - Actionable recommendations
 *
 * Auth: requires ?key=<ADMIN_SECRET> query parameter.
 */

import { headers } from 'next/headers';

export const metadata = { title: 'Weekly Report | OM Terminal' };
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Types (matches WeeklyReportData from the generator)
// ─────────────────────────────────────────────────────────────────────────────

interface PageEntry { path: string; views: number }
interface SignalEntry { signalId: string; opens: number }
interface EntityEntry { entitySlug: string; views: number }
interface FeatureEntry { feature: string; views: number; actions: number; engagementRate: number }
interface ConfusionEntry extends FeatureEntry { reason: string }
interface IgnoredEntry { feature: string; views: number; reason: string }

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  totalEvents: number;
  uniqueUsers: number;
  mostClickedPages: PageEntry[];
  mostClickedSignals: SignalEntry[];
  mostClickedEntities: EntityEntry[];
  featureEngagement: FeatureEntry[];
  confusionHotspots: ConfusionEntry[];
  ignoredModules: IgnoredEntry[];
  recommendations: string[];
}

interface ApiResponse {
  ok: boolean;
  report: WeeklyReport | null;
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

async function fetchReport(base: string, adminSecret: string): Promise<WeeklyReport | null> {
  try {
    const res = await fetch(`${base}/api/admin/weekly-report`, {
      headers: { 'x-admin-secret': adminSecret },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: ApiResponse = await res.json();
    return data.report;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

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

function StatBlock({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-mono tabular-nums text-zinc-100">{value}</div>
      {sub && <div className="text-xs font-mono text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function barWidth(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (!isAdminAuthorized(params)) return <AccessDenied />;

  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const base = await getBaseUrl();
  const report = await fetchReport(base, adminSecret);

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div>
          <h1 className="font-serif text-2xl italic text-zinc-100">Weekly Product Intelligence</h1>
          <p className="mt-1 text-sm font-mono text-zinc-500">
            No report available yet. Generate one via POST /api/admin/weekly-report.
          </p>
        </div>
      </div>
    );
  }

  const maxPageViews = report.mostClickedPages[0]?.views ?? 1;
  const maxSignalOpens = report.mostClickedSignals[0]?.opens ?? 1;
  const maxEntityViews = report.mostClickedEntities[0]?.views ?? 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl italic text-zinc-100">
          Weekly Product Intelligence
        </h1>
        <p className="mt-1 text-sm font-mono text-zinc-500">
          {report.weekStart} — {report.weekEnd} · Generated {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Overview stats */}
      <Card>
        <SectionHeader title="Week Overview" />
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0"
          style={{ borderColor: 'var(--border)' }}>
          <StatBlock label="Total Events" value={report.totalEvents.toLocaleString()} />
          <StatBlock label="Unique Users" value={report.uniqueUsers.toLocaleString()} />
          <StatBlock
            label="Confusion Hotspots"
            value={report.confusionHotspots.length}
            sub={report.confusionHotspots.length > 0 ? 'needs attention' : 'none detected'}
          />
          <StatBlock
            label="Ignored Modules"
            value={report.ignoredModules.length}
            sub={report.ignoredModules.length > 0 ? 'low visibility' : 'all active'}
          />
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <SectionHeader title="Recommendations" />
        <div className="px-5 py-4 space-y-3">
          {report.recommendations.map((rec, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-xs font-mono text-cyan-400/80 mt-0.5 shrink-0">{i + 1}.</span>
              <p className="text-sm font-mono text-zinc-300 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Most clicked pages + signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Most Viewed Pages" />
          {report.mostClickedPages.length === 0 ? (
            <p className="px-5 py-5 text-xs font-mono text-zinc-500">No page view data yet.</p>
          ) : (
            <div className="px-5 py-3 space-y-2.5">
              {report.mostClickedPages.slice(0, 10).map((p) => (
                <div key={p.path} className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 text-xs font-mono text-zinc-300 truncate">{p.path}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--glass3)' }}>
                    <div className="h-full rounded-full bg-sky-500/60" style={{ width: barWidth(p.views, maxPageViews) }} />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums text-zinc-400 shrink-0">{p.views}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Most Opened Signals" />
          {report.mostClickedSignals.length === 0 ? (
            <p className="px-5 py-5 text-xs font-mono text-zinc-500">No signal data yet.</p>
          ) : (
            <div className="px-5 py-3 space-y-2.5">
              {report.mostClickedSignals.map((s) => (
                <div key={s.signalId} className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 text-xs font-mono text-zinc-400 truncate">{s.signalId}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--glass3)' }}>
                    <div className="h-full rounded-full bg-violet-500/60" style={{ width: barWidth(s.opens, maxSignalOpens) }} />
                  </div>
                  <span className="w-8 text-right text-xs font-mono tabular-nums text-zinc-400 shrink-0">{s.opens}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Most clicked entities */}
      <Card>
        <SectionHeader title="Most Viewed Entities" />
        {report.mostClickedEntities.length === 0 ? (
          <p className="px-5 py-5 text-xs font-mono text-zinc-500">No entity data yet.</p>
        ) : (
          <div className="px-5 py-3 space-y-2.5">
            {report.mostClickedEntities.map((e) => (
              <div key={e.entitySlug} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 text-xs font-mono text-zinc-300 truncate">{e.entitySlug}</span>
                <div className="w-32 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--glass3)' }}>
                  <div className="h-full rounded-full bg-cyan-500/60" style={{ width: barWidth(e.views, maxEntityViews) }} />
                </div>
                <span className="w-8 text-right text-xs font-mono tabular-nums text-zinc-400 shrink-0">{e.views}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Feature Engagement */}
      <Card>
        <SectionHeader title="Feature Engagement (views vs actions)" />
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Feature</th>
              <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Views</th>
              <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              <th className="px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500 text-right">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {report.featureEngagement.map((f, i) => (
              <tr key={f.feature} style={i < report.featureEngagement.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                <td className="px-5 py-3.5 text-xs font-mono text-zinc-300">{f.feature}</td>
                <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-zinc-100 text-right">{f.views}</td>
                <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-zinc-400 text-right">{f.actions}</td>
                <td className="px-5 py-3.5 text-xs font-mono tabular-nums text-right" style={{
                  color: f.engagementRate < 0.1 && f.views >= 5 ? 'var(--amber-l, #fbbf24)' : 'var(--text2)',
                }}>
                  {Math.round(f.engagementRate * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Confusion Hotspots */}
      {report.confusionHotspots.length > 0 && (
        <Card>
          <SectionHeader title="Confusion Hotspots" />
          <div className="px-5 py-4 space-y-4">
            {report.confusionHotspots.map((h) => (
              <div key={h.feature}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-mono text-amber-400">{h.feature}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {h.views} views · {h.actions} actions · {Math.round(h.engagementRate * 100)}% engagement
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400 leading-relaxed">{h.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ignored Modules */}
      {report.ignoredModules.length > 0 && (
        <Card>
          <SectionHeader title="Ignored Modules" />
          <div className="px-5 py-4 space-y-4">
            {report.ignoredModules.map((m) => (
              <div key={m.feature}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-mono text-rose-400">{m.feature}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{m.views} views</span>
                </div>
                <p className="text-xs font-mono text-zinc-400 leading-relaxed">{m.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Footer */}
      <p className="text-[10px] font-mono text-zinc-600 text-center pb-4">
        Internal use only · Product intelligence report · No PII stored
      </p>
    </div>
  );
}
