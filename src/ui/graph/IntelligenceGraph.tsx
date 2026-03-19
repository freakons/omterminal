'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mockGraphData, type GraphNode, type GraphLink, type GraphData } from '@/data/mockGraph';
import { ConnectionExplanationPanel } from './ConnectionExplanationPanel';

// Disable SSR — ForceGraph2D uses canvas and window APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(
  () => import('react-force-graph').then(mod => ({ default: mod.ForceGraph2D })),
  { ssr: false },
);

/** Colour per node type */
const NODE_COLORS: Record<GraphNode['type'], string> = {
  entity: '#3b82f6', // blue
  event:  '#f59e0b', // amber
  signal: '#10b981', // emerald
};

const NODE_TYPE_LABELS: Record<GraphNode['type'], string> = {
  entity: 'Entity',
  event:  'Event',
  signal: 'Signal',
};

/** Node as enriched by force-graph at runtime */
type RuntimeNode = GraphNode & { x?: number; y?: number };
type RuntimeLink = GraphLink & { source: string | RuntimeNode; target: string | RuntimeNode };

function nodeId(n: string | RuntimeNode): string {
  return typeof n === 'object' ? n.id : n;
}

function nodeLabel(n: string | RuntimeNode): string {
  return typeof n === 'object' ? n.label : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching — uses /api/graph/relationships for live relationship data
// ─────────────────────────────────────────────────────────────────────────────

async function fetchGraphData(): Promise<{ data: GraphData; isDemo: boolean; source: string }> {
  try {
    const res = await fetch('/api/graph/relationships', { next: { revalidate: 120 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const source: string = json.source ?? 'unknown';
    const graph: GraphData | undefined = json.graph;

    // Use live graph if it has nodes and came from real DB data
    if (graph && Array.isArray(graph.nodes) && graph.nodes.length > 0 && source === 'db') {
      return { data: graph, isDemo: false, source };
    }

    // Mock data returned by the API (dev mode or empty DB) — show demo banner
    if (graph && Array.isArray(graph.nodes) && graph.nodes.length > 0) {
      return { data: graph, isDemo: true, source };
    }

    // No graph data at all — fall back to static mock so the canvas isn't blank
    return { data: mockGraphData, isDemo: true, source: 'fallback' };
  } catch {
    return { data: mockGraphData, isDemo: true, source: 'fallback' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Link helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Base link opacity scaled by relationship strength (0–100). */
function baseLinkAlpha(link: RuntimeLink): number {
  if (link.tier === 'strong')   return 0.45;
  if (link.tier === 'moderate') return 0.25;
  if (link.strength != null)    return Math.max(0.06, link.strength / 100 * 0.4);
  return 0.1; // generic edge (entity→event, event→signal)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function IntelligenceGraph() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RuntimeNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<RuntimeLink | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [graphData, setGraphData] = useState<GraphData>(mockGraphData);
  const [isDemo, setIsDemo] = useState(true);
  const [dataSource, setDataSource] = useState<string>('fallback');

  // Focus mode state
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<RuntimeNode | null>(null);

  // Fetch live relationship graph on mount; fall back to mock data if unavailable
  useEffect(() => {
    fetchGraphData().then(({ data, isDemo: demo, source }) => {
      setGraphData(data);
      setIsDemo(demo);
      setDataSource(source);
    });
  }, []);

  // Track mouse position for tooltip placement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  // ── Focus mode: compute filtered graph data ────────────────────────────────

  /**
   * When a node is focused, filter the graph to show only:
   *   - the focused node
   *   - all directly connected nodes
   *   - their shared links, sorted strongest-first
   */
  const displayGraphData = useMemo<GraphData>(() => {
    if (!focusedNodeId) return graphData;

    const neighborIds = new Set<string>();
    const focusedLinks: GraphLink[] = [];

    for (const link of graphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (src === focusedNodeId) {
        neighborIds.add(tgt);
        focusedLinks.push(link as GraphLink);
      } else if (tgt === focusedNodeId) {
        neighborIds.add(src);
        focusedLinks.push(link as GraphLink);
      }
    }

    // Sort strongest relationships first
    focusedLinks.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

    const nodeIds = new Set([focusedNodeId, ...neighborIds]);
    const focusedNodes = graphData.nodes.filter(n => nodeIds.has(n.id));

    return { nodes: focusedNodes, links: focusedLinks };
  }, [focusedNodeId, graphData]);

  const resetFocus = useCallback(() => {
    setFocusedNodeId(null);
    setFocusedNode(null);
  }, []);

  /** Set of node IDs connected to the hovered node */
  const neighbors = useMemo<Set<string>>(() => {
    if (!hoveredId) return new Set();
    const s = new Set<string>();
    for (const link of displayGraphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (src === hoveredId) s.add(tgt);
      if (tgt === hoveredId) s.add(src);
    }
    return s;
  }, [hoveredId, displayGraphData.links]);

  /**
   * Top 2–3 entity↔entity links for the explanation panel.
   * displayGraphData.links is already sorted strongest-first; we keep only
   * links that carry relationship metadata (tier / strength).
   */
  const topConnections = useMemo<GraphLink[]>(() => {
    if (!focusedNodeId) return [];
    return displayGraphData.links
      .filter((l) => l.tier != null || l.strength != null)
      .slice(0, 3);
  }, [focusedNodeId, displayGraphData.links]);

  /** Custom canvas renderer — draws glowing nodes with labels */
  const paintNode = useCallback(
    (node: RuntimeNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const color      = NODE_COLORS[node.type] ?? '#6366f1';
      const isHovered  = node.id === hoveredId;
      const isNeighbor = neighbors.has(node.id);
      const isFocused  = node.id === focusedNodeId;
      const isDimmed   = !!hoveredId && !isHovered && !isNeighbor;
      const r          = isFocused ? 10 : isHovered ? 9 : 6;

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.18 : 1;

      // Glow
      ctx.shadowBlur  = isFocused ? 36 : isHovered ? 28 : 14;
      ctx.shadowColor = color;

      // Circle fill
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Border ring — focused node gets a bright white ring
      ctx.strokeStyle = isFocused
        ? 'rgba(255,255,255,1)'
        : isHovered
          ? 'rgba(255,255,255,0.9)'
          : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isFocused ? 2 : isHovered ? 1.5 : 0.75;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Label
      const fontSize       = Math.max(10, 11 / globalScale);
      ctx.font             = `500 ${fontSize}px DM Sans, sans-serif`;
      ctx.textAlign        = 'center';
      ctx.textBaseline     = 'top';
      ctx.fillStyle        = isFocused || isHovered ? '#ffffff' : 'rgba(238,238,248,0.78)';
      ctx.fillText(node.label, node.x ?? 0, (node.y ?? 0) + r + 3);

      ctx.restore();
    },
    [hoveredId, neighbors, focusedNodeId],
  );

  const getLinkColor = useCallback(
    (link: RuntimeLink) => {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (hoveredId) {
        return src === hoveredId || tgt === hoveredId
          ? 'rgba(255,255,255,0.6)'
          : 'rgba(255,255,255,0.03)';
      }
      const alpha = baseLinkAlpha(link);
      // Tint strong entity↔entity edges with a subtle blue hue
      if (link.tier) return `rgba(147,197,253,${alpha})`;
      return `rgba(255,255,255,${alpha})`;
    },
    [hoveredId],
  );

  const getLinkWidth = useCallback(
    (link: RuntimeLink) => {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (hoveredId) {
        return src === hoveredId || tgt === hoveredId ? 2.5 : 0.3;
      }
      if (link.tier === 'strong')   return 1.8;
      if (link.tier === 'moderate') return 1.2;
      if (link.strength != null)    return Math.max(0.4, link.strength / 100 * 1.5);
      return 0.6;
    },
    [hoveredId],
  );

  const handleNodeClick = useCallback((node: RuntimeNode) => {
    if (node.type === 'entity') {
      // Toggle focus: clicking the already-focused node exits focus mode
      if (focusedNodeId === node.id) {
        resetFocus();
      } else {
        setFocusedNodeId(node.id);
        setFocusedNode(node);
      }
    } else if (node.type === 'signal') {
      router.push(`/signals/${node.id}`);
    }
    // event nodes: graceful no-op
  }, [router, focusedNodeId, resetFocus]);

  const handleNodeHover = useCallback((node: RuntimeNode | null) => {
    setHoveredId(node?.id ?? null);
    setHoveredNode(node ?? null);
    // Clear link tooltip when hovering a node
    if (node) setHoveredLink(null);
    if (containerRef.current) {
      const isClickable = node?.type === 'entity' || node?.type === 'signal';
      containerRef.current.style.cursor = isClickable ? 'pointer' : node ? 'default' : 'default';
    }
  }, []);

  const handleLinkHover = useCallback((link: RuntimeLink | null) => {
    setHoveredLink(link ?? null);
    // Clear node tooltip when hovering a link
    if (link) {
      setHoveredNode(null);
      setHoveredId(null);
    }
  }, []);

  const demoBannerText =
    dataSource === 'fallback'
      ? 'Graph unavailable — showing static demo'
      : 'Demo data — live graph populates once the ingestion pipeline runs';

  // ── Tooltip render helpers ────────────────────────────────────────────────

  const TOOLTIP_STYLE: React.CSSProperties = {
    position: 'absolute',
    zIndex: 20,
    background: 'rgba(15,15,25,0.92)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: '0.76rem',
    color: 'rgba(238,238,248,0.85)',
    backdropFilter: 'blur(12px)',
    pointerEvents: 'none',
    maxWidth: 240,
    lineHeight: 1.55,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  };

  // Offset tooltip from cursor to avoid flickering
  const tooltipX = mousePos.x + 14;
  const tooltipY = mousePos.y - 10;

  const nodeTooltip = hoveredNode && (
    <div style={{ ...TOOLTIP_STYLE, left: tooltipX, top: tooltipY }}>
      <div style={{ fontWeight: 600, color: NODE_COLORS[hoveredNode.type] ?? '#fff', marginBottom: 3 }}>
        {hoveredNode.label}
      </div>
      <div style={{ color: 'rgba(238,238,248,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {NODE_TYPE_LABELS[hoveredNode.type]}
      </div>
      {hoveredNode.type === 'entity' && (
        <div style={{ marginTop: 6, color: 'rgba(238,238,248,0.4)', fontSize: '0.68rem' }}>
          {focusedNodeId === hoveredNode.id ? 'Click to exit focus' : 'Click to focus ecosystem →'}
        </div>
      )}
      {hoveredNode.type === 'signal' && (
        <div style={{ marginTop: 6, color: 'rgba(238,238,248,0.4)', fontSize: '0.68rem' }}>
          Click to open →
        </div>
      )}
    </div>
  );

  const linkTooltip = hoveredLink && (() => {
    const srcLabel = nodeLabel(hoveredLink.source as string | RuntimeNode);
    const tgtLabel = nodeLabel(hoveredLink.target as string | RuntimeNode);
    const hasRelData = hoveredLink.tier || hoveredLink.strength != null;

    return (
      <div style={{ ...TOOLTIP_STYLE, left: tooltipX, top: tooltipY }}>
        <div style={{ fontWeight: 600, marginBottom: 5 }}>
          {srcLabel}{' '}
          <span style={{ color: 'rgba(238,238,248,0.35)' }}>→</span>{' '}
          {tgtLabel}
        </div>
        {hasRelData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {hoveredLink.tier && (
              <div>
                <span style={{ color: 'rgba(238,238,248,0.45)' }}>Tier: </span>
                <span style={{
                  color: hoveredLink.tier === 'strong' ? '#93c5fd'
                       : hoveredLink.tier === 'moderate' ? '#fcd34d'
                       : 'rgba(238,238,248,0.65)',
                }}>
                  {tierLabel(hoveredLink.tier)}
                </span>
              </div>
            )}
            {hoveredLink.strength != null && (
              <div>
                <span style={{ color: 'rgba(238,238,248,0.45)' }}>Strength: </span>
                {Math.round(hoveredLink.strength)}/100
              </div>
            )}
            {hoveredLink.sharedSignals != null && (
              <div style={{ marginTop: 4, color: 'rgba(238,238,248,0.6)', fontStyle: 'italic' }}>
                Connected through {hoveredLink.sharedSignals} shared signal{hoveredLink.sharedSignals !== 1 ? 's' : ''}
              </div>
            )}
            {hoveredLink.lastInteraction && (
              <div>
                <span style={{ color: 'rgba(238,238,248,0.45)' }}>Last activity: </span>
                {formatDate(hoveredLink.lastInteraction)}
              </div>
            )}
          </div>
        )}
        {!hasRelData && (
          <div style={{ color: 'rgba(238,238,248,0.4)', fontSize: '0.7rem' }}>
            Structural connection
          </div>
        )}
      </div>
    );
  })();

  // ── Focus mode indicator ──────────────────────────────────────────────────

  const focusIndicator = focusedNode && (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(15,15,30,0.88)',
      border: '1px solid rgba(59,130,246,0.35)',
      borderRadius: 8,
      padding: '7px 14px',
      fontSize: '0.78rem',
      color: 'rgba(238,238,248,0.85)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      {/* Pulsing dot */}
      <span style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#3b82f6',
        boxShadow: '0 0 8px #3b82f6',
        flexShrink: 0,
      }} />

      <span>
        <span style={{ color: 'rgba(238,238,248,0.45)', marginRight: 4 }}>Focused on</span>
        <span style={{ fontWeight: 600, color: '#93c5fd' }}>{focusedNode.label}</span>
        <span style={{ color: 'rgba(238,238,248,0.35)', marginLeft: 6 }}>
          · {displayGraphData.nodes.length - 1} connection{displayGraphData.nodes.length !== 2 ? 's' : ''}
        </span>
      </span>

      {/* Open entity link */}
      <button
        onClick={() => router.push(`/entity/${focusedNode.id}`)}
        style={{
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 5,
          color: '#93c5fd',
          fontSize: '0.72rem',
          padding: '2px 9px',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
      >
        Open →
      </button>

      {/* Reset button */}
      <button
        onClick={resetFocus}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 5,
          color: 'rgba(238,238,248,0.55)',
          fontSize: '0.72rem',
          padding: '2px 9px',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
      >
        Reset view
      </button>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 600, position: 'relative' }}>
      {isDemo && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'rgba(30,30,40,0.82)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '5px 14px',
          fontSize: '0.72rem',
          color: 'rgba(238,238,248,0.55)',
          letterSpacing: '0.03em',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {demoBannerText}
        </div>
      )}
      {!isDemo && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: '0.68rem',
          color: 'rgba(110,231,183,0.85)',
          letterSpacing: '0.04em',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          live
        </div>
      )}

      {/* Node tooltip */}
      {nodeTooltip}

      {/* Link tooltip */}
      {linkTooltip}

      {/* Focus mode indicator */}
      {focusIndicator}

      {/* Connection explanation panel — visible only in focus mode */}
      <ConnectionExplanationPanel
        focusedNode={focusedNode}
        topLinks={topConnections}
        nodes={graphData.nodes}
      />

    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 600 }}
      onMouseMove={handleMouseMove}
    >
      <ForceGraph2D
        graphData={displayGraphData}
        backgroundColor="transparent"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodeLabel={() => ''}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
    </div>
  );
}
