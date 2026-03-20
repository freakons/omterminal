'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { staticSanityGraph, type GraphNode, type GraphLink, type GraphData, type NodeSubtype, type EdgeType } from '@/data/mockGraph';
import { ConnectionExplanationPanel } from './ConnectionExplanationPanel';
import { slugify } from '@/utils/sanitize';

// SSR-safe useLayoutEffect — avoids React warnings during server render
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Disable SSR — ForceGraph2D uses canvas and window APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(
  () => import('react-force-graph-2d'),
  { ssr: false },
);

// ─────────────────────────────────────────────────────────────────────────────
// Visual meaning system — node and edge styling by semantic type
// ─────────────────────────────────────────────────────────────────────────────

/** Colour per node base type (fallback when subtype is absent) */
const NODE_COLORS: Record<GraphNode['type'], string> = {
  entity: '#60a5fa', // softer blue
  event:  '#fbbf24', // softer amber
  signal: '#22d3ee', // cyan
};

/** Colour per entity subtype — overrides NODE_COLORS for entity nodes */
const NODE_SUBTYPE_COLORS: Record<NodeSubtype, string> = {
  company:   '#60a5fa', // soft blue    — AI companies / labs
  investor:  '#a78bfa', // soft violet  — VCs / funds
  model:     '#34d399', // teal-green   — AI model entities
  regulator: '#fb923c', // orange       — government / policy bodies
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
  'model-release': { color: '#a78bfa', dash: undefined,  label: 'Model Release' },
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

/**
 * Returns the base node radius, scaled by importance.
 * Entity radius grows with signal count so high-activity entities
 * are visually dominant without hard-coding any specific node.
 */
function nodeRadius(node: GraphNode): number {
  const base = node.type === 'entity' ? 6 : node.type === 'event' ? 4.5 : 3.5;
  if (node.importance != null && node.importance > 0) {
    return base + Math.min(7, Math.log(node.importance + 1) * 1.8);
  }
  return base;
}

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
      const gnode = gn as unknown as GraphNode;
      nodes.push({
        id,
        type: type as GraphNode['type'],
        label,
        ...(gnode.subtype    ? { subtype:    gnode.subtype }    : {}),
        ...(gnode.slug       ? { slug:       gnode.slug }       : {}),
        ...(gnode.importance != null ? { importance: gnode.importance } : {}),
        ...(gnode.momentum   != null ? { momentum:   gnode.momentum }   : {}),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
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

  // Tune D3 forces for a more stable, deliberate layout
  const tuneForces = useCallback(() => {
    const g = graphRef.current;
    if (!g) return;
    try {
      const charge = g.d3Force('charge');
      if (charge) {
        charge.strength(-180);
        charge.distanceMax(220);
      }
      const link = g.d3Force('link');
      if (link) {
        link.distance(65);
        link.strength(0.4);
      }
      g.d3ReheatSimulation();
    } catch { /* ignore — force access is best-effort */ }
  }, []);

  // Retune whenever graph data changes (new data or focus mode swap)
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      // Small delay so ForceGraph2D has mounted and registered forces
      const t = setTimeout(tuneForces, 80);
      return () => clearTimeout(t);
    }
  }, [graphData, tuneForces]);

  // Track mouse position for tooltip placement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  // ── displayGraphData: always the full graph (deep-copied to prevent D3 mutation) ──
  //
  // Focus mode no longer swaps graph data — instead, it dims non-focused nodes
  // and edges via canvas opacity. This preserves the existing layout so there
  // is no disorienting restart when clicking a node.

  const displayGraphData = useMemo<GraphData>(() => {
    return sanitizeGraphData(graphData);
  }, [graphData]);

  // ── Focus neighbourhood: nodes directly connected to the focused node ──────

  /**
   * Set of node IDs that are direct neighbours of the focused node.
   * Used by paintNode / getLinkColor to calculate focus-dim opacity.
   */
  const focusNeighbors = useMemo<Set<string>>(() => {
    if (!focusedNodeId) return new Set();
    const s = new Set<string>();
    for (const link of graphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (src === focusedNodeId) s.add(tgt);
      if (tgt === focusedNodeId) s.add(src);
    }
    return s;
  }, [focusedNodeId, graphData.links]);

  // ── topConnections: strongest links for the ConnectionExplanationPanel ──────
  //
  // Previously derived from displayGraphData (filtered subgraph). Now derived
  // from the full graphData directly so it works without a data swap.
  const topConnections = useMemo<GraphLink[]>(() => {
    if (!focusedNodeId) return [];
    const related: GraphLink[] = [];
    for (const link of graphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if ((src === focusedNodeId || tgt === focusedNodeId) && (link.tier != null || link.strength != null)) {
        related.push(link as GraphLink);
      }
    }
    related.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    return related.slice(0, 3);
  }, [focusedNodeId, graphData.links]);

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

  // (topConnections is now computed above in the focus neighbourhood section)

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
        const isInFocusZone = !focusedNodeId || isFocused || focusNeighbors.has(node.id);

        // Two-level dimming: hover dims unfocused-neighbours; focus dims non-zone nodes
        const isHoverDimmed = !!hoveredId && !isHovered && !isNeighbor;
        const isFocusDimmed = !!focusedNodeId && !isInFocusZone;
        const isDimmed      = isHoverDimmed || isFocusDimmed;

        // Importance-based radius — high-signal entities read as more significant
        const baseR  = nodeRadius(node);
        const r      = isFocused ? baseR + 3 : isHovered ? baseR + 2 : baseR;

        const x = node.x ?? 0;
        const y = node.y ?? 0;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.08 : 1;

        // ── Outer importance ring (entity nodes with high importance only) ──
        if (
          !isDimmed &&
          node.type === 'entity' &&
          node.importance != null &&
          node.importance >= 4
        ) {
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
          ctx.strokeStyle = `${color}28`;
          ctx.lineWidth   = 3;
          ctx.shadowBlur  = 0;
          ctx.stroke();
        }

        // Glow — intensity reflects state and importance
        const importanceGlow = node.importance != null ? Math.min(8, node.importance * 1.2) : 0;
        ctx.shadowBlur  = isFocused ? 42 : isHovered ? 34 : 14 + importanceGlow;
        ctx.shadowColor = color;

        // ── Shape by node type ────────────────────────────────────────────
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

        // Border ring
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = isFocused
          ? 'rgba(255,255,255,1)'
          : isHovered
            ? 'rgba(255,255,255,0.88)'
            : isInFocusZone && focusedNodeId
              ? `${color}90`
              : 'rgba(255,255,255,0.16)';
        ctx.lineWidth = isFocused ? 2.2 : isHovered ? 1.8 : 0.8;

        if (node.type === 'event') {
          drawDiamond(ctx, x, y, r);
        } else if (node.type === 'signal') {
          drawTriangle(ctx, x, y, r);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
        }

        ctx.stroke();

        // Label — only show for non-dimmed nodes, scale visibility by zoom
        if (!isDimmed) {
          const fontSize = Math.max(9, 10.5 / globalScale);
          ctx.font         = isFocused || isHovered
            ? `600 ${fontSize}px DM Sans, sans-serif`
            : `500 ${fontSize}px DM Sans, sans-serif`;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';

          // Text shadow for legibility against graph background
          ctx.shadowBlur  = 4;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.fillStyle   = isFocused || isHovered
            ? '#ffffff'
            : isInFocusZone && focusedNodeId
              ? 'rgba(240,240,250,0.95)'
              : 'rgba(240,240,250,0.62)';
          ctx.fillText(node.label, x, y + r + 3);
        }

        ctx.restore();
      } catch (err) {
        console.warn('[IntelligenceGraph] paintNode error:', err);
      }
    },
    [hoveredId, neighbors, focusedNodeId, focusNeighbors],
  );

  const getLinkColor = useCallback(
    (link: RuntimeLink) => {
      if (!link) return 'rgba(255,255,255,0.06)';
      try {
        const src = nodeId(link.source as string | RuntimeNode);
        const tgt = nodeId(link.target as string | RuntimeNode);

        // Hover state — brighten connected edges, near-hide others
        if (hoveredId) {
          return src === hoveredId || tgt === hoveredId
            ? 'rgba(255,255,255,0.7)'
            : 'rgba(255,255,255,0.02)';
        }

        // Focus state — brighten edges within focus zone, dim everything else
        if (focusedNodeId) {
          const inZone = src === focusedNodeId || tgt === focusedNodeId ||
            (focusNeighbors.has(src) && focusNeighbors.has(tgt));
          if (!inZone) return 'rgba(255,255,255,0.03)';
        }

        const alpha = baseLinkAlpha(link);

        const edgeStyle = getEdgeStyle(link);
        if (edgeStyle) {
          const hex = edgeStyle.color.replace('#', '');
          const rr = parseInt(hex.substring(0, 2), 16);
          const gg = parseInt(hex.substring(2, 4), 16);
          const bb = parseInt(hex.substring(4, 6), 16);
          return `rgba(${rr},${gg},${bb},${alpha})`;
        }

        if (link.tier) return `rgba(148,163,184,${alpha})`;

        return `rgba(255,255,255,${alpha})`;
      } catch {
        return 'rgba(255,255,255,0.06)';
      }
    },
    [hoveredId, focusedNodeId, focusNeighbors],
  );

  const getLinkWidth = useCallback(
    (link: RuntimeLink) => {
      if (!link) return 0.5;
      try {
        const src = nodeId(link.source as string | RuntimeNode);
        const tgt = nodeId(link.target as string | RuntimeNode);

        if (hoveredId) {
          return src === hoveredId || tgt === hoveredId ? 2.5 : 0.2;
        }

        if (focusedNodeId) {
          const inZone = src === focusedNodeId || tgt === focusedNodeId;
          if (!inZone) return 0.2;
        }

        if (link.strength != null) return Math.max(0.7, link.strength / 100 * 2.4);
        if (link.tier === 'strong')   return 2.2;
        if (link.tier === 'moderate') return 1.5;
        if (link.edgeType) return 1.3;

        return 0.7;
      } catch {
        return 0.5;
      }
    },
    [hoveredId, focusedNodeId],
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
      // Toggle focus mode — click focused entity again to exit
      if (focusedNodeId === node.id) {
        resetFocus();
      } else {
        setFocusedNodeId(node.id);
        setFocusedNode(node);
      }
    } else if (node.type === 'signal') {
      router.push(`/signals/${node.id}`);
    }
    // event nodes: no dedicated page yet
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
    background: 'rgba(8,8,20,0.96)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '11px 15px',
    fontSize: '0.76rem',
    color: 'rgba(238,238,248,0.85)',
    backdropFilter: 'blur(16px)',
    pointerEvents: 'none',
    maxWidth: 248,
    lineHeight: 1.55,
    boxShadow: '0 6px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
  };

  // Offset tooltip from cursor to avoid flickering
  const tooltipX = mousePos.x + 14;
  const tooltipY = mousePos.y - 10;

  const nodeTooltip = hoveredNode && (
    <div style={{ ...TOOLTIP_STYLE, left: tooltipX, top: tooltipY }}>
      {/* Label */}
      <div style={{ fontWeight: 600, color: nodeColor(hoveredNode), marginBottom: 4, fontSize: '0.8rem' }}>
        {hoveredNode.label}
      </div>

      {/* Type badge + importance/momentum */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
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
          <span style={{ color: 'rgba(238,238,248,0.5)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {hoveredNode.type === 'entity' && hoveredNode.subtype
              ? NODE_SUBTYPE_LABELS[hoveredNode.subtype]
              : NODE_TYPE_LABELS[hoveredNode.type]}
          </span>
        </div>
        {hoveredNode.importance != null && hoveredNode.importance > 0 && (
          <span style={{
            fontSize: '0.63rem',
            color: 'rgba(34,211,238,0.8)',
            background: 'rgba(34,211,238,0.08)',
            border: '1px solid rgba(34,211,238,0.18)',
            borderRadius: 4,
            padding: '0 5px',
            letterSpacing: '0.04em',
          }}>
            {hoveredNode.importance} signal{hoveredNode.importance !== 1 ? 's' : ''}
          </span>
        )}
        {hoveredNode.momentum != null && (
          <span style={{
            fontSize: '0.63rem',
            color: 'rgba(251,191,36,0.85)',
            letterSpacing: '0.04em',
          }}>
            ↑ {hoveredNode.momentum} momentum
          </span>
        )}
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

  const focusNodeColor = focusedNode ? nodeColor(focusedNode as RuntimeNode) : '#60a5fa';
  const focusConnectionCount = focusNeighbors.size;

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
      background: 'rgba(8,8,20,0.92)',
      border: `1px solid ${focusNodeColor}30`,
      borderRadius: 9,
      padding: '8px 16px',
      fontSize: '0.78rem',
      color: 'rgba(238,238,248,0.85)',
      backdropFilter: 'blur(16px)',
      boxShadow: `0 4px 28px rgba(0,0,0,0.55), 0 0 0 1px ${focusNodeColor}12`,
      whiteSpace: 'nowrap',
    }}>
      {/* Color-coded dot matching node color */}
      <span style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: focusNodeColor,
        boxShadow: `0 0 8px ${focusNodeColor}`,
        flexShrink: 0,
      }} />

      <span>
        <span style={{ color: 'rgba(238,238,248,0.38)', marginRight: 4, fontSize: '0.73rem' }}>Focus</span>
        <span style={{ fontWeight: 600, color: focusNodeColor }}>{focusedNode.label}</span>
        <span style={{ color: 'rgba(238,238,248,0.28)', marginLeft: 6, fontSize: '0.72rem' }}>
          · {focusConnectionCount} connection{focusConnectionCount !== 1 ? 's' : ''}
        </span>
      </span>

      {/* Open entity page or navigate to full graph in embedded mode */}
      <button
        onClick={() => router.push(initialFocusId ? '/graph' : `/entity/${focusedNode.slug ?? slugify(focusedNode.label)}`)}
        style={{
          background: `${focusNodeColor}18`,
          border: `1px solid ${focusNodeColor}35`,
          borderRadius: 6,
          color: focusNodeColor,
          fontSize: '0.7rem',
          padding: '3px 10px',
          cursor: 'pointer',
          letterSpacing: '0.03em',
          fontWeight: 500,
        }}
      >
        {initialFocusId ? 'Full graph →' : 'Open page →'}
      </button>

      {/* Reset / Escape hint */}
      <button
        onClick={resetFocus}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          color: 'rgba(238,238,248,0.42)',
          fontSize: '0.7rem',
          padding: '3px 10px',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
        title="Press Escape to reset"
      >
        Reset <span style={{ opacity: 0.4, fontSize: '0.62rem' }}>Esc</span>
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

  // Sort entity nodes by importance desc so highest-signal entities appear first
  const sortedEntityNodes = useMemo(
    () => [...entityNodes].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)),
    [entityNodes],
  );

  const entitySelectorPanel = !focusedNodeId && !compact && sortedEntityNodes.length > 0 && (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      maxWidth: 190,
    }}>
      <div style={{
        fontSize: '0.6rem',
        color: 'rgba(238,238,248,0.24)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 7,
        paddingLeft: 2,
      }}>
        Entities
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sortedEntityNodes.slice(0, 10).map(node => {
          const dotColor = nodeColor(node as GraphNode);
          return (
            <button
              key={node.id}
              onClick={() => {
                setFocusedNodeId(node.id);
                setFocusedNode(node as RuntimeNode);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(10,10,22,0.78)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                color: 'rgba(238,238,248,0.58)',
                fontSize: '0.72rem',
                padding: '5px 10px',
                cursor: 'pointer',
                textAlign: 'left',
                letterSpacing: '0.02em',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.12s',
                overflow: 'hidden',
                maxWidth: '100%',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = `${dotColor}14`;
                el.style.borderColor = `${dotColor}35`;
                el.style.color = '#f0f0fa';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'rgba(10,10,22,0.78)';
                el.style.borderColor = 'rgba(255,255,255,0.07)';
                el.style.color = 'rgba(238,238,248,0.58)';
              }}
            >
              {/* Subtype dot */}
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
                boxShadow: `0 0 5px ${dotColor}70`,
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.label}
              </span>
              {node.importance != null && node.importance > 0 && (
                <span style={{ color: 'rgba(238,238,248,0.28)', fontSize: '0.62rem', flexShrink: 0 }}>
                  {node.importance}
                </span>
              )}
            </button>
          );
        })}
        {sortedEntityNodes.length > 10 && (
          <span style={{ fontSize: '0.62rem', color: 'rgba(238,238,248,0.2)', paddingLeft: 6, marginTop: 2 }}>
            +{sortedEntityNodes.length - 10} more — click in graph
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
          ref={graphRef}
          graphData={displayGraphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#080814"
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
          cooldownTicks={180}
          d3AlphaDecay={0.025}
          d3VelocityDecay={0.42}
        />
      )}
    </div>
    </div>
  );
}
