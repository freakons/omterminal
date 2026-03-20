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
  'model-release': '#a78bfa',
  'regulation':    '#fb923c',
};

function relativeTimeframe(iso: string): string | null {
  try {
    const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
    if (days < 7)  return 'last 7 days';
    if (days < 31) return 'last month';
    if (days < 91) return 'last 3 months';
    if (days < 365) return 'last year';
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
  return 'rgba(238,238,248,0.52)';
}

function resolveLabel(n: string | RuntimeNode, nodes: GraphNode[]): string {
  if (typeof n === 'object' && n !== null) return n.label;
  return nodes.find(node => node.id === n)?.label ?? String(n);
}

/**
 * Generates a short natural-language explanation of the relationship.
 */
function buildExplanation(link: GraphLink): string | null {
  const sigs      = link.sharedSignals;
  const timeframe = link.lastInteraction ? relativeTimeframe(link.lastInteraction) : null;
  const edgeLabel = link.edgeType ? EDGE_TYPE_LABELS[link.edgeType] : null;

  if (sigs != null) {
    const sigPart  = `${sigs} shared signal${sigs !== 1 ? 's' : ''}`;
    const timePart = timeframe ? ` · ${timeframe}` : '';
    return `${sigPart}${timePart}`;
  }

  if (edgeLabel) return `Connected via ${edgeLabel}`;

  if (link.tier) return `${tierLabel(link.tier)} connection`;

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
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        width: 214,
        pointerEvents: 'none',
      }}
    >
      {/* Section label */}
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: '0.58rem',
        color: 'rgba(238,238,248,0.28)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        paddingLeft: 3,
      }}>
        Top connections
      </div>

      {topLinks.map((link, i) => {
        const srcLabel    = resolveLabel(link.source as string | RuntimeNode, nodes);
        const tgtLabel    = resolveLabel(link.target as string | RuntimeNode, nodes);
        const explanation = buildExplanation(link);
        const edgeColor   = link.edgeType ? EDGE_TYPE_COLORS[link.edgeType] : null;
        const accentColor = edgeColor ?? (link.tier ? tierColor(link.tier) : 'rgba(255,255,255,0.1)');
        const rankLabel   = i === 0 ? 'strongest' : i === 1 ? '2nd' : '3rd';

        return (
          <div
            key={i}
            style={{
              background: 'rgba(6,6,18,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: `2px solid ${accentColor}`,
              borderRadius: 8,
              padding: '11px 13px',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {/* Rank + edge type row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
            }}>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.58rem',
                color: 'rgba(238,238,248,0.22)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {rankLabel}
              </span>
              {link.edgeType && (
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '0.58rem',
                  color: EDGE_TYPE_COLORS[link.edgeType],
                  background: `${EDGE_TYPE_COLORS[link.edgeType]}14`,
                  border: `1px solid ${EDGE_TYPE_COLORS[link.edgeType]}30`,
                  borderRadius: 4,
                  padding: '0 5px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {link.edgeType.replace('-', ' ')}
                </span>
              )}
            </div>

            {/* Entity pair */}
            <div style={{
              fontWeight: 600,
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexWrap: 'wrap',
              lineHeight: 1.3,
              color: '#f0f0fa',
            }}>
              <span style={{ color: '#93c5fd' }}>{srcLabel}</span>
              <span style={{ color: 'rgba(238,238,248,0.22)', fontSize: '0.75rem' }}>↔</span>
              <span style={{ color: '#93c5fd' }}>{tgtLabel}</span>
            </div>

            {/* Strength + tier */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
              {link.tier && (
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  color: tierColor(link.tier),
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                }}>
                  {tierLabel(link.tier)}
                </span>
              )}
              {link.strength != null && (
                <span style={{
                  fontFamily: 'DM Mono, monospace',
                  color: 'rgba(238,238,248,0.3)',
                  fontSize: '0.65rem',
                }}>
                  {Math.round(link.strength)}/100
                </span>
              )}
            </div>

            {/* Intelligence explanation */}
            {explanation && (
              <div style={{
                fontFamily: 'DM Mono, monospace',
                color: 'rgba(238,238,248,0.42)',
                fontSize: '0.66rem',
                lineHeight: 1.5,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: 5,
              }}>
                {explanation}
              </div>
            )}

            {/* Last interaction (only when no timeframe in explanation) */}
            {link.lastInteraction && !relativeTimeframe(link.lastInteraction) && (
              <div style={{
                fontFamily: 'DM Mono, monospace',
                color: 'rgba(238,238,248,0.25)',
                fontSize: '0.63rem',
              }}>
                {formatDate(link.lastInteraction)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
