'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { staticSanityGraph, type GraphNode, type GraphLink, type GraphData, type NodeSubtype, type EdgeType } from '@/data/mockGraph';
import { ConnectionExplanationPanel } from './ConnectionExplanationPanel';

// SSR-safe useLayoutEffect — avoids React warnings during server render
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Disable SSR — ForceGraph2D uses canvas and window APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(
  () => import('react-force-graph').then(mod => ({ default: mod.ForceGraph2D })),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Visual meaning system — node and edge styling by semantic type
// ─────────────────────────────────────────────────────────────────────────────

/** Colour per node base type (fallback when subtype is absent) */
const NODE_COLORS: Record<GraphNode['type'], string> = {
  entity: '#3b82f6', // blue
  event:  '#f59e0b', // amber
  signal: '#10b981', // emerald
};

/** Colour per entity subtype — overrides NODE_COLORS for entity nodes */
const NODE_SUBTYPE_COLORS: Record<NodeSubtype, string> = {
  company:   '#3b82f6', // blue      — AI companies / labs
  investor:  '#a855f7', // purple    — VCs / funds
  model:     '#06b6d4', // cyan      — AI model entities
  regulator: '#f97316', // orange    — government / policy bodies
};

/** Human-readable label per node type / subtype */
const NODE_TYPE_LABELS: Record<GraphNode['type'], string> = {
  entity: 'Entity',
  event:  'Event',
  signal: 'Signal',
};

const NODE_SUBTYPE_LABELS: Record<NodeSubtype, string> = {
  company:   'Company',
  investor:  'Investor',
  model:     'Model',
  regulator: 'Regulator',
};

/** Returns the display colour for a node, respecting subtype overrides */
function nodeColor(node: GraphNode): string {
  if (node.type === 'entity' && node.subtype) {
    return NODE_SUBTYPE_COLORS[node.subtype] ?? NODE_COLORS.entity;
  }
  return NODE_COLORS[node.type] ?? '#6366f1';
}

// ── Edge type styling ─────────────────────────────────────────────────────────

interface EdgeStyle {
  color: string;
  /** Canvas lineDash pattern — undefined means solid */
  dash?: number[];
  /** Display label for the legend */
  label: string;
}

const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  'funding':       { color: '#4ade80', dash: undefined,  label: 'Funding' },
  'competition':   { color: '#f87171', dash: [5, 3],     label: 'Competition' },
  'partnership':   { color: '#60a5fa', dash: undefined,  label: 'Partnership' },
  'model-release': { color: '#c084fc', dash: undefined,  label: 'Model Release' },
  'regulation':    { color: '#fb923c', dash: [7, 4],     label: 'Regulation' },
};

/** Returns the resolved edge style or undefined if edgeType is absent */
function getEdgeStyle(link: GraphLink): EdgeStyle | undefined {
  return link.edgeType ? EDGE_STYLES[link.edgeType] : undefined;
}

// ── Node shape helpers (canvas) ───────────────────────────────────────────────

/** Diamond shape for event nodes */
function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

