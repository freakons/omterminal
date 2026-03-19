'use client';

import { type GraphNode, type GraphLink } from '@/data/mockGraph';

type RuntimeNode = GraphNode & { x?: number; y?: number };

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
        width: 216,
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
        const srcLabel = resolveLabel(link.source as string | RuntimeNode, nodes);
        const tgtLabel = resolveLabel(link.target as string | RuntimeNode, nodes);

        return (
          <div
            key={i}
            style={{
              background: 'rgba(15,15,30,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `2px solid ${link.tier ? tierColor(link.tier) : 'rgba(255,255,255,0.15)'}`,
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

            {/* Strength + tier badge */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
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
            </div>

            {/* Shared signals explanation */}
            {link.sharedSignals != null && (
              <div
                style={{
                  color: 'rgba(238,238,248,0.52)',
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                }}
              >
                Connected through {link.sharedSignals} shared signal
                {link.sharedSignals !== 1 ? 's' : ''}
              </div>
            )}

            {/* Last interaction */}
            {link.lastInteraction && (
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
