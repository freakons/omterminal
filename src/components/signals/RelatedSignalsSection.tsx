import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { Signal } from '@/data/mockSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface RelatedSignalsSectionProps {
  signals: Signal[];
}

/**
 * RelatedSignalsSection — shows related signals as compact clickable cards
 * in the main content area of the signal detail page.
 */
export function RelatedSignalsSection({ signals }: RelatedSignalsSectionProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <div style={GLASS_CARD}>
      <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>
        Related Signals
        <span style={{
          marginLeft: 8, fontFamily: 'var(--fm)', fontSize: 8,
          color: 'var(--text3)', opacity: 0.7,
        }}>
          {signals.length}
        </span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {signals.map((rel) => (
          <Link
            key={rel.id}
            href={`/signals/${rel.id}`}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '14px 16px', borderRadius: 10,
              border: '1px solid var(--border2)', background: 'var(--glass2)',
              textDecoration: 'none', transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge category={rel.category} />
              {rel.confidence >= 90 && (
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.08em',
                  color: 'var(--emerald-l)',
                }}>
                  Verified
                </span>
              )}
            </div>
            <span style={{
              fontSize: 13, color: 'var(--text2)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {rel.title}
            </span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
                {formatDate(rel.date)}
              </span>
              {rel.significanceScore != null && (
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)',
                }}>
                  Sig {rel.significanceScore}
                </span>
              )}
              {rel.entityName && (
                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--indigo-l)',
                  marginLeft: 'auto',
                }}>
                  {rel.entityName}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
