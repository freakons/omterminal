import Link from 'next/link';
import type { Metadata } from 'next';
import { getEntityComparison } from '@/db/queries';
import type { EntityComparisonEntry } from '@/db/queries';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { CompareSearchInput } from '@/components/compare/CompareSearchInput';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MIN_ENTITIES = 2;
const MAX_ENTITIES = 5;

const SUGGESTED_COMPARISONS = [
  { label: 'AI Labs',       desc: 'The frontier race',           slugs: 'openai,anthropic,deepseek' },
  { label: 'Labs + Google', desc: 'Big tech vs startups',        slugs: 'openai,anthropic,google-deepmind' },
  { label: 'Open vs Closed', desc: 'Frontier vs open-weight',   slugs: 'openai,meta-ai,mistral' },
  { label: 'Cloud AI',      desc: 'Infrastructure titans',      slugs: 'microsoft,google,amazon' },
  { label: 'Full Field',    desc: '5-way comparison',            slugs: 'openai,anthropic,google-deepmind,meta-ai,mistral' },
];

const CATEGORY_COLORS: Record<string, string> = {
  models: 'var(--indigo-l)', funding: 'var(--amber-l)', regulation: 'var(--rose-l)',
  agents: 'var(--cyan-l)', research: 'var(--violet-l)', product: 'var(--emerald-l)',
};

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

/** Compute a simple momentum label from signal counts. */
function momentumLabel(s24h: number, s7d: number): { label: string; color: string } {
  if (s24h >= 5) return { label: 'Surging', color: 'var(--emerald-l)' };
  if (s24h >= 2) return { label: 'Active', color: 'var(--cyan-l)' };
  if (s7d >= 5) return { label: 'Steady', color: 'var(--indigo-l)' };
  if (s7d >= 1) return { label: 'Low', color: 'var(--text3)' };
  return { label: 'Quiet', color: 'var(--text3)' };
}

/** Derive a signal strength tier from avg confidence. */
function signalStrength(avgConf: number): { label: string; color: string } {
  if (avgConf >= 85) return { label: 'Very High', color: 'var(--emerald-l)' };
  if (avgConf >= 70) return { label: 'High', color: 'var(--cyan-l)' };
  if (avgConf >= 50) return { label: 'Moderate', color: 'var(--amber-l)' };
  if (avgConf > 0) return { label: 'Low', color: 'var(--text3)' };
  return { label: '—', color: 'var(--text3)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Style tokens
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

const BREADCRUMB: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text3)', textDecoration: 'none',
};

const EMPTY_TEXT: React.CSSProperties = {
  fontSize: 13, color: 'var(--text3)', lineHeight: 1.7,
};

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Compare — Side-by-Side Intelligence',
  description: 'Compare 2–5 AI entities side-by-side: signals, momentum, confidence, events, and strategic profile.',
};

export const revalidate = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb
// ─────────────────────────────────────────────────────────────────────────────

function Breadcrumbs() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <Link href="/" style={BREADCRUMB}>Home</Link>
      <span style={{ color: 'var(--border)', fontSize: 10 }}>/</span>
      <Link href="/intelligence" style={BREADCRUMB}>Intelligence</Link>
      <span style={{ color: 'var(--border)', fontSize: 10 }}>/</span>
      <span style={{ ...BREADCRUMB, color: 'var(--text)' }}>Compare</span>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricRow — table row inside the metrics section
// ─────────────────────────────────────────────────────────────────────────────

