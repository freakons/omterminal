'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mockGraphData, type GraphNode, type GraphLink, type GraphData } from '@/data/mockGraph';

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

/** Node as enriched by force-graph at runtime */
type RuntimeNode = GraphNode & { x?: number; y?: number };
type RuntimeLink = GraphLink & { source: string | RuntimeNode; target: string | RuntimeNode };

function nodeId(n: string | RuntimeNode): string {
  return typeof n === 'object' ? n.id : n;
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
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function IntelligenceGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>(mockGraphData);
  const [isDemo, setIsDemo] = useState(true);
  const [dataSource, setDataSource] = useState<string>('fallback');

  // Fetch live relationship graph on mount; fall back to mock data if unavailable
  useEffect(() => {
    fetchGraphData().then(({ data, isDemo: demo, source }) => {
      setGraphData(data);
      setIsDemo(demo);
      setDataSource(source);
    });
  }, []);

  /** Set of node IDs connected to the hovered node */
  const neighbors = useMemo<Set<string>>(() => {
    if (!hoveredId) return new Set();
    const s = new Set<string>();
    for (const link of graphData.links) {
      const src = nodeId(link.source as string | RuntimeNode);
      const tgt = nodeId(link.target as string | RuntimeNode);
      if (src === hoveredId) s.add(tgt);
      if (tgt === hoveredId) s.add(src);
    }
    return s;
  }, [hoveredId, graphData.links]);

  /** Custom canvas renderer — draws glowing nodes with labels */
  const paintNode = useCallback(
    (node: RuntimeNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const color      = NODE_COLORS[node.type] ?? '#6366f1';
      const isHovered  = node.id === hoveredId;
      const isNeighbor = neighbors.has(node.id);
      const isDimmed   = !!hoveredId && !isHovered && !isNeighbor;
      const r          = isHovered ? 9 : 6;

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.18 : 1;

      // Glow
      ctx.shadowBlur  = isHovered ? 28 : 14;
      ctx.shadowColor = color;

      // Circle fill
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Border ring
      ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth   = isHovered ? 1.5 : 0.75;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Label
      const fontSize       = Math.max(10, 11 / globalScale);
      ctx.font             = `500 ${fontSize}px DM Sans, sans-serif`;
      ctx.textAlign        = 'center';
      ctx.textBaseline     = 'top';
      ctx.fillStyle        = isHovered ? '#ffffff' : 'rgba(238,238,248,0.78)';
      ctx.fillText(node.label, node.x ?? 0, (node.y ?? 0) + r + 3);

      ctx.restore();
    },
    [hoveredId, neighbors],
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
    console.log('[IntelligenceGraph] node clicked:', node);
  }, []);

  const handleNodeHover = useCallback((node: RuntimeNode | null) => {
    setHoveredId(node?.id ?? null);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  }, []);

  const demoBannerText =
    dataSource === 'fallback'
      ? 'Graph unavailable — showing static demo'
      : 'Demo data — live graph populates once the ingestion pipeline runs';

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
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 600 }}
    >
      <ForceGraph2D
        graphData={graphData}
        backgroundColor="transparent"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodeLabel="label"
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
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
