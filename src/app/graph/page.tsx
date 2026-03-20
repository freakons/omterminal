import type { Metadata } from 'next';
import { IntelligenceGraph } from '@/ui/graph/IntelligenceGraph';
import { GraphErrorBoundary } from '@/ui/graph/GraphErrorBoundary';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export const metadata: Metadata = {
  title: 'AI Ecosystem Graph',
  description:
    'Interactive force-directed map of relationships between AI companies, events, and signals.',
};

// ── Node legend ────────────────────────────────────────────────────────────────

const NODE_LEGEND = [
  // Entity subtypes — circles
  { label: 'Company',   color: '#3b82f6', shape: 'circle'   as const },
  { label: 'Investor',  color: '#a855f7', shape: 'circle'   as const },
  { label: 'Regulator', color: '#f97316', shape: 'circle'   as const },
  // Events — diamond
  { label: 'Event',     color: '#f59e0b', shape: 'diamond'  as const },
  // Signals — triangle
  { label: 'Signal',    color: '#10b981', shape: 'triangle' as const },
] as const;

// ── Edge type legend ───────────────────────────────────────────────────────────

const EDGE_LEGEND = [
  { label: 'Funding',       color: '#4ade80', dash: '',      width: 2   },
  { label: 'Partnership',   color: '#60a5fa', dash: '',      width: 2   },
  { label: 'Model Release', color: '#c084fc', dash: '',      width: 2   },
  { label: 'Competition',   color: '#f87171', dash: '5,3',   width: 2   },
  { label: 'Regulation',    color: '#fb923c', dash: '7,4',   width: 2   },
  { label: 'Co-occurrence', color: '#93c5fd', dash: '',      width: 1.5 },
] as const;

// ── Shape SVG helpers ──────────────────────────────────────────────────────────

function NodeShape({ shape, color }: { shape: 'circle' | 'diamond' | 'triangle'; color: string }) {
  const s = 12;
  const glow = `drop-shadow(0 0 4px ${color})`;
  if (shape === 'diamond') {
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" style={{ filter: glow, flexShrink: 0 }}>
        <polygon points="6,0 12,6 6,12 0,6" fill={color} />
      </svg>
    );
  }
  if (shape === 'triangle') {
    return (
      <svg width={s} height={s} viewBox="0 0 12 12" style={{ filter: glow, flexShrink: 0 }}>
        <polygon points="6,1 11,11 1,11" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" style={{ filter: glow, flexShrink: 0 }}>
      <circle cx={6} cy={6} r={5.5} fill={color} />
    </svg>
  );
}

export default function GraphPage() {
  return (
    <>
      <PageViewTracker path="/graph" />
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: 'Instrument Serif, Georgia, serif',
          fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
          fontWeight: 400,
          color: 'var(--text)',
          marginBottom: 8,
          lineHeight: 1.2,
        }}>
          AI Ecosystem{' '}
          <span style={{ color: 'var(--cyan-l, #67e8f9)' }}>Graph</span>
        </h1>
        <p style={{
          color: 'var(--text2)',
          fontSize: '0.9rem',
          margin: 0,
          maxWidth: 520,
        }}>
          Intelligence map of AI companies, models, investors, and regulatory signals.
          Click any entity to focus and explore its ecosystem. Hover to highlight connections.
          Press <kbd style={{ fontFamily: 'monospace', fontSize: '0.78rem', padding: '0 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 }}>Esc</kbd> or click Reset to return to full view.
        </p>
      </div>

      {/* Legend panel */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginBottom: 16,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: 10,
      }}>

        {/* ── Nodes section ── */}
        <span style={{
          fontSize: '0.65rem',
          color: 'rgba(238,238,248,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          Nodes
        </span>

        {NODE_LEGEND.map(({ label, color, shape }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NodeShape shape={shape} color={color} />
            <span style={{ fontSize: '0.76rem', color: 'var(--text2)', letterSpacing: '0.03em' }}>
              {label}
            </span>
          </div>
        ))}

        {/* Divider */}
        <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0, alignSelf: 'center' }} />

        {/* ── Edges section ── */}
        <span style={{
          fontSize: '0.65rem',
          color: 'rgba(238,238,248,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          Edges
        </span>

        {EDGE_LEGEND.map(({ label, color, dash, width }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={20} height={8} style={{ flexShrink: 0 }}>
              <line
                x1={0} y1={4} x2={20} y2={4}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dash || undefined}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '0.76rem', color: 'var(--text2)', letterSpacing: '0.03em' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Graph panel */}
      <div style={{
        background: 'var(--glass, rgba(255,255,255,0.032))',
        border: '1px solid var(--border, rgba(255,255,255,0.065))',
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 620,
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}>
        <GraphErrorBoundary>
          <IntelligenceGraph />
        </GraphErrorBoundary>
      </div>
    </>
  );
}
