'use client';

import { type GraphNode, type GraphLink, type EdgeType } from '@/data/mockGraph';

type RuntimeNode = GraphNode & { x?: number; y?: number };

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  'funding':       'funding',
  'competition':   'competitive dynamics',
  'partnership':   'partnership',
  'model-release': 'model release activity',
  'regulation':    'regulatory overlap',
};

const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  'funding':       '#4ade80',
  'competition':   '#f87171',
  'partnership':   '#60a5fa',
  'model-release': '#c084fc',
  'regulation':    '#fb923c',
};

function relativeTimeframe(iso: string): string | null {
  try {
    const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
    if (days < 7)  return 'the last week';
    if (days < 31) return 'the last month';
    if (days < 91) return 'the last 3 months';
    if (days < 365) return 'the last year';
    return null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function tierLabel(tier: string): string {
  if (tier === 'strong')   return 'Strong';
  if (tier === 'moderate') return 'Moderate';
  if (tier === 'weak')     return 'Weak';
  return tier;
}

function tierColor(tier: string): string {
  if (tier === 'strong')   return '#93c5fd';
  if (tier === 'moderate') return '#fcd34d';
  return 'rgba(238,238,248,0.65)';
}

function resolveLabel(n: string | RuntimeNode, nodes: GraphNode[]): string {
  if (typeof n === 'object' && n !== null) return n.label;
  return nodes.find(node => node.id === n)?.label ?? String(n);
}

/**
 * Generates a short natural-language explanation of the relationship,
 * prioritising the most specific data available.
 *
 * Priority:
 *   1. Shared signals + timeframe → "Connected through X shared signals in the last Y days"
 *   2. Shared signals only        → "Connected through X shared signals"
 *   3. Edge type                  → "Connected via [relationship type]"
 *   4. Tier only                  → "[Tier] connection"
 *   5. Fallback                   → null (renders nothing)
 */
function buildExplanation(link: GraphLink): string | null {
  const sigs      = link.sharedSignals;
  const timeframe = link.lastInteraction ? relativeTimeframe(link.lastInteraction) : null;
  const edgeLabel = link.edgeType ? EDGE_TYPE_LABELS[link.edgeType] : null;

  if (sigs != null) {
    const sigPart  = `Connected through ${sigs} shared signal${sigs !== 1 ? 's' : ''}`;
    const timePart = timeframe ? ` in ${timeframe}` : '';
    return `${sigPart}${timePart}.`;
  }

  if (edgeLabel) {
    return `Connected via ${edgeLabel}.`;
  }

  if (link.tier) {
    return `${tierLabel(link.tier)} connection based on co-occurrence.`;
  }

  return null;
}

interface ConnectionExplanationPanelProps {
  focusedNode: RuntimeNode | null;
  /** Top 2–3 entity↔entity links, sorted strongest-first. */
  topLinks: GraphLink[];
  nodes: GraphNode[];
}

export function ConnectionExplanationPanel({
  focusedNode,
  topLinks,
  nodes,
}: ConnectionExplanationPanelProps) {
  if (!focusedNode || topLinks.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 220,
        pointerEvents: 'none',
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontSize: '0.67rem',
          color: 'rgba(238,238,248,0.38)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          paddingLeft: 2,
        }}
      >
        Top connections
      </div>

      {topLinks.map((link, i) => {
        const srcLabel    = resolveLabel(link.source as string | RuntimeNode, nodes);
        const tgtLabel    = resolveLabel(link.target as string | RuntimeNode, nodes);
        const explanation = buildExplanation(link);
        const edgeColor   = link.edgeType ? EDGE_TYPE_COLORS[link.edgeType] : null;
        const accentColor = link.tier
          ? tierColor(link.tier)
          : edgeColor ?? 'rgba(255,255,255,0.15)';

        return (
          <div
            key={i}
            style={{
              background: 'rgba(15,15,30,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `2px solid ${accentColor}`,
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: '0.74rem',
              color: 'rgba(238,238,248,0.85)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {/* Entity pair */}
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexWrap: 'wrap',
                lineHeight: 1.3,
              }}
            >
              <span style={{ color: '#93c5fd' }}>{srcLabel}</span>
              <span style={{ color: 'rgba(238,238,248,0.28)', fontSize: '0.8rem' }}>↔</span>
              <span style={{ color: '#93c5fd' }}>{tgtLabel}</span>
            </div>

            {/* Strength + tier badge + edge type */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {link.tier && (
                <span
                  style={{
                    color: tierColor(link.tier),
                    fontSize: '0.69rem',
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                  }}
                >
                  {tierLabel(link.tier)}
                </span>
              )}
              {link.strength != null && (
                <span style={{ color: 'rgba(238,238,248,0.38)', fontSize: '0.69rem' }}>
                  {Math.round(link.strength)}/100
                </span>
              )}
              {link.edgeType && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: EDGE_TYPE_COLORS[link.edgeType],
                    background: `${EDGE_TYPE_COLORS[link.edgeType]}1a`,
                    border: `1px solid ${EDGE_TYPE_COLORS[link.edgeType]}35`,
                    borderRadius: 3,
                    padding: '0 4px',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                    textTransform: 'capitalize',
                  }}
                >
                  {link.edgeType.replace('-', ' ')}
                </span>
              )}
            </div>

            {/* Natural-language explanation */}
            {explanation && (
              <div
                style={{
                  color: 'rgba(238,238,248,0.52)',
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                }}
              >
                {explanation}
              </div>
            )}

            {/* Last interaction — only shown when no timeframe in explanation */}
            {link.lastInteraction && !relativeTimeframe(link.lastInteraction) && (
              <div style={{ color: 'rgba(238,238,248,0.32)', fontSize: '0.67rem' }}>
                Last active: {formatDate(link.lastInteraction)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