/** Upward triangle for signal nodes */
function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.866, y + r * 0.5);
  ctx.lineTo(x - r * 0.866, y + r * 0.5);
  ctx.closePath();
}

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
    const res = await fetch('/api/graph/relationships', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new Error('Invalid JSON response');
    }

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

    // No usable graph data — render the static sanity graph so the canvas
    // proves the renderer works even when live data and mocks are absent.
    // Source 'static-sanity' triggers the "Example ecosystem map" label.
    return { data: staticSanityGraph, isDemo: true, source: 'static-sanity' };
  } catch {
    // Network / parse error — same static fallback so the page is never blank
    return { data: staticSanityGraph, isDemo: true, source: 'static-sanity' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Link helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Base link opacity scaled by relationship strength (0–100). */
function baseLinkAlpha(link: RuntimeLink): number {
  if (link.tier === 'strong')   return 0.55;
  if (link.tier === 'moderate') return 0.35;
  if (link.strength != null)    return Math.max(0.08, link.strength / 100 * 0.5);
  // Semantic edge types get a slightly higher base opacity for readability
  if (link.edgeType)            return 0.3;
  return 0.12; // structural connection (entity→event, event→signal)
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

const VALID_NODE_TYPES = new Set(['entity', 'event', 'signal']);

/**
 * Strict validation: returns true only when nodes and links form a valid,
 * render-safe graph. Logs a descriptive warning when validation fails.
 */
function validateGraphData(nodes: GraphNode[], links: GraphLink[]): boolean {
  if (!Array.isArray(nodes) || !Array.isArray(links)) {
    console.warn('[IntelligenceGraph] validateGraphData: nodes/links are not arrays');
    return false;
  }

  const nodeIds = new Set<string>();
  for (const n of nodes) {
    if (typeof n?.id !== 'string' || n.id.length === 0) {
      console.warn('[IntelligenceGraph] validateGraphData: node missing valid id', n);
      return false;
    }
    if (typeof n.label !== 'string') {
      console.warn('[IntelligenceGraph] validateGraphData: node missing label', n.id);
      return false;
    }
    if (!VALID_NODE_TYPES.has(n.type)) {
      console.warn('[IntelligenceGraph] validateGraphData: node has invalid type', n.id, n.type);
      return false;
    }
    nodeIds.add(n.id);
  }

  for (const l of links) {
    const src = typeof l.source === 'string' ? l.source : (l.source as RuntimeNode)?.id;
    const tgt = typeof l.target === 'string' ? l.target : (l.target as RuntimeNode)?.id;
    if (!src || !tgt) {
      console.warn('[IntelligenceGraph] validateGraphData: link missing source/target', l);
      return false;
    }
    if (!nodeIds.has(src)) {
      console.warn('[IntelligenceGraph] validateGraphData: link source not in nodes', src);
      return false;
    }
    if (!nodeIds.has(tgt)) {
      console.warn('[IntelligenceGraph] validateGraphData: link target not in nodes', tgt);
      return false;
    }
  }

  return true;
}

/**
 * Deep-copies and validates graph data so ForceGraph2D always receives:
 *   - fresh objects (prevents D3 mutation of shared singletons)
 *   - deduplicated nodes with required fields
 *   - links with string IDs pointing to known nodes (no self-loops)
 *
 * Also handles already-mutated D3 links (where source/target are node objects
 * instead of strings) so re-sanitising is always safe.
 *
 * Returns a safe empty graph if the input is invalid or empty.
 */
function sanitizeGraphData(raw: unknown): GraphData {
  const empty: GraphData = { nodes: [], links: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.links)) return empty;

  const seen = new Set<string>();
  const nodes: GraphNode[] = [];

  for (const n of d.nodes as unknown[]) {
    if (n == null || typeof n !== 'object') continue;
    const gn = n as Record<string, unknown>;
    const id = typeof gn.id === 'string' ? gn.id.trim() : '';
    const label = typeof gn.label === 'string' ? gn.label : '';
    const type = typeof gn.type === 'string' ? gn.type : '';

    if (
      id.length > 0 &&
      label.length > 0 &&
      VALID_NODE_TYPES.has(type) &&
      !seen.has(id)
    ) {
      seen.add(id);
      // Shallow copy strips D3-added x/y/vx/vy so force sim starts fresh
      nodes.push({
        id,
        type: type as GraphNode['type'],
        label,
        ...((gn as unknown as GraphNode).subtype ? { subtype: (gn as unknown as GraphNode).subtype } : {}),
      });
    }
  }

  if (nodes.length === 0) {
    console.warn('[IntelligenceGraph] sanitizeGraphData: no valid nodes found');
    return empty;
  }

  const links: GraphLink[] = [];
  const linkKeys = new Set<string>();

  for (const l of d.links as unknown[]) {
    if (l == null || typeof l !== 'object') continue;
    const link = l as GraphLink;
    // D3 mutates source/target from strings to node objects — handle both
    const rawSrc = link.source;
    const rawTgt = link.target;
    const src = typeof rawSrc === 'string' ? rawSrc
      : (rawSrc != null && typeof rawSrc === 'object' && typeof (rawSrc as RuntimeNode).id === 'string')
        ? (rawSrc as RuntimeNode).id
        : '';
    const tgt = typeof rawTgt === 'string' ? rawTgt
      : (rawTgt != null && typeof rawTgt === 'object' && typeof (rawTgt as RuntimeNode).id === 'string')
        ? (rawTgt as RuntimeNode).id
        : '';

    if (
      src.length > 0 &&
      tgt.length > 0 &&
      src !== tgt &&       // reject self-loops
      seen.has(src) &&
      seen.has(tgt)
    ) {
      // Deduplicate links (A→B and B→A count as same edge)
      const key = src < tgt ? `${src}::${tgt}` : `${tgt}::${src}`;
      if (linkKeys.has(key)) continue;
      linkKeys.add(key);

      links.push({
        source: src,
        target: tgt,
        ...(link.strength      != null ? { strength: Number(link.strength) || 0 } : {}),
        ...(link.tier                  ? { tier: link.tier }                       : {}),
        ...(link.sharedSignals != null ? { sharedSignals: link.sharedSignals }     : {}),
        ...(link.lastInteraction       ? { lastInteraction: link.lastInteraction } : {}),
        ...(link.edgeType              ? { edgeType: link.edgeType }               : {}),
      });
    }
  }

  // Final validation — log but still return what we have
  if (!validateGraphData(nodes, links)) {
    console.warn('[IntelligenceGraph] sanitizeGraphData: post-sanitization validation failed, returning empty graph');
    return empty;
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
  const [graphData, setGraphData] = useState<GraphData>(() => sanitizeGraphData(staticSanityGraph));
  const [isDemo, setIsDemo] = useState(true);
  const [dataSource, setDataSource] = useState<string>('static-sanity');
  const [isLoading, setIsLoading] = useState(true);

  // Focus mode state — pre-seed focusedNodeId when initialFocusId is provided
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(initialFocusId ?? null);
  const [focusedNode, setFocusedNode] = useState<RuntimeNode | null>(null);

  // Track container dimensions — ForceGraph2D needs explicit width/height to
  // avoid crashes when the container hasn't laid out yet at mount time.
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setDimensions(prev =>
        prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch live relationship graph on mount; fall back to mock data if unavailable
  useEffect(() => {
    fetchGraphData()
      .then(({ data, isDemo: demo, source }) => {
        const sanitized = sanitizeGraphData(data);
        console.debug('[IntelligenceGraph] data loaded', {
          source,
          isDemo: demo,
          nodes: sanitized.nodes.length,
          links: sanitized.links.length,
          sampleNode: sanitized.nodes[0] ?? null,
          sampleLink: sanitized.links[0] ?? null,
        });
        setGraphData(sanitized);
        setIsDemo(demo);
        setDataSource(source);
      })
      .catch((err) => {
        console.warn('[IntelligenceGraph] fetch failed, using static fallback', err);
        setGraphData(sanitizeGraphData(staticSanityGraph));
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
   *
   * IMPORTANT: Always deep-copy nodes and links so D3's force simulation
   * can freely mutate source/target without corrupting the canonical graphData.
   * Without this, switching focus modes causes crashes because D3 replaces
   * string IDs with node object references in-place.
   */
  const displayGraphData = useMemo<GraphData>(() => {
    if (!focusedNodeId) {
      // Deep-copy even in unfocused mode — D3 mutates source/target from
      // strings to node objects, which breaks subsequent sanitizeGraphData calls.
      return sanitizeGraphData(graphData);
    }

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

    // Deep-copy through sanitize to strip D3 mutations (x/y/vx/vy on nodes,
    // object refs on link source/target) so force sim starts fresh.
    return sanitizeGraphData({ nodes: focusedNodes, links: focusedLinks });
  }, [focusedNodeId, graphData]);

  const resetFocus = useCallback(() => {
    setFocusedNodeId(null);
    setFocusedNode(null);
  }, []);

  // Escape key exits focus mode — defined after resetFocus to avoid temporal dead zone
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedNodeId) resetFocus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedNodeId, resetFocus]);

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
   * Top connections for the hovered node — used for tooltip relationship explanation.
   * Returns up to 3 connected nodes with their link metadata, sorted strongest-first.
   */
  const hoveredNodeConnections = useMemo<Array<{ node: GraphNode; link: RuntimeLink }>>(() => {
    if (!hoveredId) return [];
    const connections: Array<{ node: GraphNode; link: RuntimeLink }> = [];
    for (const link of displayGraphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (src === hoveredId || tgt === hoveredId) {
        const otherId = src === hoveredId ? tgt : src;
        const otherNode = displayGraphData.nodes.find(n => n.id === otherId);
        if (otherNode) {
          connections.push({ node: otherNode, link: link as RuntimeLink });
        }
      }
    }
    connections.sort((a, b) => (b.link.strength ?? 0) - (a.link.strength ?? 0));
    return connections.slice(0, 3);
  }, [hoveredId, displayGraphData]);

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

    const EDGE_TYPE_LABELS: Partial<Record<EdgeType, string>> = {
      'funding':       'funding',
      'competition':   'competitive dynamics',
      'partnership':   'a partnership',
      'model-release': 'model release activity',
      'regulation':    'regulatory overlap',
    };
    const EDGE_TYPE_COLORS_MAP: Partial<Record<EdgeType, string>> = {
      'funding':       '#4ade80',
      'competition':   '#f87171',
      'partnership':   '#60a5fa',
      'model-release': '#c084fc',
      'regulation':    '#fb923c',
    };

    const edgeLabel = strongest.edgeType ? EDGE_TYPE_LABELS[strongest.edgeType] : null;
    const edgeColor = strongest.edgeType ? EDGE_TYPE_COLORS_MAP[strongest.edgeType] : null;

    const signalPart = signals != null
      ? `through ${signals} shared signal${signals !== 1 ? 's' : ''}`
      : edgeLabel
        ? `via ${edgeLabel}`
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
        {strongest.edgeType && edgeColor && !signalPart?.startsWith('via') && (
          <span style={{ color: edgeColor, marginLeft: 5, opacity: 0.75 }}>
            · {strongest.edgeType.replace('-', ' ')}
          </span>
        )}
        {'.'}
      </div>
    );
  }, [focusedNodeId, topConnections, graphData.nodes]);

  /** Custom canvas renderer — draws glowing nodes with labels and semantic shapes */
  const paintNode = useCallback(
    (node: RuntimeNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!node || !ctx || typeof node.id !== 'string') return;
      try {
      const color      = nodeColor(node);
      const isHovered  = node.id === hoveredId;
      const isNeighbor = neighbors.has(node.id);
      const isFocused  = node.id === focusedNodeId;
      const isDimmed   = !!hoveredId && !isHovered && !isNeighbor;
      const r          = isFocused ? 10 : isHovered ? 9 : 6;

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.15 : 1;

      // Glow — intensity reflects importance
      ctx.shadowBlur  = isFocused ? 40 : isHovered ? 32 : 16;
      ctx.shadowColor = color;

      // ── Shape by node type ──────────────────────────────────────────────
      // entity  → circle  (stable, central actors)
      // event   → diamond (moment in time, sharp angles)
      // signal  → triangle (directional trend / insight)

      ctx.fillStyle = color;

      if (node.type === 'event') {
        drawDiamond(ctx, x, y, r);
      } else if (node.type === 'signal') {
        drawTriangle(ctx, x, y, r);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
      }

      ctx.fill();

      // Border ring — focused gets bright white, hovered gets semi-bright
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isFocused
        ? 'rgba(255,255,255,1)'
        : isHovered
          ? 'rgba(255,255,255,0.85)'
          : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = isFocused ? 2 : isHovered ? 1.5 : 0.75;

      if (node.type === 'event') {
        drawDiamond(ctx, x, y, r);
      } else if (node.type === 'signal') {
        drawTriangle(ctx, x, y, r);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
      }

      ctx.stroke();

      // Label
      const fontSize   = Math.max(10, 11 / globalScale);
      ctx.font         = `500 ${fontSize}px DM Sans, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = isFocused || isHovered ? '#ffffff' : 'rgba(238,238,248,0.78)';
      ctx.fillText(node.label, x, y + r + 3);

      ctx.restore();
      } catch (err) {
        console.warn('[IntelligenceGraph] paintNode error:', err);
      }
    },
    [hoveredId, neighbors, focusedNodeId],
  );

  const getLinkColor = useCallback(
    (link: RuntimeLink) => {
      if (!link) return 'rgba(255,255,255,0.1)';
      try {
        const src = nodeId(link.source as string | RuntimeNode);
        const tgt = nodeId(link.target as string | RuntimeNode);

        if (hoveredId) {
          return src === hoveredId || tgt === hoveredId
            ? 'rgba(255,255,255,0.65)'
            : 'rgba(255,255,255,0.025)';
        }

        const alpha = baseLinkAlpha(link);

        const edgeStyle = getEdgeStyle(link);
        if (edgeStyle) {
          const hex = edgeStyle.color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return `rgba(${r},${g},${b},${alpha})`;
        }

        if (link.tier) return `rgba(147,197,253,${alpha})`;

        return `rgba(255,255,255,${alpha})`;
      } catch {
        return 'rgba(255,255,255,0.1)';
      }
    },
    [hoveredId],
  );

  const getLinkWidth = useCallback(
    (link: RuntimeLink) => {
      if (!link) return 0.6;
      try {
        const src = nodeId(link.source as string | RuntimeNode);
        const tgt = nodeId(link.target as string | RuntimeNode);

        if (hoveredId) {
          return src === hoveredId || tgt === hoveredId ? 2.5 : 0.25;
        }

        if (link.strength != null) return Math.max(0.6, link.strength / 100 * 2.2);
        if (link.tier === 'strong')   return 2.0;
        if (link.tier === 'moderate') return 1.4;
        if (link.edgeType) return 1.2;

        return 0.6;
      } catch {
        return 0.6;
      }
    },
    [hoveredId],
  );

  /** Dashed line patterns per edge type — undefined means solid */
  const getLinkDash = useCallback(
    (link: RuntimeLink): number[] | undefined => {
      try {
        const edgeStyle = getEdgeStyle(link);
        return edgeStyle?.dash ?? undefined;
      } catch {
        return undefined;
      }
    },
    [],
  );

  const handleNodeClick = useCallback((node: RuntimeNode) => {
    if (!node || typeof node.id !== 'string') return;
    if (node.type === 'entity') {
      // Always enter focus mode on entity click — toggle off if already focused
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
    const validNode = node && typeof node.id === 'string' ? node : null;
    setHoveredId(validNode?.id ?? null);
    setHoveredNode(validNode ?? null);
    if (validNode) setHoveredLink(null);
    if (containerRef.current) {
      const isClickable = validNode?.type === 'entity' || validNode?.type === 'signal';
      containerRef.current.style.cursor = isClickable ? 'pointer' : 'default';
    }
  }, []);

  const handleLinkHover = useCallback((link: RuntimeLink | null) => {
    const validLink = link && link.source != null && link.target != null ? link : null;
    setHoveredLink(validLink ?? null);
    if (validLink) {
      setHoveredNode(null);
      setHoveredId(null);
    }
  }, []);

  const demoBannerText =
    dataSource === 'static-sanity'
      ? 'Example ecosystem map — live data unavailable'
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
      {/* Label */}
      <div style={{ fontWeight: 600, color: nodeColor(hoveredNode), marginBottom: 3 }}>
        {hoveredNode.label}
      </div>

      {/* Type badge with shape indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {hoveredNode.type === 'event' ? (
          <svg width={9} height={9} viewBox="0 0 9 9">
            <polygon points="4.5,0 9,4.5 4.5,9 0,4.5" fill={nodeColor(hoveredNode)} />
          </svg>
        ) : hoveredNode.type === 'signal' ? (
          <svg width={9} height={9} viewBox="0 0 9 9">
            <polygon points="4.5,0 9,9 0,9" fill={nodeColor(hoveredNode)} />
          </svg>
        ) : (
          <svg width={9} height={9} viewBox="0 0 9 9">
            <circle cx={4.5} cy={4.5} r={4.5} fill={nodeColor(hoveredNode)} />
          </svg>
        )}
        <span style={{ color: 'rgba(238,238,248,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {hoveredNode.type === 'entity' && hoveredNode.subtype
            ? NODE_SUBTYPE_LABELS[hoveredNode.subtype]
            : NODE_TYPE_LABELS[hoveredNode.type]}
        </span>
      </div>

      {/* Relationship explanation — top connections with edge context */}
      {hoveredNodeConnections.length > 0 && (
        <div style={{
          marginTop: 7,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}>
          {hoveredNodeConnections.slice(0, 2).map(({ node: connNode, link: connLink }, idx) => {
            const es = getEdgeStyle(connLink);
            const sigs = connLink.sharedSignals;
            const connColor = nodeColor(connNode as RuntimeNode);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(238,238,248,0.3)', fontSize: '0.65rem' }}>↔</span>
                  <span style={{ color: connColor, fontSize: '0.71rem', fontWeight: 500 }}>
                    {connNode.label}
                  </span>
                  {es && (
                    <span style={{
                      fontSize: '0.6rem',
                      color: es.color,
                      background: `${es.color}1a`,
                      border: `1px solid ${es.color}35`,
                      borderRadius: 3,
                      padding: '0 4px',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      {es.label}
                    </span>
                  )}
                </div>
                {sigs != null && (
                  <span style={{ color: 'rgba(238,238,248,0.28)', fontSize: '0.63rem', paddingLeft: 13 }}>
                    {sigs} shared signal{sigs !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Click action hint */}
      {hoveredNode.type === 'entity' && (
        <div style={{ marginTop: 6, color: 'rgba(238,238,248,0.38)', fontSize: '0.67rem' }}>
          {focusedNodeId === hoveredNode.id ? 'Click to exit focus' : 'Click to focus →'}
        </div>
      )}
      {hoveredNode.type === 'signal' && (
        <div style={{ marginTop: 6, color: 'rgba(238,238,248,0.38)', fontSize: '0.67rem' }}>
          Click to open signal →
        </div>
      )}
      {hoveredNode.type === 'event' && (
        <div style={{ marginTop: 6, color: 'rgba(238,238,248,0.28)', fontSize: '0.67rem' }}>
          Event · no detail page
        </div>
      )}
    </div>
  );

  const linkTooltip = hoveredLink && (() => {
    const srcLabel   = nodeLabel(hoveredLink.source as string | RuntimeNode);
    const tgtLabel   = nodeLabel(hoveredLink.target as string | RuntimeNode);
    const hasRelData = hoveredLink.tier || hoveredLink.strength != null;
    const edgeStyle  = getEdgeStyle(hoveredLink);

    return (
      <div style={{ ...TOOLTIP_STYLE, left: tooltipX, top: tooltipY }}>
        <div style={{ fontWeight: 600, marginBottom: 5 }}>
          {srcLabel}{' '}
          <span style={{ color: 'rgba(238,238,248,0.35)' }}>→</span>{' '}
          {tgtLabel}
        </div>

        {/* Edge type badge */}
        {edgeStyle && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: `${edgeStyle.color}18`,
            border: `1px solid ${edgeStyle.color}40`,
            borderRadius: 4,
            padding: '2px 7px',
            marginBottom: 6,
          }}>
            <svg width={14} height={3} style={{ flexShrink: 0 }}>
              <line x1={0} y1={1.5} x2={14} y2={1.5}
                stroke={edgeStyle.color}
                strokeWidth={2}
                strokeDasharray={edgeStyle.dash?.join(',') ?? ''}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ color: edgeStyle.color, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {edgeStyle.label}
            </span>
          </div>
        )}

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
        {!hasRelData && !edgeStyle && (
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

      {/* Open entity page or navigate to full graph in embedded mode */}
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
        {initialFocusId ? 'Full graph →' : 'Open page →'}
      </button>

      {/* Reset / Escape hint */}
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
        title="Press Escape to reset"
      >
        Reset  <span style={{ opacity: 0.45, fontSize: '0.65rem' }}>Esc</span>
      </button>
    </div>
  );

  // ── Entity selector panel — quick-pick for focus mode ──────────────────────
  // Shows in full-graph mode (not in embedded mode) listing entity nodes so users
  // can focus on any entity without having to locate it in the canvas first.

  const entityNodes = useMemo(
    () => graphData.nodes.filter(n => n.type === 'entity'),
    [graphData.nodes],
  );

  const entitySelectorPanel = !focusedNodeId && !compact && entityNodes.length > 0 && (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      maxWidth: 180,
    }}>
      <div style={{
        fontSize: '0.62rem',
        color: 'rgba(238,238,248,0.28)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        Focus on
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entityNodes.slice(0, 8).map(node => (
          <button
            key={node.id}
            onClick={() => {
              setFocusedNodeId(node.id);
              setFocusedNode(node as RuntimeNode);
            }}
            style={{
              background: 'rgba(15,15,25,0.75)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 5,
              color: 'rgba(238,238,248,0.65)',
              fontSize: '0.72rem',
              padding: '4px 9px',
              cursor: 'pointer',
              textAlign: 'left',
              letterSpacing: '0.02em',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.14)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.3)';
              (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,15,25,0.75)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(238,238,248,0.65)';
            }}
          >
            {node.label}
          </button>
        ))}
        {entityNodes.length > 8 && (
          <span style={{ fontSize: '0.65rem', color: 'rgba(238,238,248,0.22)', paddingLeft: 4 }}>
            +{entityNodes.length - 8} more — click in graph
          </span>
        )}
      </div>
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

      {/* Entity selector — quick-pick panel in full-graph mode */}
      {entitySelectorPanel}

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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: minH,
          gap: 16,
        }}>
          {/* Pulsing skeleton dots to simulate graph loading */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            {[28, 20, 24, 16, 22].map((size, i) => (
              <div
                key={i}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
          <div style={{
            color: 'rgba(238,238,248,0.35)',
            fontSize: '0.82rem',
            letterSpacing: '0.04em',
          }}>
            Loading ecosystem graph…
          </div>
        </div>
      ) : displayGraphData.nodes.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: minH,
          gap: 12,
          color: 'rgba(238,238,248,0.35)',
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
          }}>
            ○
          </div>
          <div style={{ fontSize: '0.82rem', letterSpacing: '0.04em' }}>
            No ecosystem data available yet
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(238,238,248,0.22)' }}>
            Graph will populate once the ingestion pipeline runs.
          </div>
        </div>
      ) : dimensions.width === 0 || dimensions.height === 0 ? (
        /* Container not yet laid out — skip ForceGraph2D to avoid canvas errors */
        null
      ) : (
        <ForceGraph2D
          graphData={displayGraphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeId="id"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodeLabel={() => ''}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkHover={handleLinkHover}
          linkSource="source"
          linkTarget="target"
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkLineDash={getLinkDash}
          cooldownTicks={120}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      )}
    </div>
    </div>
  );
}
