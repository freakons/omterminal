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

/** Returns a human-readable relative timeframe for an ISO timestamp. */
function relativeTimeframe(iso: string): string | null {
  try {
    const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
    if (days < 7)  return 'the last week';
    if (days < 31) return 'the last month';
    if (days < 91) return 'the last 3 months';
    return null;
  } catch {
    return null;
  }
}

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
// Data sanitization — prevents D3/ForceGraph crashes from bad data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep-copies and validates graph data so ForceGraph2D always receives:
 *   - fresh objects (prevents D3 mutation of shared singletons)
 *   - deduplicated nodes with required fields
 *   - links with string IDs pointing to known nodes (no self-loops)
 *
 * Also handles already-mutated D3 links (where source/target are node objects
 * instead of strings) so re-sanitising is always safe.
 */
function sanitizeGraphData(raw: unknown): GraphData {
  const empty: GraphData = { nodes: [], links: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.links)) return empty;

  const seen = new Set<string>();
  const nodes: GraphNode[] = [];

  for (const n of d.nodes as unknown[]) {
    if (
      n != null &&
      typeof n === 'object' &&
      typeof (n as GraphNode).id === 'string' &&
      (n as GraphNode).id.length > 0 &&
      typeof (n as GraphNode).label === 'string' &&
      (['entity', 'event', 'signal'] as string[]).includes((n as GraphNode).type) &&
      !seen.has((n as GraphNode).id)
    ) {
      seen.add((n as GraphNode).id);
      // Shallow copy strips D3-added x/y/vx/vy so force sim starts fresh
      nodes.push({
        id: (n as GraphNode).id,
        type: (n as GraphNode).type,
        label: (n as GraphNode).label,
      });
    }
  }

  const links: GraphLink[] = [];

  for (const l of d.links as unknown[]) {
    if (l == null || typeof l !== 'object') continue;
    const link = l as GraphLink;
    // D3 mutates source/target from strings to node objects — handle both
    const rawSrc = link.source as string | RuntimeNode;
    const rawTgt = link.target as string | RuntimeNode;
    const src = typeof rawSrc === 'string' ? rawSrc : rawSrc?.id;
    const tgt = typeof rawTgt === 'string' ? rawTgt : rawTgt?.id;
    if (
      typeof src === 'string' && src.length > 0 &&
      typeof tgt === 'string' && tgt.length > 0 &&
      src !== tgt &&       // reject self-loops
      seen.has(src) &&
      seen.has(tgt)
    ) {
      links.push({
        source: src,
        target: tgt,
        ...(link.strength   != null ? { strength: link.strength }           : {}),
        ...(link.tier                ? { tier: link.tier }                   : {}),
        ...(link.sharedSignals != null ? { sharedSignals: link.sharedSignals } : {}),
        ...(link.lastInteraction     ? { lastInteraction: link.lastInteraction } : {}),
      });
    }
  }

  return { nodes, links };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface IntelligenceGraphProps {
  /** Pre-focus the graph on this entity node ID (matches entity.id) on load. */
  initialFocusId?: string;
  /** Compact mode reduces canvas height for embedding inside other pages. */
  compact?: boolean;
}

export function IntelligenceGraph({ initialFocusId, compact }: IntelligenceGraphProps = {}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RuntimeNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<RuntimeLink | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [graphData, setGraphData] = useState<GraphData>(() => sanitizeGraphData(mockGraphData));
  const [isDemo, setIsDemo] = useState(true);
  const [dataSource, setDataSource] = useState<string>('fallback');
  const [isLoading, setIsLoading] = useState(true);

  // Focus mode state — pre-seed focusedNodeId when initialFocusId is provided
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(initialFocusId ?? null);
  const [focusedNode, setFocusedNode] = useState<RuntimeNode | null>(null);

  // Fetch live relationship graph on mount; fall back to mock data if unavailable
  useEffect(() => {
    fetchGraphData()
      .then(({ data, isDemo: demo, source }) => {
        setGraphData(sanitizeGraphData(data));
        setIsDemo(demo);
        setDataSource(source);
      })
      .catch(() => {
        setGraphData(sanitizeGraphData(mockGraphData));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Once graph data loads, resolve the initialFocusId to a full RuntimeNode
  useEffect(() => {
    if (initialFocusId && !focusedNode && graphData.nodes.length > 0) {
      const node = graphData.nodes.find(n => n.id === initialFocusId) as RuntimeNode | undefined;
      if (node) setFocusedNode(node);
    }
  }, [initialFocusId, graphData.nodes, focusedNode]);

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

  /**
   * One-line insight summarising the strongest relationship.
   * Rendered above the graph canvas; hidden when no connections are available.
   */
  const insightHighlight = useMemo(() => {
    if (!focusedNodeId || topConnections.length === 0) return null;

    const strongest = topConnections[0];
    const srcId = nodeId(strongest.source as string | RuntimeNode);
    const tgtId = nodeId(strongest.target as string | RuntimeNode);
    const otherNodeId = srcId === focusedNodeId ? tgtId : srcId;

    const focusedLabel = graphData.nodes.find(n => n.id === focusedNodeId)?.label ?? focusedNodeId;
    const otherLabel   = graphData.nodes.find(n => n.id === otherNodeId)?.label   ?? otherNodeId;

    const signals   = strongest.sharedSignals;
    const timeframe = strongest.lastInteraction ? relativeTimeframe(strongest.lastInteraction) : null;

    const signalPart = signals != null
      ? `through ${signals} shared signal${signals !== 1 ? 's' : ''}`
      : null;
    const timePart = timeframe ? `in ${timeframe}` : null;
    const suffix   = [signalPart, timePart].filter(Boolean).join(' ');

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 8,
          padding: '9px 20px',
          fontSize: '0.78rem',
          color: 'rgba(238,238,248,0.48)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '0.01em',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(10,10,20,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <span style={{ color: 'rgba(238,238,248,0.78)', fontWeight: 500 }}>{focusedLabel}</span>
        {' is most strongly connected to '}
        <span style={{ color: 'rgba(238,238,248,0.78)', fontWeight: 500 }}>{otherLabel}</span>
        {suffix ? ` ${suffix}` : ''}
        {'.'}
      </div>
    );
  }, [focusedNodeId, topConnections, graphData.nodes]);

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

      {/* In embedded mode navigate to full graph; otherwise open the entity page */}
      <button
        onClick={() => router.push(initialFocusId ? '/graph' : `/entity/${focusedNode.id}`)}
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
        {initialFocusId ? 'Full graph →' : 'Open →'}
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

  const minH = compact ? 350 : 600;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: minH, position: 'relative' }}>
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

      {/* Insight highlight — strongest relationship in plain language */}
      {insightHighlight}

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
      style={{ width: '100%', height: '100%', minHeight: minH }}
      onMouseMove={handleMouseMove}
    >
      {isLoading && displayGraphData.nodes.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: minH,
          color: 'rgba(238,238,248,0.35)',
          fontSize: '0.82rem',
          letterSpacing: '0.04em',
        }}>
          Loading graph…
        </div>
      ) : displayGraphData.nodes.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: minH,
          color: 'rgba(238,238,248,0.35)',
          fontSize: '0.82rem',
          letterSpacing: '0.04em',
        }}>
          No graph data available.
        </div>
      ) : (
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
      )}
    </div>
    </div>
  );
}
