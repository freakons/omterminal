import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSignalById, getRelatedSignals, getSupportingEventsForSignal, getSourceArticlesForSignal, getSignalMomentum } from '@/db/queries';
import { Badge } from '@/components/ui/Badge';
import { EvidencePanel } from '@/components/signals/EvidencePanel';
import { CorroborationIndicator, computeCorroboration } from '@/components/signals/CorroborationIndicator';
import { ConfidenceBreakdown } from '@/components/signals/ConfidenceBreakdown';
import { SourceArticlesPanel } from '@/components/signals/SourceArticlesPanel';
import { SignalImpactBadge } from '@/components/signals/SignalImpactBadge';
import { SignalMomentumBadge } from '@/components/signals/SignalMomentumBadge';
import { SignalInsightBlock } from '@/components/signals/SignalInsightBlock';
import { KeyEntities } from '@/components/signals/KeyEntities';
import { RelatedSignalsSection } from '@/components/signals/RelatedSignalsSection';
import { SignalTimeline } from '@/components/signals/SignalTimeline';
import { getSignificanceTier } from '@/lib/signals/feedComposer';
import { generateSignalInsightData } from '@/lib/signals/insightGenerator';
import { slugify } from '@/utils/sanitize';
import { buildArticleSchema, buildBreadcrumbSchema, buildSignalFAQSchema } from '@/lib/seo/jsonld';
import { siteConfig } from '@/config/site';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const signal = await getSignalById(id).catch(() => null);
  if (!signal) return { title: 'Signal Not Found' };

  const description = (signal.summary ?? '').slice(0, 155) || `${signal.category} signal from ${signal.entityName} on Omterminal.`;
  const canonicalUrl = `${siteConfig.url}/signals/${id}`;

  return {
    title: signal.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${signal.title} | Omterminal`,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: signal.date,
      siteName: siteConfig.name,
    },
    twitter: {
      card: 'summary',
      title: signal.title,
      description,
    },
    keywords: [
      signal.category,
      `AI ${signal.category}`,
      signal.entityName,
      signal.entityName ? `${signal.entityName} AI` : null,
      'AI signals',
      'AI intelligence',
      'artificial intelligence',
      'Omterminal',
    ].filter(Boolean) as string[],
  };
}

export const revalidate = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function SignalDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const signal = await getSignalById(id).catch(() => null);

  if (!signal) notFound();

  const tier = getSignificanceTier(signal.significanceScore);
  const [relatedSignals, supportingEvents, sourceArticles, momentumData] = await Promise.all([
    getRelatedSignals(signal.id, signal.entityName, 6).catch(() => []),
    getSupportingEventsForSignal(signal.id, signal.entityName, 10).catch(() => []),
    getSourceArticlesForSignal(signal.id, signal.entityName, 10).catch(() => []),
    getSignalMomentum(signal.id, signal.entityName).catch(() => null),
  ]);

  // Fallback: if momentum query failed, use safe defaults (stable)
  const momentum = momentumData ?? { recentCount: 0, previousCount: 0 };

  // Generate intelligence insight (heuristic fallback when LLM context missing)
  const insightData = generateSignalInsightData(signal);

  // Normalize affected entities for KeyEntities component
  const affectedEntities = (signal.context?.affectedEntities ?? []).map((e) =>
    typeof e === 'string' ? { name: e } : e,
  );

  const jsonLd = buildArticleSchema({
    headline: signal.title,
    description: (signal.summary ?? '').slice(0, 155),
    datePublished: signal.date,
    url: `${siteConfig.url}/signals/${signal.id}`,
    keywords: [signal.category, signal.entityName, 'AI intelligence', 'Omterminal'].filter(Boolean) as string[],
    entityName: signal.entityName ?? undefined,
    entityUrl: signal.entityName
      ? `${siteConfig.url}/entity/${slugify(signal.entityName)}`
      : undefined,
    category: signal.category,
  });

  const breadcrumbLd = buildBreadcrumbSchema([
    { name: 'Omterminal', url: siteConfig.url },
    { name: 'Signals', url: `${siteConfig.url}/signals` },
    { name: signal.title, url: `${siteConfig.url}/signals/${signal.id}` },
  ]);

  const faqLd = signal.summary
    ? buildSignalFAQSchema({
        signalTitle: signal.title,
        summary: signal.summary,
        whyItMatters: signal.context?.whyItMatters,
        implications: signal.context?.implications,
      })
    : null;

  // Map signal category to a dedicated page URL for internal linking
  const CATEGORY_URLS: Record<string, string> = {
    models: '/models',
    regulation: '/regulation',
    funding: '/funding',
  };
  const categoryPageUrl = CATEGORY_URLS[signal.category] ?? '/signals';

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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Nav breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <Link
          href="/"
          style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', textDecoration: 'none' }}
        >
          ← Home
        </Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <Link
          href="/intelligence"
          style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', textDecoration: 'none' }}
        >
          Intelligence
        </Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <span style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
          Signal
        </span>
      </div>

      {/* ================================================================== */}
      {/* 1. TITLE + METADATA                                                */}
      {/* ================================================================== */}
      <div className="hero" style={{ padding: '32px 40px', marginBottom: 20 }}>
        {/* Meta row */}
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge category={signal.category} />
          {tier === 'critical' && (
            <span className="sig-badge sig-critical">Major</span>
          )}
          {tier === 'high' && (
            <span className="sig-badge sig-high">Notable</span>
          )}
          <SignalImpactBadge signal={{
            significanceScore: signal.significanceScore,
            confidenceScore: signal.confidence,
            sourceSupportCount: signal.sourceSupportCount,
            affectedEntitiesCount: signal.context?.affectedEntities?.length ?? null,
          }} />
          <SignalMomentumBadge momentum={momentum} />
          {signal.confidence >= 90 && (
            <span className="verified" title="Confidence: Verified — Score of 90 or above indicates high-confidence intelligence.">
              <span className="indicator-dot indicator-dot--emerald" />
              Verified
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic',
          color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 10,
          lineHeight: 1.3,
        }}>
          {signal.title}
        </h1>

        {/* Date and entity */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
            {formatDate(signal.date)}
          </span>
          {signal.entityName && (
            <Link
              href={`/entity/${slugify(signal.entityName)}`}
              style={{
                fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--indigo-l)', textDecoration: 'none',
              }}
            >
              {signal.entityName}
            </Link>
          )}
          {signal.sourceSupportCount != null && signal.sourceSupportCount > 1 && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
              {signal.sourceSupportCount} corroborating sources
            </span>
          )}
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 24 }}>
          <div className="stat" style={{ '--sc': 'rgba(79,70,229,0.35)', '--sv': 'var(--indigo-l)' } as React.CSSProperties}>
            <div className="stat-n">{signal.confidence}</div>
            <div className="stat-l">Confidence</div>
          </div>
          {signal.significanceScore != null && (
            <div className="stat" style={{ '--sc': 'rgba(217,119,6,0.35)', '--sv': 'var(--amber-l)' } as React.CSSProperties}>
              <div className="stat-n">{signal.significanceScore}</div>
              <div className="stat-l">Significance</div>
            </div>
          )}
          {signal.sourceSupportCount != null && (
            <div className="stat" style={{ '--sc': 'rgba(16,185,129,0.35)', '--sv': 'var(--emerald-l)' } as React.CSSProperties}>
              <div className="stat-n">{signal.sourceSupportCount}</div>
              <div className="stat-l">Sources</div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* INTELLIGENCE LAYOUT                                                */}
      {/* ================================================================== */}
      <div className="detail-grid">

        {/* Main content column — intelligence-first ordering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Signal Summary */}
          <div style={GLASS_CARD}>
            <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>Signal Summary</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 }}>
              {signal.summary}
            </p>
          </div>

          {/* ────────────────────────────────────────────────────────────── */}
          {/* 2. WHY THIS MATTERS + 3. KEY IMPLICATIONS                     */}
          {/* ────────────────────────────────────────────────────────────── */}
          <SignalInsightBlock insight={insightData} />

          {/* ────────────────────────────────────────────────────────────── */}
          {/* 4. KEY ENTITIES                                               */}
          {/* ────────────────────────────────────────────────────────────── */}
          <KeyEntities
            primaryEntity={signal.entityName}
            affectedEntities={affectedEntities}
          />

          {/* ────────────────────────────────────────────────────────────── */}
          {/* 5. RELATED SIGNALS                                            */}
          {/* ────────────────────────────────────────────────────────────── */}
          <RelatedSignalsSection signals={relatedSignals} />

          {/* ────────────────────────────────────────────────────────────── */}
          {/* 6. TIMELINE                                                   */}
          {/* ────────────────────────────────────────────────────────────── */}
          <SignalTimeline
            signal={signal}
            events={supportingEvents}
            relatedSignals={relatedSignals}
          />

          {/* ────────────────────────────────────────────────────────────── */}
          {/* EVIDENCE & CORROBORATION (deep analysis below intelligence)   */}
          {/* ────────────────────────────────────────────────────────────── */}
          <EvidencePanel signal={signal} supportingEvents={supportingEvents} />

          <CorroborationIndicator
            data={computeCorroboration({
              sourceSupportCount: signal.sourceSupportCount,
              supportingEventsCount: supportingEvents.length,
              articles: sourceArticles,
              confidenceScore: signal.confidence,
            })}
          />

          <ConfidenceBreakdown signal={signal} />

          <SourceArticlesPanel articles={sourceArticles} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Entity panel — enriched with live signal intelligence */}
          {signal.entityName && (
            <div style={GLASS_CARD}>
              <div style={SECTION_HEADER}>Entity</div>
              <Link
                href={`/entity/${slugify(signal.entityName)}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border2)', background: 'var(--glass2)',
                  textDecoration: 'none', transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--indigo-l)' }}>
                  {signal.entityName}
                </span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                  View entity →
                </span>
              </Link>
              {/* Live entity intelligence derived from already-fetched data */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {(() => {
                  const entityRelated = relatedSignals.filter(
                    (s) => s.entityName?.toLowerCase() === signal.entityName?.toLowerCase(),
                  );
                  const momentumDir = momentum.recentCount > momentum.previousCount
                    ? 'rising'
                    : momentum.recentCount < momentum.previousCount
                      ? 'cooling'
                      : 'stable';
                  const momentumColor = momentumDir === 'rising'
                    ? 'var(--emerald-l)'
                    : momentumDir === 'cooling'
                      ? 'var(--rose-l)'
                      : 'var(--text3)';
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                          Related signals
                        </span>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>
                          {entityRelated.length > 0 ? entityRelated.length : relatedSignals.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                          Signal momentum
                        </span>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: momentumColor }}>
                          {momentumDir}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                          Confidence
                        </span>
                        <span style={{
                          fontFamily: 'var(--fm)', fontSize: 10,
                          color: signal.confidence >= 90
                            ? 'var(--emerald-l)'
                            : signal.confidence >= 75
                              ? 'var(--amber-l)'
                              : 'var(--text2)',
                        }}>
                          {signal.confidence}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Strategic context (prediction + who should care) */}
          {(signal.strategicImpact || signal.prediction || signal.whoShouldCare) && (
            <div style={GLASS_CARD}>
              <div style={SECTION_HEADER}>Strategic Context</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {signal.strategicImpact && (
                  <div>
                    <div style={{
                      fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--indigo-l)', marginBottom: 4,
                    }}>
                      Strategic Impact
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                      {signal.strategicImpact}
                    </p>
                  </div>
                )}
                {signal.prediction && (
                  <div>
                    <div style={{
                      fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--amber-l)', marginBottom: 4,
                    }}>
                      Prediction
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                      {signal.prediction}
                    </p>
                  </div>
                )}
                {signal.whoShouldCare && (
                  <div>
                    <div style={{
                      fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4,
                    }}>
                      Who Should Care
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                      {signal.whoShouldCare}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category intelligence — data-driven, not just nav links */}
          <div style={GLASS_CARD}>
            <div style={SECTION_HEADER}>Category Intelligence</div>
            {(() => {
              const catSignals = relatedSignals.filter((s) => s.category === signal.category);
              const catEntities = Array.from(
                new Set(catSignals.map((s) => s.entityName).filter(Boolean)),
              ).slice(0, 3) as string[];
              const catAvgConf = catSignals.length > 0
                ? Math.round(catSignals.reduce((sum, s) => sum + s.confidence, 0) / catSignals.length)
                : null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                      Related {signal.category} signals
                    </span>
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>
                      {catSignals.length > 0 ? catSignals.length : '—'}
                    </span>
                  </div>
                  {catAvgConf !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                        Avg confidence
                      </span>
                      <span style={{
                        fontFamily: 'var(--fm)', fontSize: 10,
                        color: catAvgConf >= 80 ? 'var(--emerald-l)' : 'var(--text2)',
                      }}>
                        {catAvgConf}%
                      </span>
                    </div>
                  )}
                  {catEntities.length > 0 && (
                    <div>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                        Active entities
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {catEntities.map((name) => (
                          <Link
                            key={name}
                            href={`/entity/${slugify(name)}`}
                            style={{
                              fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.06em',
                              color: 'var(--indigo-l)', padding: '1px 6px', borderRadius: 6,
                              border: '1px solid rgba(79,70,229,0.3)', textDecoration: 'none',
                            }}
                          >
                            {name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href={categoryPageUrl}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border2)', background: 'var(--glass2)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text2)' }}>
                  More {signal.category} signals
                </span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                  →
                </span>
              </Link>
              <Link
                href="/signals"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border2)', background: 'var(--glass2)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text2)' }}>
                  All AI intelligence signals
                </span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', marginLeft: 'auto' }}>
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
