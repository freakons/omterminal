import type { Metadata } from 'next';
import { IntelligenceGraph } from '@/ui/graph/IntelligenceGraph';
import { GraphErrorBoundary } from '@/ui/graph/GraphErrorBoundary';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export const metadata: Metadata = {
  title: 'AI Ecosystem Graph',
  description:
    'Interactive intelligence map of relationships between AI companies, models, investors, and regulatory signals.',
};

// ── Node legend ────────────────────────────────────────────────────────────────

const NODE_LEGEND = [
  { label: 'Company',   color: '#60a5fa', shape: 'circle'   as const },
  { label: 'Investor',  color: '#a78bfa', shape: 'circle'   as const },
  { label: 'Model',     color: '#34d399', shape: 'circle'   as const },
  { label: 'Regulator', color: '#fb923c', shape: 'circle'   as const },
  { label: 'Event',     color: '#fbbf24', shape: 'diamond'  as const },
  { label: 'Signal',    color: '#22d3ee', shape: 'triangle' as const },
] as const;

// ── Edge type legend ───────────────────────────────────────────────────────────

const EDGE_LEGEND = [
  { label: 'Funding',       color: '#4ade80', dash: '',    width: 2   },
  { label: 'Partnership',   color: '#60a5fa', dash: '',    width: 2   },
  { label: 'Model Release', color: '#a78bfa', dash: '',    width: 2   },
  { label: 'Competition',   color: '#f87171', dash: '5,3', width: 2   },
  { label: 'Regulation',    color: '#fb923c', dash: '7,4', width: 2   },
] as const;

// ── Shape SVG helpers ──────────────────────────────────────────────────────────

function NodeShape({ shape, color }: { shape: 'circle' | 'diamond' | 'triangle'; color: string }) {
  const s = 10;
  const glow = `drop-shadow(0 0 3px ${color}90)`;
  if (shape === 'diamond') {
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" style={{ filter: glow, flexShrink: 0 }}>
        <polygon points="5,0 10,5 5,10 0,5" fill={color} />
      </svg>
    );
  }
  if (shape === 'triangle') {
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" style={{ filter: glow, flexShrink: 0 }}>
        <polygon points="5,0.5 9.5,9.5 0.5,9.5" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" style={{ filter: glow, flexShrink: 0 }}>
      <circle cx={5} cy={5} r={4.5} fill={color} />
    </svg>
  );
}

export default function GraphPage() {
  return (
    <>
      <PageViewTracker path="/graph" />

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 'clamp(1.55rem, 2.8vw, 2.1rem)',
            fontWeight: 400,
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}>
            AI Ecosystem{' '}
            <span style={{ color: 'var(--cyan-l, #67e8f9)', fontStyle: 'italic' }}>Graph</span>
          </h1>
          {/* Live badge */}
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(52,211,153,0.7)',
            border: '1px solid rgba(52,211,153,0.22)',
            borderRadius: 5,
            padding: '1px 7px',
            verticalAlign: 'middle',
          }}>
            Intelligence
          </span>
        </div>
        <p style={{
          color: 'var(--text2)',
          fontSize: '0.88rem',
          margin: 0,
          maxWidth: 520,
          lineHeight: 1.6,
        }}>
          Signal-driven map of AI companies, models, investors, and regulatory actors.
          Search or click any entity to explore its ecosystem. Pin a node to keep context while navigating.
        </p>
      </div>

      {/* ── Legend bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginBottom: 14,
        padding: '9px 16px',
        background: 'rgba(255,255,255,0.022)',
        border: '1px solid rgba(255,255,255,0.055)',
        borderRadius: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: 8,
      }}>

        {/* Nodes section */}
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '0.58rem',
          color: 'rgba(238,238,248,0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          Nodes
        </span>

        {NODE_LEGEND.map(({ label, color, shape }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <NodeShape shape={shape} color={color} />
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.68rem',
              color: 'var(--text2)',
              letterSpacing: '0.03em',
            }}>
              {label}
            </span>
          </div>
        ))}

        {/* Divider */}
        <span style={{
          width: 1,
          height: 14,
          background: 'rgba(255,255,255,0.07)',
          flexShrink: 0,
          alignSelf: 'center',
        }} />

        {/* Edges section */}
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: '0.58rem',
          color: 'rgba(238,238,248,0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          Edges
        </span>

        {EDGE_LEGEND.map(({ label, color, dash, width }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={18} height={6} style={{ flexShrink: 0 }}>
              <line
                x1={0} y1={3} x2={18} y2={3}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dash || undefined}
                strokeLinecap="round"
              />
            </svg>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.68rem',
              color: 'var(--text2)',
              letterSpacing: '0.03em',
            }}>
              {label}
            </span>
          </div>
        ))}

        {/* Hint */}
        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.62rem',
            color: 'rgba(238,238,248,0.2)',
          }}>
            Node size = signal volume
          </span>
        </span>
      </div>

      {/* ── Graph panel ──────────────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 640,
        boxShadow: '0 2px 24px rgba(0,0,0,0.38), inset 0 0 0 1px rgba(255,255,255,0.03)',
        position: 'relative',
      }}>
        {/* Vignette overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(4,4,14,0.35) 100%)',
        }} />
        <GraphErrorBoundary>
          <IntelligenceGraph />
        </GraphErrorBoundary>
      </div>

      {/* ── Usage hint ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}>
        {[
          { key: '/',            desc: 'search entities' },
          { key: 'Click entity', desc: 'focus + center' },
          { key: 'Pin',          desc: 'anchor while exploring' },
          { key: 'Hover node',   desc: 'preview connections' },
          { key: 'Hover edge',   desc: 'relationship detail' },
          { key: 'Esc',          desc: 'back / exit focus' },
        ].map(({ key, desc }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.62rem',
              padding: '1px 6px',
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: 'rgba(238,238,248,0.5)',
            }}>
              {key}
            </kbd>
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.62rem',
              color: 'rgba(238,238,248,0.22)',
            }}>
              {desc}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
