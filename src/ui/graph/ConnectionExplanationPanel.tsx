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

/** Short display labels for edge type pills */
const EDGE_TYPE_SHORT: Record<EdgeType, string> = {
  'funding':       'funding',
  'competition':   'competition',
  'partnership':   'partnership',
  'model-release': 'model release',
  'regulation':    'regulation',
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
 * Returns node accent color based on subtype.
 */
function subtypeColor(node: GraphNode): string {
  if (node.subtype === 'investor')  return '#a78bfa';
  if (node.subtype === 'model')     return '#34d399';
  if (node.subtype === 'regulator') return '#fb923c';
  return '#60a5fa';
}

/**
 * Generates a short natural-language explanation of why nodes are connected.
 * Includes edge type context in parentheses when shared signals are present.
 *
 * Examples:
 *   "14 shared signals (competition) · last month"
 *   "3 shared signals (funding) · last 3 months"
 *   "Connected via regulatory overlap"
 *   "Strong connection"
 */
function buildExplanation(link: GraphLink): string | null {
  const sigs      = link.sharedSignals;
  const timeframe = link.lastInteraction ? relativeTimeframe(link.lastInteraction) : null;
  const edgeType  = link.edgeType;

  if (sigs != null) {
    const sigPart  = `${sigs} shared signal${sigs !== 1 ? 's' : ''}`;
    // Include edge type context so the user understands the signal category
    const edgePart = edgeType ? ` (${EDGE_TYPE_SHORT[edgeType]})` : '';
    const timePart = timeframe ? ` · ${timeframe}` : '';
    return `${sigPart}${edgePart}${timePart}`;
  }

  if (edgeType) return `Connected via ${EDGE_TYPE_LABELS[edgeType]}`;

  if (link.tier) return `${tierLabel(link.tier)} connection`;

  return null;
}

/**
 * Builds a one-line summary of activity across all top connections.
 * Aggregates total signals + lists unique edge types.
 *
 * Examples:
 *   "17 signals · competition + funding"
 *   "8 signals · model release"
 *   "competition + regulation activity"
 */
function buildConnectionSummary(topLinks: GraphLink[]): string | null {
  if (topLinks.length === 0) return null;

  const totalSignals = topLinks.reduce((sum, l) => sum + (l.sharedSignals ?? 0), 0);
  const uniqueTypes = [
    ...new Set(topLinks.map(l => l.edgeType).filter((t): t is EdgeType => t != null)),
  ];

  if (totalSignals > 0 && uniqueTypes.length > 0) {
    const typeLabels = uniqueTypes.slice(0, 2).map(t => EDGE_TYPE_SHORT[t]).join(' + ');
    return `${totalSignals} signal${totalSignals !== 1 ? 's' : ''} · ${typeLabels}`;
  }
  if (totalSignals > 0) {
    return `${totalSignals} shared signal${totalSignals !== 1 ? 's' : ''} across top connections`;
  }
  if (uniqueTypes.length > 0) {
    return uniqueTypes.slice(0, 2).map(t => EDGE_TYPE_SHORT[t]).join(' + ') + ' activity';
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

  const nodeAccent = subtypeColor(focusedNode);
  const connectionSummary = buildConnectionSummary(topLinks);

  // Unique edge types across top connections — shows activity profile at a glance
  const topConnectionTypes = [
    ...new Set(topLinks.map(l => l.edgeType).filter((t): t is EdgeType => t != null)),
  ].slice(0, 3);

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
      {/* ── Focused node detail card ───────────────────────────────────────── */}
      <div style={{
        background: 'rgba(6,6,18,0.93)',
        border: `1px solid ${nodeAccent}20`,
        borderLeft: `2px solid ${nodeAccent}55`,
        borderRadius: 8,
        padding: '11px 13px',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}>
        {/* Node label */}
        <div style={{
          fontWeight: 600,
          fontSize: '0.76rem',
          color: nodeAccent,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {focusedNode.label}
        </div>

        {/* Signal count + momentum */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {focusedNode.importance != null && focusedNode.importance > 0 && (
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.62rem',
              color: 'rgba(34,211,238,0.85)',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 4,
              padding: '0 5px',
              letterSpacing: '0.02em',
            }}>
              {focusedNode.importance} signal{focusedNode.importance !== 1 ? 's' : ''}
            </span>
          )}
          {focusedNode.momentum != null && focusedNode.momentum > 0 && (
            <span style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '0.62rem',
              color: 'rgba(251,191,36,0.85)',
              background: 'rgba(251,191,36,0.07)',
              border: '1px solid rgba(251,191,36,0.18)',
              borderRadius: 4,
              padding: '0 5px',
              letterSpacing: '0.02em',
            }}>
              ↑ {Math.round(focusedNode.momentum)} momentum
            </span>
          )}
        </div>

        {/* Top connection types — activity profile at a glance */}
        {topConnectionTypes.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {topConnectionTypes.map(t => (
              <span key={t} style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.57rem',
                color: EDGE_TYPE_COLORS[t],
                background: `${EDGE_TYPE_COLORS[t]}11`,
                border: `1px solid ${EDGE_TYPE_COLORS[t]}28`,
                borderRadius: 3,
                padding: '0 5px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {EDGE_TYPE_SHORT[t]}
              </span>
            ))}
          </div>
        )}

        {/* Connection summary — aggregate signal count + types */}
        {connectionSummary && (
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '0.63rem',
            color: 'rgba(238,238,248,0.35)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: 5,
            lineHeight: 1.4,
          }}>
            {connectionSummary}
          </div>
        )}
      </div>

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

            {/* Intelligence explanation — why these nodes are connected */}
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