function MetricRow({ label, values, color, highlight }: {
  label: string;
  values: (string | number)[];
  color?: string;
  highlight?: 'max' | 'min';
}) {
  const numericValues = values.map((v) => (typeof v === 'number' ? v : parseFloat(String(v)) || 0));
  const targetVal = highlight === 'max'
    ? Math.max(...numericValues)
    : highlight === 'min'
      ? Math.min(...numericValues)
      : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `140px repeat(${values.length}, 1fr)`,
      gap: 12, padding: '8px 0',
      borderBottom: '1px solid var(--border)',
      alignItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {values.map((v, i) => {
        const isTarget = targetVal !== null && numericValues[i] === targetVal && numericValues.filter((n) => n === targetVal).length === 1;
        return (
          <span key={i} style={{
            fontFamily: 'var(--fm)', fontSize: 13, textAlign: 'center',
            color: isTarget ? (color ?? 'var(--cyan-l)') : 'var(--text)',
            fontWeight: isTarget ? 600 : 400,
          }}>
            {v}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OverviewCard — entity header in the side-by-side grid
// ─────────────────────────────────────────────────────────────────────────────

function OverviewCard({ entry }: { entry: EntityComparisonEntry }) {
  const mom = momentumLabel(entry.signals24h, entry.signals7d);
  const str = signalStrength(entry.avgConfidence);
  return (
    <div style={{ ...GLASS_CARD }}>
      <Link href={`/entity/${entry.slug}`} style={{ textDecoration: 'none' }}>
        <h2 style={{
          fontFamily: 'var(--fd)', fontSize: 22, fontStyle: 'italic',
          color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 8px',
        }}>
          {entry.name}
        </h2>
      </Link>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {entry.sector && (
          <span style={{
            fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text3)',
            padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border2)',
          }}>
            {entry.sector}
          </span>
        )}
        {entry.country && (
          <span style={{
            fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text3)',
            padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border2)',
          }}>
            {entry.country}
          </span>
        )}
      </div>

      {/* Quick stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        padding: '12px 0 0', borderTop: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Momentum
          </div>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: mom.color, fontWeight: 600 }}>
            {mom.label}
          </span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Signal strength
          </div>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 12, color: str.color, fontWeight: 600 }}>
            {str.label}
          </span>
        </div>
      </div>

      {/* Last activity */}
      {entry.lastActivity && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Last active{' '}
          </span>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text2)' }}>
            {timeAgo(entry.lastActivity)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecentIntelColumn — signals + events for one entity
// ─────────────────────────────────────────────────────────────────────────────

function RecentIntelColumn({ entry }: { entry: EntityComparisonEntry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Signals */}
      <div style={GLASS_CARD}>
        <div style={SECTION_HEADER}>Recent Signals</div>
        {entry.recentSignals.length === 0 ? (
          <p style={EMPTY_TEXT}>No recent signals</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {entry.recentSignals.map((sig) => (
              <Link
                key={sig.id}
                href={`/signals/${sig.id}`}
                style={{
                  display: 'block', padding: '10px 0 10px 10px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `2px solid ${CATEGORY_COLORS[sig.category] ?? 'var(--cyan-l)'}`,
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginBottom: 4 }}>
                  {sig.title}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: CATEGORY_COLORS[sig.category] ?? 'var(--text3)',
                    padding: '1px 6px', borderRadius: 8, border: '1px solid var(--border2)',
                  }}>
                    {sig.category}
                  </span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                    {timeAgo(sig.date)}
                  </span>
                  {sig.confidence >= 80 && (
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--emerald-l)' }}>
                      {sig.confidence}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Events */}
      <div style={GLASS_CARD}>
        <div style={SECTION_HEADER}>Recent Events</div>
        {entry.recentEvents.length === 0 ? (
          <p style={EMPTY_TEXT}>No recent events</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {entry.recentEvents.map((evt) => (
              <Link
                key={evt.id}
                href={`/events/${evt.id}`}
                style={{
                  display: 'block', padding: '10px 0 10px 10px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: '2px solid var(--amber-l)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginBottom: 4 }}>
                  {evt.title}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--text3)',
                    padding: '1px 6px', borderRadius: 8, border: '1px solid var(--border2)',
                  }}>
                    {evt.type}
                  </span>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                    {timeAgo(evt.date)}
                  </span>
                  {evt.amount && (
                    <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--amber-l)' }}>
                      {evt.amount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategic Profile row — category breakdown per entity
// ─────────────────────────────────────────────────────────────────────────────

function StrategicProfileCard({ entry }: { entry: EntityComparisonEntry }) {
  // Build category counts from recent signals
  const catCounts = new Map<string, number>();
  for (const sig of entry.recentSignals) {
    catCounts.set(sig.category, (catCounts.get(sig.category) ?? 0) + 1);
  }
  const cats = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div style={GLASS_CARD}>
      <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontStyle: 'italic', color: 'var(--text)', marginBottom: 10 }}>
        {entry.name}
      </div>
      {cats.length === 0 ? (
        <p style={EMPTY_TEXT}>No signal categories yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cats.map(([cat, count]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: CATEGORY_COLORS[cat] ?? 'var(--text3)',
                width: 70,
              }}>
                {cat}
              </span>
              {/* Simple bar */}
              <div style={{
                flex: 1, height: 4, borderRadius: 2,
                background: 'var(--glass2)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(count * 33, 100)}%`, height: '100%',
                  borderRadius: 2,
                  background: CATEGORY_COLORS[cat] ?? 'var(--indigo-l)',
                }} />
              </div>
              <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)', minWidth: 16, textAlign: 'right' }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <Link
          href={`/entity/${entry.slug}`}
          style={{
            fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.06em',
            color: 'var(--text3)', textDecoration: 'none',
          }}
        >
          View full dossier →
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ComparePage(
  { searchParams }: { searchParams: Promise<{ entities?: string }> },
) {
  const { entities: entitiesParam } = await searchParams;

  const slugs = (entitiesParam ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_ENTITIES);

  // ── EMPTY STATE: no entities selected ─────────────────────────────────────
  if (slugs.length === 0) {
    return (
      <div className="page-enter">
        <PageViewTracker path="/compare" />
        <Breadcrumbs />

        {/* Hero */}
        <div className="hero" style={{ padding: '48px 48px 40px', marginBottom: 24 }}>
          <div className="hero-eyebrow">Comparison Workspace</div>
          <h1 className="hero-h1" style={{ fontSize: 38, marginBottom: 14 }}>
            Compare AI Entities
          </h1>
          <p className="hero-sub" style={{ marginBottom: 0, maxWidth: 560 }}>
            Pick {MIN_ENTITIES} to {MAX_ENTITIES} entities and compare them side-by-side —
            signals, momentum, confidence, events, and strategic profile — all on one page.
          </p>
        </div>

        {/* Search input */}
        <div style={{ marginBottom: 24 }}>
          <CompareSearchInput />
        </div>

        {/* Suggested comparisons */}
        <div style={{ ...GLASS_CARD, marginBottom: 24 }}>
          <div style={SECTION_HEADER}>Quick comparisons</div>
          <p style={{ ...EMPTY_TEXT, marginBottom: 16 }}>
            Not sure where to start? Pick one of these curated matchups.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {SUGGESTED_COMPARISONS.map((s) => (
              <Link
                key={s.slugs}
                href={`/compare?entities=${s.slugs}`}
                style={{
                  display: 'block', padding: '14px 16px', borderRadius: 'var(--rs)',
                  border: '1px solid var(--border2)', background: 'var(--glass)',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontFamily: 'var(--f)', fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>
                  {s.desc}
                </div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.04em' }}>
                  {s.slugs.split(',').join(' · ')}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ ...GLASS_CARD }}>
          <div style={SECTION_HEADER}>How compare works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[
              { step: '01', title: 'Select entities', text: `Choose ${MIN_ENTITIES}–${MAX_ENTITIES} tracked entities using the search above or a quick comparison.` },
              { step: '02', title: 'See the breakdown', text: 'View signals, events, confidence, and momentum compared in a structured layout.' },
              { step: '03', title: 'Spot the difference', text: 'Highlighted metrics show which entity leads in each dimension at a glance.' },
            ].map((item) => (
              <div key={item.step}>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 20, color: 'var(--indigo-l)', fontWeight: 600, marginBottom: 8 }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── TOO MANY entities ─────────────────────────────────────────────────────
  if (slugs.length > MAX_ENTITIES) {
    const trimmed = slugs.slice(0, MAX_ENTITIES).join(',');
    return (
      <div className="page-enter">
        <PageViewTracker path="/compare" />
        <Breadcrumbs />
        <div className="hero" style={{ padding: '40px', marginBottom: 20 }}>
          <div className="hero-eyebrow">Too many entities</div>
          <h1 style={{
            fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic',
            color: 'var(--text)', margin: '0 0 10px',
          }}>
            Maximum {MAX_ENTITIES} entities allowed
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, maxWidth: 520, marginBottom: 20 }}>
            You provided {slugs.length} entities. Compare supports up to {MAX_ENTITIES} at a time.
            We trimmed to the first {MAX_ENTITIES}:
          </p>
          <Link
            href={`/compare?entities=${trimmed}`}
            style={{
              fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.06em',
              color: 'var(--cyan-l)', textDecoration: 'none',
              padding: '8px 18px', borderRadius: 7,
              border: '1px solid rgba(103,232,249,0.2)',
              background: 'rgba(103,232,249,0.05)',
            }}
          >
            Compare first {MAX_ENTITIES} →
          </Link>
        </div>
      </div>
    );
  }

  // ── SINGLE entity state ───────────────────────────────────────────────────
  if (slugs.length === 1) {
    return (
      <div className="page-enter">
        <PageViewTracker path="/compare" />
        <Breadcrumbs />

        <div className="hero" style={{ padding: '40px 48px', marginBottom: 20 }}>
          <div className="hero-eyebrow">Almost there</div>
          <h1 style={{
            fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic',
            color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 10px',
          }}>
            Add at least one more entity
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, maxWidth: 520, marginBottom: 20 }}>
            You selected <strong style={{ color: 'var(--text)' }}>{slugs[0]}</strong>.
            Add {MIN_ENTITIES - 1} more to start the comparison ({MIN_ENTITIES}–{MAX_ENTITIES} required).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['anthropic', 'deepseek', 'google-deepmind', 'meta-ai', 'openai', 'microsoft'].filter((s) => s !== slugs[0]).slice(0, 5).map((suggestion) => (
              <Link
                key={suggestion}
                href={`/compare?entities=${slugs[0]},${suggestion}`}
                style={{
                  fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.05em',
                  color: 'var(--cyan-l)', textDecoration: 'none',
                  padding: '6px 14px', borderRadius: 7,
                  border: '1px solid rgba(103,232,249,0.2)',
                  background: 'rgba(103,232,249,0.05)',
                }}
              >
                + {suggestion}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <CompareSearchInput initialSlugs={slugs} />
        </div>

        <div style={GLASS_CARD}>
          <div style={SECTION_HEADER}>Or view the full profile</div>
          <Link
            href={`/entity/${slugs[0]}`}
            style={{ color: 'var(--text2)', fontSize: 13, textDecoration: 'none' }}
          >
            Open entity dossier for <strong style={{ color: 'var(--text)' }}>{slugs[0]}</strong> →
          </Link>
        </div>
      </div>
    );
  }

  // ── Fetch comparison data ─────────────────────────────────────────────────
  const entries = await getEntityComparison(slugs);

  // ── NO ENTITIES FOUND state ───────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="page-enter">
        <PageViewTracker path="/compare" />
        <Breadcrumbs />

        <div className="hero" style={{ padding: '40px 48px', marginBottom: 20 }}>
          <div className="hero-eyebrow">No matches</div>
          <h1 style={{
            fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic',
            color: 'var(--text)', margin: '0 0 10px',
          }}>
            No entities recognized
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, maxWidth: 520, marginBottom: 20 }}>
            None of the requested slugs matched tracked entities:{' '}
            <strong style={{ color: 'var(--amber-l)' }}>{slugs.join(', ')}</strong>.
            Check the spelling or try a suggested comparison below.
          </p>
          <Link
            href="/compare"
            style={{
              fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.06em',
              color: 'var(--cyan-l)', textDecoration: 'none',
              padding: '8px 18px', borderRadius: 7,
              border: '1px solid rgba(103,232,249,0.2)',
              background: 'rgba(103,232,249,0.05)',
            }}
          >
            ← Back to Compare
          </Link>
        </div>

        <div style={GLASS_CARD}>
          <div style={SECTION_HEADER}>Try a suggested comparison</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTED_COMPARISONS.map((s) => (
              <Link
                key={s.slugs}
                href={`/compare?entities=${s.slugs}`}
                style={{
                  fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.05em',
                  color: 'var(--text2)', textDecoration: 'none',
                  padding: '6px 14px', borderRadius: 7,
                  border: '1px solid var(--border2)', background: 'var(--glass)',
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If only one was found (others invalid), redirect-style message
  if (entries.length === 1) {
    return (
      <div className="page-enter">
        <PageViewTracker path="/compare" />
        <Breadcrumbs />

        <div className="hero" style={{ padding: '40px 48px', marginBottom: 20 }}>
          <div className="hero-eyebrow">Partial match</div>
          <h1 style={{
            fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic',
            color: 'var(--text)', margin: '0 0 10px',
          }}>
            Only one entity found
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, maxWidth: 520, marginBottom: 16 }}>
            <strong style={{ color: 'var(--text)' }}>{entries[0].name}</strong> was recognized,
            but the others were not: <strong style={{ color: 'var(--amber-l)' }}>{slugs.filter((s) => s !== entries[0].slug).join(', ')}</strong>.
            Add a valid second entity to start comparing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['anthropic', 'deepseek', 'google-deepmind', 'meta-ai', 'openai'].filter((s) => s !== entries[0].slug).slice(0, 4).map((suggestion) => (
              <Link
                key={suggestion}
                href={`/compare?entities=${entries[0].slug},${suggestion}`}
                style={{
                  fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.05em',
                  color: 'var(--cyan-l)', textDecoration: 'none',
                  padding: '6px 14px', borderRadius: 7,
                  border: '1px solid rgba(103,232,249,0.2)',
                  background: 'rgba(103,232,249,0.05)',
                }}
              >
                + {suggestion}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPARISON VIEW (2–5 entities) ────────────────────────────────────────
  const foundSlugs = new Set(entries.map((e) => e.slug));
  const missingSlugs = slugs.filter((s) => !foundSlugs.has(s));

  return (
    <div className="page-enter">
      <PageViewTracker path="/compare" />
      <Breadcrumbs />

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}
      <div className="hero" style={{ padding: '36px 48px 32px', marginBottom: 24 }}>
        <div className="hero-eyebrow">
          Comparing {entries.length} entities
        </div>
        <h1 className="hero-h1" style={{ fontSize: 32, marginBottom: 10 }}>
          {entries.map((e) => e.name).join(' vs ')}
        </h1>
        {missingSlugs.length > 0 && (
          <p style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--amber-l)', marginBottom: 8 }}>
            Not found: {missingSlugs.join(', ')}
          </p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
          Side-by-side intelligence comparison — signals, metrics, momentum, and strategic profile.
        </p>
      </div>

      {/* ── Section 2: Overview Cards ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...SECTION_HEADER, marginBottom: 14, paddingLeft: 2 }}>
          Overview
        </div>
        <div
          className="compare-grid"
          style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}
        >
          {entries.map((entry) => (
            <OverviewCard key={entry.slug} entry={entry} />
          ))}
        </div>
      </div>

      {/* ── Section 3: Intelligence Metrics Table ─────────────────────────── */}
      <div style={{ ...GLASS_CARD, marginBottom: 24 }}>
        <div style={SECTION_HEADER}>Intelligence Metrics</div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `140px repeat(${entries.length}, 1fr)`,
          gap: 12, padding: '8px 0 12px',
          borderBottom: '2px solid var(--border2)',
        }}>
          <span style={{ fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Metric
          </span>
          {entries.map((e) => (
            <Link
              key={e.slug}
              href={`/entity/${e.slug}`}
              style={{
                fontFamily: 'var(--fd)', fontSize: 15, fontStyle: 'italic',
                color: 'var(--text)', textAlign: 'center', textDecoration: 'none',
              }}
            >
              {e.name}
            </Link>
          ))}
        </div>

        <MetricRow label="Signals · 24h" values={entries.map((e) => e.signals24h)} color="var(--cyan-l)" highlight="max" />
        <MetricRow label="Signals · 7d" values={entries.map((e) => e.signals7d)} color="var(--indigo-l)" highlight="max" />
        <MetricRow label="Signals · 30d" values={entries.map((e) => e.signals30d)} color="var(--indigo-l)" highlight="max" />
        <MetricRow label="Total Signals" values={entries.map((e) => e.signalsTotal)} color="var(--emerald-l)" highlight="max" />
        <MetricRow label="Total Events" values={entries.map((e) => e.eventsTotal)} color="var(--amber-l)" highlight="max" />
        <MetricRow label="Avg Confidence" values={entries.map((e) => e.avgConfidence > 0 ? `${e.avgConfidence.toFixed(0)}%` : '—')} color="var(--emerald-l)" />
        <MetricRow
          label="Momentum"
          values={entries.map((e) => momentumLabel(e.signals24h, e.signals7d).label)}
        />
        <MetricRow
          label="Last Activity"
          values={entries.map((e) => e.lastActivity ? timeAgo(e.lastActivity) : '—')}
        />
      </div>

      {/* ── Section 4: Recent Intelligence (side-by-side) ─────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...SECTION_HEADER, marginBottom: 14, paddingLeft: 2 }}>
          Recent Intelligence
        </div>
        <div
          className="compare-grid"
          style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}
        >
          {entries.map((entry) => (
            <RecentIntelColumn key={entry.slug} entry={entry} />
          ))}
        </div>
      </div>

      {/* ── Section 5: Strategic Profile ──────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...SECTION_HEADER, marginBottom: 14, paddingLeft: 2 }}>
          Strategic Profile
        </div>
        <div
          className="compare-grid"
          style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}
        >
          {entries.map((entry) => (
            <StrategicProfileCard key={entry.slug} entry={entry} />
          ))}
        </div>
      </div>

      {/* ── Section 6: Modify comparison ──────────────────────────────────── */}
      <div style={{ ...GLASS_CARD }}>
        <div style={SECTION_HEADER}>Modify this comparison</div>
        <CompareSearchInput initialSlugs={entries.map((e) => e.slug)} />
      </div>
    </div>
  );
}
