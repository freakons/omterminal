import type { Metadata } from 'next';
import { IntelligenceGraph } from '@/ui/graph/IntelligenceGraph';

export const metadata: Metadata = {
  title: 'AI Ecosystem Graph',
  description:
    'Interactive force-directed map of relationships between AI companies, events, and signals.',
};

const NODE_LEGEND = [
  { label: 'Entity',  color: '#3b82f6' },
  { label: 'Event',   color: '#f59e0b' },
  { label: 'Signal',  color: '#10b981' },
] as const;

const EDGE_LEGEND = [
  { label: 'Strong',   width: 3,   opacity: 0.85, color: '#93c5fd' },
  { label: 'Moderate', width: 2,   opacity: 0.6,  color: '#93c5fd' },
  { label: 'Weak',     width: 1.2, opacity: 0.35, color: '#93c5fd' },
] as const;

export default function GraphPage() {
  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
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
          Force-directed map of AI companies, events, and signals.
          Hover a node to highlight its connections. Click to inspect.
        </p>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Node types */}
        {NODE_LEGEND.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text2)', letterSpacing: '0.04em' }}>
              {label}
            </span>
          </div>
        ))}

        {/* Divider */}
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Edge strength */}
        {EDGE_LEGEND.map(({ label, width, opacity, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width={22} height={10} style={{ flexShrink: 0 }}>
              <line
                x1={0} y1={5} x2={22} y2={5}
                stroke={color}
                strokeWidth={width}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '0.78rem', color: 'var(--text2)', letterSpacing: '0.04em' }}>
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
        <IntelligenceGraph />
      </div>
    </>
  );
}
