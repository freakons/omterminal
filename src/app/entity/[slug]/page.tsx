import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getEntityBySlug,
  getSignalsForEntity,
  getEventsForEntity,
  getEntityMetrics,
  getEntityTimeline,
  getEntityMomentum,
} from '@/db/queries';
import type { TimelineItem } from '@/db/queries';
import { SupportingEventRow } from '@/components/events/SupportingEventRow';
import { WatchlistButton } from '@/components/watchlist/WatchlistButton';
import { EntityTimeline } from '@/components/entity/TimelineNavigator';
import { EntityMomentumBadge } from '@/components/entity/EntityMomentumBadge';
import { composeFeed, getSignificanceTier } from '@/lib/signals/feedComposer';
import { explainSignal } from '@/lib/signals/explanationLayer';
import type { Signal, SignalCategory } from '@/data/mockSignals';
import { buildEntitySchema, buildBreadcrumbSchema } from '@/lib/seo/jsonld';
import { siteConfig } from '@/config/site';
import { IntelligenceGraph } from '@/ui/graph/IntelligenceGraph';
import { CopyInsightButton } from '@/components/ui/CopyInsightButton';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}

/** Derive a brief entity intelligence summary from top-ranked signals. */
function buildEntitySummary(
  entityName: string,
  signals: Signal[],
  lastActivity: string | null,
): string | null {
  if (signals.length === 0) return null;

  const top = signals.slice(0, 3);
  const categories = Array.from(new Set(top.map((s) => s.category)));
  const topSig = signals[0];
  const tier = getSignificanceTier(topSig.significanceScore);

  // Use existing intelligence layer text if available
  if (topSig.whyThisMatters) {
    return topSig.whyThisMatters;
  }

  // Derive from signal data
  const catLabel = categories
    .map((c) => c.replace(/_/g, ' '))
    .join(', ');

  const recency = lastActivity ? timeAgo(lastActivity) : null;
  const activityStr = recency ? ` — last active ${recency}` : '';

  if (tier === 'critical') {
    return `${entityName} is generating critical intelligence signals across ${catLabel}${activityStr}. ${signals.length} signal${signals.length !== 1 ? 's' : ''} detected, with the highest-confidence signal at ${topSig.confidence}%.`;
  }
  if (tier === 'high') {
    return `${entityName} shows elevated activity in ${catLabel}${activityStr}. ${signals.length} signal${signals.length !== 1 ? 's' : ''} in the intelligence feed.`;
  }
  return `${entityName} has ${signals.length} tracked signal${signals.length !== 1 ? 's' : ''} across ${catLabel}${activityStr}.`;
}

/** Count signals by category. */
function getCategoryBreakdown(signals: Signal[]): { category: SignalCategory; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of signals) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category: category as SignalCategory, count }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

const BREADCRUMB: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text3)', textDecoration: 'none',
};

const TAG: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.08em',
  textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10,
  border: '1px solid var(--border2)', color: 'var(--text3)',
};

const EMPTY_TEXT: React.CSSProperties = {
  fontSize: 13, color: 'var(--text3)', lineHeight: 1.7,
};

// Category color map — aligned with globals.css badge classes
const CATEGORY_COLORS: Record<string, { color: string; dot: string }> = {
  models:     { color: 'var(--indigo-l)', dot: 'rgba(79,70,229,0.6)' },
  agents:     { color: 'var(--cyan-l)',   dot: 'rgba(6,182,212,0.6)' },
  funding:    { color: 'var(--amber-l)',  dot: 'rgba(217,119,6,0.6)' },
  research:   { color: 'var(--sky-l)',    dot: 'rgba(2,132,199,0.6)' },
  regulation: { color: 'var(--rose-l)',   dot: 'rgba(225,29,72,0.6)' },
  product:    { color: 'var(--emerald-l)',dot: 'rgba(5,150,105,0.6)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntityBySlug(slug);
  const name = entity?.name ?? slug;
  const sector = entity?.sector ? `${entity.sector} · ` : '';
  const country = entity?.country ? `${entity.country} · ` : '';
  const description = entity?.summary
    ? entity.summary.slice(0, 155)
    : `${sector}${country}Track ${name} AI signals, funding rounds, and strategic activity on Omterminal.`;
  const canonicalUrl = `${siteConfig.url}/entity/${slug}`;

  return {
    title: `${name} — AI Intelligence Dossier`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${name} — AI Intelligence Dossier | Omterminal`,
      description,
      url: canonicalUrl,
      type: 'profile',
      siteName: siteConfig.name,
    },
    twitter: {
      card: 'summary',
      title: `${name} | Omterminal`,
      description,
    },
    keywords: [
      name,
      `${name} AI`,
      `${name} funding`,
      `${name} signals`,
      'AI intelligence',
      'AI signals',
      ...(entity?.sector ? [entity.sector, `${entity.sector} AI`] : []),
      ...(entity?.country ? [`AI ${entity.country}`] : []),
      ...(entity?.tags ?? []),
      'Omterminal',
    ],
  };
}

export const revalidate = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function EntityDossierPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const entity = await getEntityBySlug(slug);
  if (!entity) notFound();

  const entityName = entity.name;

  const [rawSignals, events, metrics, timeline, momentum] = await Promise.all([
    getSignalsForEntity(entityName, 20).catch(() => [] as Signal[]),
    getEventsForEntity(entityName, 15).catch(() => []),
    getEntityMetrics(entityName).catch(() => ({
      signalsTotal: 0, signals24h: 0, signals7d: 0, signals30d: 0,
      eventsTotal: 0, avgConfidence: 0, firstSeen: null, lastActivity: null,
    })),
    getEntityTimeline(entityName, 25).catch(() => [] as TimelineItem[]),
    getEntityMomentum(entityName).catch(() => null),
  ]);

  // Rank signals by significance + recency via composeFeed
  const signals = composeFeed(rawSignals, { minSignificance: 0 });

  // Derive per-signal explanations (pure, no I/O)
  const signalsWithExplanations = signals.map((sig) => ({
    ...sig,
    explanation: explainSignal(sig),
  }));

  // Derived intelligence
  const entitySummary = buildEntitySummary(entityName, signals, metrics.lastActivity);
  const categoryBreakdown = getCategoryBreakdown(rawSignals);

  // Top-priority signals for the summary section
  const topSignals = signalsWithExplanations.filter(
    (s) => s._significanceTier === 'critical' || s._significanceTier === 'high',
  ).slice(0, 3);

  const riskColor = entity.riskLevel === 'high'
    ? 'var(--amber-l)'
    : entity.riskLevel === 'medium'
      ? 'var(--text2)'
      : 'var(--text3)';

  const riskBorder = entity.riskLevel === 'high'
    ? 'rgba(217,119,6,0.4)'
    : 'var(--border2)';

  const jsonLd = buildEntitySchema({
    name: entityName,
    pageUrl: `${siteConfig.url}/entity/${slug}`,
    description: entity.summary,
    foundingDate: entity.founded,
    website: entity.website,
    sector: entity.sector,
    country: entity.country,
    tags: entity.tags,
  });

  const breadcrumbLd = buildBreadcrumbSchema([
    { name: 'Omterminal', url: siteConfig.url },
    { name: 'Intelligence', url: `${siteConfig.url}/intelligence` },
    { name: entityName, url: `${siteConfig.url}/entity/${slug}` },
  ]);

  // Map signal categories to dedicated page URLs for internal linking
  const CATEGORY_URLS: Record<string, string> = {
    models: '/models',
    regulation: '/regulation',
    funding: '/funding',
  };

  return (
    <div className="page-enter">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumb nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <Link href="/" style={BREADCRUMB}>← Home</Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <Link href="/intelligence" style={BREADCRUMB}>Intelligence</Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <span style={{ ...BREADCRUMB, color: 'var(--text)' }}>Entity Dossier</span>
      </div>

      {/* Entity header / hero */}
      <div className="hero" style={{ padding: '32px 40px', marginBottom: 20 }}>

        {/* Type / sector / country badges */}
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text3)',
          }}>
            {entity.sector || 'Company'}{entity.country ? ` · ${entity.country}` : ''}
          </span>
          {entity.riskLevel && entity.riskLevel !== 'low' && (
            <span style={{
              fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 10,
              color: riskColor,
              border: `1px solid ${riskBorder}`,
            }}>
              {entity.riskLevel} risk
            </span>
          )}
          {entity.founded > 0 && (
            <span style={{
              fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)',
            }}>
              Est. {entity.founded}
            </span>
          )}
        </div>

        {/* Entity name + watchlist action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'var(--fd)', fontSize: 34, fontStyle: 'italic',
            color: 'var(--text)', letterSpacing: '-0.02em', margin: 0,
          }}>
            {entity.name}
          </h1>
          {momentum && (
            <EntityMomentumBadge result={momentum.result} />
          )}
          <WatchlistButton
            slug={slug}
            name={entity.name}
            sector={entity.sector ?? undefined}
            country={entity.country ?? undefined}
          />
        </div>

        {/* Description */}
        {entity.summary ? (
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 600, marginBottom: 16 }}>
            {entity.summary}
          </p>
        ) : (
          <p style={{ ...EMPTY_TEXT, maxWidth: 600, marginBottom: 16 }}>
            No entity profile details available yet
          </p>
        )}

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {entity.tags.map((tag) => (
              <span key={tag} style={TAG}>{tag}</span>
            ))}
          </div>
        )}

        {/* Metadata row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          {metrics.firstSeen && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
              First seen {formatDate(metrics.firstSeen)}
            </span>
          )}
          {metrics.lastActivity && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text2)' }}>
              Last active {timeAgo(metrics.lastActivity)}
            </span>
          )}
          {entity.financialScale && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--amber-l)' }}>
              {entity.financialScale}
            </span>
          )}
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          <div className="stat" style={{ '--sc': 'rgba(6,182,212,0.35)', '--sv': 'var(--cyan-l)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.signals24h}</div>
            <div className="stat-l">Signals · 24 h</div>
          </div>
          <div className="stat" style={{ '--sc': 'rgba(79,70,229,0.35)', '--sv': 'var(--indigo-l)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.signals7d}</div>
            <div className="stat-l">Signals · 7 d</div>
          </div>
          <div className="stat" style={{ '--sc': 'rgba(139,92,246,0.35)', '--sv': 'var(--indigo-l)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.signals30d}</div>
            <div className="stat-l">Signals · 30 d</div>
          </div>
          <div className="stat" style={{ '--sc': 'rgba(16,185,129,0.35)', '--sv': 'var(--emerald-l)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.signalsTotal}</div>
            <div className="stat-l">Total Signals</div>
          </div>
          <div className="stat" style={{ '--sc': 'rgba(217,119,6,0.35)', '--sv': 'var(--amber-l)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.eventsTotal}</div>
            <div className="stat-l">Total Events</div>
          </div>
          <div className="stat" style={{ '--sc': 'rgba(100,116,139,0.35)', '--sv': 'var(--text2)' } as React.CSSProperties}>
            <div className="stat-n">{metrics.avgConfidence > 0 ? metrics.avgConfidence.toFixed(0) : '—'}</div>
            <div className="stat-l">Avg Confidence</div>
          </div>
          {momentum && (
            <div className="stat" style={{ '--sc': momentum.result.momentumScore >= 70 ? 'rgba(217,119,6,0.35)' : momentum.result.momentumScore >= 45 ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.35)', '--sv': momentum.result.momentumScore >= 70 ? 'var(--amber-l)' : momentum.result.momentumScore >= 45 ? 'var(--emerald-l)' : 'var(--text2)' } as React.CSSProperties}>
              <div className="stat-n">{momentum.result.momentumScore}</div>
              <div className="stat-l">Momentum</div>
            </div>
          )}
        </div>
      </div>

      {/* ── AI-Optimized About Section ──────────────────────────────────────── */}
      {/* Structured, fact-dense content for LLM and AI search engine parsing */}
      <section
        aria-label={`About ${entityName}`}
        style={{ ...GLASS_CARD, marginBottom: 16, borderLeft: '2px solid rgba(6,182,212,0.4)' }}
      >
        <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 14 }}>About {entityName}</h2>

        {/* What it is */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', margin: '0 0 6px 0' }}>
            What It Is
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
            {entity.summary
              ? entity.summary
              : `${entityName} is ${entity.sector ? `a ${entity.sector} company` : 'an organization'}${entity.country ? ` based in ${entity.country}` : ''}${entity.founded > 0 ? `, founded in ${entity.founded}` : ''} tracked on Omterminal for AI-related activity.`}
            {entity.sector && !entity.summary && ` Sector: ${entity.sector}.`}
            {entity.country && !entity.summary && ` Country: ${entity.country}.`}
          </p>
        </div>

        {/* Why it matters */}
        {(entitySummary || metrics.signalsTotal > 0) && (
          <div style={{ marginBottom: topSignals.length > 0 ? 14 : 0 }}>
            <h3 style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', margin: '0 0 6px 0' }}>
              Why It Matters
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
              {entitySummary
                ? entitySummary
                : `${entityName} has generated ${metrics.signalsTotal} intelligence signal${metrics.signalsTotal !== 1 ? 's' : ''} on Omterminal${metrics.lastActivity ? `, most recently ${timeAgo(metrics.lastActivity)}` : ''}.`}
            </p>
          </div>
        )}

        {/* Latest developments */}
        {topSignals.length > 0 && (
          <div>
            <h3 style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', margin: '0 0 8px 0' }}>
              Latest Developments
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topSignals.map((sig) => (
                <li key={sig.id}>
                  <Link
                    href={`/signals/${sig.id}`}
                    style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, textDecoration: 'none' }}
                  >
                    <span style={{ color: 'var(--text3)', fontFamily: 'var(--fm)', fontSize: 10, marginRight: 8 }}>
                      {formatDate(sig.date)}
                    </span>
                    {sig.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Intelligence Summary ────────────────────────────────────────────── */}
      {(entitySummary || topSignals.length > 0) && (
        <div style={{ ...GLASS_CARD, marginBottom: 16, borderLeft: '2px solid rgba(79,70,229,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ ...SECTION_HEADER, margin: 0 }}>Intelligence Summary</h2>
            <CopyInsightButton text={[
              `${entityName} — Intelligence Summary`,
              '',
              ...(entitySummary ? [entitySummary, ''] : []),
              ...topSignals.map(sig =>
                `• ${sig.title}${(sig.whyThisMatters ?? sig.explanation?.whyThisMatters) ? ` — ${sig.whyThisMatters ?? sig.explanation?.whyThisMatters}` : ''}`
              ),
              '',
              'via OM Terminal',
            ].join('\n')} />
          </div>

          {entitySummary && (
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: topSignals.length > 0 ? 16 : 0 }}>
              {entitySummary}
            </p>
          )}

          {/* Top priority signals at a glance */}
          {topSignals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topSignals.map((sig) => (
                <Link
                  key={sig.id}
                  href={`/signals/${sig.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: sig._significanceTier === 'critical'
                      ? 'rgba(217,119,6,0.06)'
                      : 'rgba(79,70,229,0.06)',
                    border: sig._significanceTier === 'critical'
                      ? '1px solid rgba(217,119,6,0.2)'
                      : '1px solid rgba(79,70,229,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: sig._significanceTier === 'critical' ? 'var(--amber-l)' : 'var(--indigo-l)',
                        padding: '1px 6px', borderRadius: 6,
                        border: sig._significanceTier === 'critical'
                          ? '1px solid rgba(217,119,6,0.35)'
                          : '1px solid rgba(79,70,229,0.35)',
                      }}>
                        {sig.explanation?.importanceLabel ?? (sig._significanceTier === 'critical' ? 'Critical' : 'High')}
                      </span>
                      <span className={`badge ${sig.category}`} style={{ fontSize: 8 }}>
                        {sig.category}
                      </span>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                        {formatDate(sig.date)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0, marginBottom: 4 }}>
                      {sig.title}
                    </p>
                    {(sig.whyThisMatters ?? sig.explanation?.whyThisMatters) && (
                      <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.55, margin: 0 }}>
                        {sig.whyThisMatters ?? sig.explanation?.whyThisMatters}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Ecosystem Graph ──────────────────────────────────────────────────── */}
      <div style={{ ...GLASS_CARD, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ ...SECTION_HEADER, margin: 0 }}>Ecosystem Graph</h2>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Entity',  color: '#3b82f6' },
                { label: 'Event',   color: '#f59e0b' },
                { label: 'Signal',  color: '#10b981' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                </div>
              ))}
              <span style={{ width: 1, height: 10, background: 'var(--border)', flexShrink: 0 }} />
              {[
                { label: 'Strong', width: 3, opacity: 0.85 },
                { label: 'Moderate', width: 1.8, opacity: 0.55 },
                { label: 'Weak', width: 1, opacity: 0.3 },
              ].map(({ label, width, opacity }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={18} height={8} style={{ flexShrink: 0 }}>
                    <line x1={0} y1={4} x2={18} y2={4}
                      stroke="#93c5fd" strokeWidth={width}
                      strokeOpacity={opacity} strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
            Focused ecosystem for {entityName}. Click any entity node to explore its connections.
          </p>
        </div>

        {/* Graph canvas */}
        <div style={{ height: 360, position: 'relative' }}>
          <IntelligenceGraph initialFocusId={entity.id} compact />
        </div>
      </div>

      {/* Entity Timeline */}
      <div style={{ ...GLASS_CARD, marginBottom: 16 }}>
        <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>Entity Timeline</h2>
        <EntityTimeline timeline={timeline} />
      </div>

      {/* Main content grid */}
      <div className="detail-grid-wide">

        {/* Left column — signals + events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Recent signals — significance-ranked */}
          <div style={GLASS_CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ ...SECTION_HEADER, margin: 0 }}>Recent Signals</h2>
              {signals.length > 0 && (
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                  ranked by significance
                </span>
              )}
            </div>

            {signalsWithExplanations.length === 0 ? (
              <p style={EMPTY_TEXT}>No recent signals available yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {signalsWithExplanations.map((sig) => {
                  const tier = sig._significanceTier ?? 'standard';
                  const isCritical = tier === 'critical';
                  const isHigh = tier === 'high';
                  const catColors = CATEGORY_COLORS[sig.category] ?? { color: 'var(--text3)', dot: 'rgba(100,116,139,0.6)' };

                  return (
                    <Link
                      key={sig.id}
                      href={`/signals/${sig.id}`}
                      style={{
                        display: 'block',
                        padding: '14px 0 14px 14px',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: isCritical
                          ? '2px solid var(--amber-l)'
                          : isHigh
                            ? '2px solid var(--indigo-l)'
                            : '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>
                          {sig.title}
                        </span>
                        {isCritical && (
                          <span style={{
                            fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: 'var(--amber-l)',
                            padding: '1px 6px', borderRadius: 8,
                            border: '1px solid rgba(217,119,6,0.4)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            critical
                          </span>
                        )}
                        {isHigh && !isCritical && (
                          <span style={{
                            fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: 'var(--indigo-l)',
                            padding: '1px 6px', borderRadius: 8,
                            border: '1px solid rgba(79,70,229,0.35)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            high
                          </span>
                        )}
                      </div>

                      {/* Why this matters — when available */}
                      {(sig.whyThisMatters ?? sig.explanation?.whyThisMatters) && (
                        <p style={{
                          fontSize: 12, color: 'var(--text3)', lineHeight: 1.55,
                          margin: '0 0 6px 0',
                        }}>
                          {sig.whyThisMatters ?? sig.explanation?.whyThisMatters}
                        </p>
                      )}

                      {/* Meta row */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Category */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: catColors.color,
                          padding: '2px 8px', borderRadius: 10,
                          border: `1px solid ${catColors.dot}`,
                          background: 'transparent',
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: catColors.dot, flexShrink: 0,
                          }} />
                          {sig.category}
                        </span>

                        <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
                          {formatDate(sig.date)}
                        </span>

                        {sig.confidence >= 80 && (
                          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--emerald-l)' }}>
                            {sig.confidence}% conf
                          </span>
                        )}

                        {sig.sourceSupportCount != null && sig.sourceSupportCount > 1 && (
                          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                            {sig.sourceSupportCount} sources
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent events */}
          <div style={GLASS_CARD}>
            <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>Recent Events</h2>

            {events.length === 0 ? (
              <p style={EMPTY_TEXT}>No recent events available yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map((evt) => (
                  <SupportingEventRow key={evt.id} event={evt} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Watchlist prompt card */}
          <div style={{ ...GLASS_CARD, borderColor: 'rgba(79,70,229,0.2)' }}>
            <div style={SECTION_HEADER}>Track this Entity</div>
            <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 14 }}>
              Add {entity.name} to your watchlist to get signals in your digest and stay updated on key developments.
            </p>
            <WatchlistButton
              slug={slug}
              name={entity.name}
              sector={entity.sector ?? undefined}
              country={entity.country ?? undefined}
            />
          </div>

          {/* Entity profile card */}
          <div style={GLASS_CARD}>
            <div style={SECTION_HEADER}>Entity Profile</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Name</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>{entity.name}</span>
              </div>
              {entity.sector && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Sector</span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text2)' }}>{entity.sector}</span>
                </div>
              )}
              {entity.country && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Country</span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text2)' }}>{entity.country}</span>
                </div>
              )}
              {entity.founded > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Founded</span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text2)' }}>{entity.founded}</span>
                </div>
              )}
              {entity.riskLevel && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Risk Level</span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: riskColor }}>{entity.riskLevel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Website / links card */}
          {entity.website && (
            <div style={GLASS_CARD}>
              <div style={SECTION_HEADER}>Website</div>
              <a
                href={entity.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border2)', background: 'var(--glass2)',
                  textDecoration: 'none', transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--indigo-l)' }}>
                  {entity.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                  ↗
                </span>
              </a>
            </div>
          )}

          {/* Activity summary */}
          <div style={GLASS_CARD}>
            <div style={SECTION_HEADER}>Activity Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Total Signals</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--text)' }}>{metrics.signalsTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Total Events</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--text)' }}>{metrics.eventsTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Avg Confidence</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: metrics.avgConfidence >= 80 ? 'var(--emerald-l)' : 'var(--text2)' }}>
                  {metrics.avgConfidence > 0 ? `${metrics.avgConfidence.toFixed(0)}%` : '—'}
                </span>
              </div>
              {metrics.lastActivity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>Last Activity</span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text2)' }}>
                    {timeAgo(metrics.lastActivity)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Signal category breakdown — links to per-category pages for internal SEO */}
          {categoryBreakdown.length > 0 && (
            <div style={GLASS_CARD}>
              <div style={SECTION_HEADER}>Signals by Category</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryBreakdown.map(({ category, count }) => {
                  const catColors = CATEGORY_COLORS[category] ?? { color: 'var(--text3)', dot: 'rgba(100,116,139,0.5)' };
                  const pct = Math.round((count / rawSignals.length) * 100);
                  const catUrl = CATEGORY_URLS[category] ?? '/signals';
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Link
                          href={catUrl}
                          title={`View all ${category} signals`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em',
                            textTransform: 'uppercase', color: catColors.color,
                            textDecoration: 'none',
                          }}
                        >
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: catColors.dot, flexShrink: 0,
                          }} />
                          {category}
                        </Link>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>
                          {count}
                        </span>
                      </div>
                      {/* Mini bar */}
                      <div style={{
                        height: 2, borderRadius: 2, background: 'var(--border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: catColors.dot,
                          width: `${pct}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
