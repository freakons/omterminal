/**
 * graphUtils.ts — Graph data adapter for the Intelligence Graph.
 *
 * Maps live DB data (EntityProfile[], AiEvent[], Signal[]) into the
 * GraphData format (nodes + links) used by IntelligenceGraph.tsx.
 *
 * This module does NOT import from IntelligenceGraph — it only deals with
 * the shared types from src/data/mockGraph.ts.
 *
 * Usage (future):
 *   const entities = await fetchEntities();
 *   const events   = await fetchEvents();
 *   const signals  = await fetchSignals();
 *   const graph    = buildGraphData({ entities, events, signals });
 */

import type { GraphData, GraphNode, GraphLink, NodeSubtype } from '@/data/mockGraph';
import type { EntityProfile } from '@/data/mockEntities';
import type { AiEvent } from '@/data/mockEvents';
import type { Signal } from '@/data/mockSignals';
import { computeAllRelationships, type EntityRelationship } from '@/lib/relationshipIntelligence';
import { injectStructuralEdges } from '@/lib/graphComposition';
import { slugify } from '@/utils/sanitize';

// ─────────────────────────────────────────────────────────────────────────────
// Entity subtype inference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infers NodeSubtype from EntityProfile sector.
 * Falls back to 'company' for unrecognised sectors.
 */
function inferEntitySubtype(entity: EntityProfile): NodeSubtype {
  const sector = (entity.sector ?? '').toLowerCase();
  if (
    sector.includes('invest') ||
    sector.includes('fund') ||
    sector.includes('venture') ||
    sector.includes('capital') ||
    sector.includes(' vc ')
  ) return 'investor';
  if (
    sector.includes('regulat') ||
    sector.includes('government') ||
    sector.includes('policy') ||
    sector.includes('authority') ||
    sector.includes('commission')
  ) return 'regulator';
  return 'company';
}

// ─────────────────────────────────────────────────────────────────────────────
// Input shape
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphInput {
  entities?: EntityProfile[];
  events?: AiEvent[];
  signals?: Signal[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts live DB records into a GraphData object suitable for rendering.
 *
 * Node IDs:
 *   - entities → entity.id
 *   - events   → event.id
 *   - signals  → signal.id
 *
 * Link strategy:
 *   - event.entityId  → entity node (if present)
 *   - event.signalIds → signal nodes (if present)
 *   - signal.entityId → entity node (if present)
 */
export function buildGraphData({ entities = [], events = [], signals = [] }: GraphInput): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Track which node IDs have been added to avoid duplicates
  const seen = new Set<string>();

  function addNode(node: GraphNode) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  }

  // ── Entity nodes ──────────────────────────────────────────────────────────
  for (const e of entities) {
    addNode({
      id:         e.id,
      type:       'entity',
      label:      e.name,
      subtype:    inferEntitySubtype(e),
      slug:       slugify(e.name),
      importance: e.signalCount > 0 ? e.signalCount : undefined,
    });
  }

  // ── Event nodes + links to entities ──────────────────────────────────────
  for (const ev of events) {
    addNode({ id: ev.id, type: 'event', label: ev.title });

    if (ev.entityId && seen.has(ev.entityId)) {
      links.push({ source: ev.entityId, target: ev.id });
    }

    // Link event → signals it belongs to
    if (ev.signalIds) {
      for (const sid of ev.signalIds) {
        links.push({ source: ev.id, target: sid });
      }
    }
  }

  // ── Signal nodes + links to entities ─────────────────────────────────────
  for (const sig of signals) {
    addNode({ id: sig.id, type: 'signal', label: sig.title });

    if (sig.entityId && seen.has(sig.entityId)) {
      links.push({ source: sig.entityId, target: sig.id });
    }
  }

  // Remove links where either endpoint has no node (referential safety)
  const validLinks = links.filter(l =>
    seen.has(l.source) && seen.has(l.target) && l.source !== l.target,
  );

  return { nodes, links: validLinks };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity-only convenience (used by IntelligenceGraph's buildGraphFromEntities)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight variant that builds a graph from entities alone.
 * Entities sharing the same `sector` are linked together.
 */
export function buildGraphFromEntities(entities: EntityProfile[]): GraphData {
  const nodes: GraphNode[] = entities.map(e => ({
    id: e.id,
    type: 'entity' as const,
    label: e.name,
  }));

  const links: GraphLink[] = [];
  // Group by sector and link co-sector entities
  const bySector = new Map<string, string[]>();
  for (const e of entities) {
    const sector = e.sector ?? 'unknown';
    const group = bySector.get(sector) ?? [];
    group.push(e.id);
    bySector.set(sector, group);
  }
  for (const group of bySector.values()) {
    if (group.length < 2) continue;
    // Star topology: first entity in group links to all others
    const [hub, ...rest] = group;
    for (const target of rest) {
      links.push({ source: hub, target });
    }
  }

  return { nodes, links };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal-driven graph builder (relationship intelligence)
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligentGraphInput {
  entities: EntityProfile[];
  events: AiEvent[];
  signals: Signal[];
  /** Reference date for recency calculations (default: now). */
  referenceDate?: Date;
  /** Minimum relationship strength to include an entity↔entity edge (default: 1). */
  minStrength?: number;
}

export interface IntelligentGraphResult {
  graph: GraphData;
  /** All computed entity relationships, sorted by strength descending. */
  relationships: EntityRelationship[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Text-based co-occurrence extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * For DB signals that lack `mentionedEntityIds`, scan signal text to find
 * other known entity names.  This creates cross-entity edges from real signal
 * content without requiring a DB schema change.
 *
 * Matches on full EntityProfile.name AND common short-form aliases to improve
 * real co-occurrence detection from signal text.
 * The primary entityId is always excluded from results.
 */

/** Known common short-form aliases for entity name matching in signal text. */
const ENTITY_ALIASES: Record<string, string[]> = {
  'openai':         ['openai', 'chatgpt', 'gpt-4', 'gpt-5', 'gpt4', 'gpt5'],
  'anthropic':      ['anthropic', 'claude'],
  'google_deepmind':['google', 'deepmind', 'gemini', 'alphabet'],
  'meta_ai':        ['meta', 'llama', 'meta ai'],
  'mistral_ai':     ['mistral'],
  'xai':            ['xai', 'grok', 'x.ai'],
  'deepseek':       ['deepseek'],
  'microsoft':      ['microsoft', 'azure', 'bing', 'copilot'],
  'aws':            ['amazon', 'aws', 'bedrock', 'trainium'],
  'nvidia':         ['nvidia', 'blackwell', 'cuda', 'h100', 'h200'],
  'a16z':           ['a16z', 'andreessen', 'andreessen horowitz'],
  'softbank':       ['softbank', 'vision fund', 'masayoshi'],
  'sequoia':        ['sequoia'],
  'spark_capital':  ['spark capital'],
  'eu_ai_office':   ['eu ai', 'european', 'ai act', 'ai office'],
  'ftc':            ['ftc', 'federal trade'],
  'scale_ai':       ['scale ai', 'scale.ai'],
  'hugging_face':   ['hugging face', 'huggingface'],
  'cohere':         ['cohere'],
  'perplexity':     ['perplexity'],
  'character_ai':   ['character.ai', 'character ai'],
  'apple':          ['apple', 'apple intelligence', 'siri'],
};

function extractTextMentionedEntityIds(
  signal: { entityId: string; title: string; summary?: string | null },
  entities: EntityProfile[],
): string[] {
  const text = `${signal.title} ${signal.summary ?? ''}`.toLowerCase();
  const found: string[] = [];
  for (const e of entities) {
    if (e.id === signal.entityId) continue;
    if (e.name.length < 3) continue; // skip very short names to avoid false positives
    // Full name match (original behaviour)
    if (text.includes(e.name.toLowerCase())) {
      found.push(e.id);
      continue;
    }
    // Alias match — improves co-occurrence detection without false positives
    const aliases = ENTITY_ALIASES[e.id];
    if (aliases) {
      for (const alias of aliases) {
        if (alias.length >= 4 && text.includes(alias)) {
          found.push(e.id);
          break;
        }
      }
    }
  }
  return found;
}

/**
 * Enrich signals that lack `mentionedEntityIds` by scanning their text for
 * entity names.  Returns a new array — the original signals are not mutated.
 */
function enrichSignalsWithTextCooccurrence(
  signals: Signal[],
  entities: EntityProfile[],
): Signal[] {
  return signals.map(sig => {
    // If already enriched, skip
    if (sig.mentionedEntityIds && sig.mentionedEntityIds.length > 0) return sig;
    const mentioned = extractTextMentionedEntityIds(sig, entities);
    if (mentioned.length === 0) return sig;
    return { ...sig, mentionedEntityIds: mentioned };
  });
}

/**
 * Build a graph where entity↔entity edges are weighted by signal-driven
 * relationship intelligence rather than static sector groupings.
 *
 * Includes all standard entity→event, event→signal, and signal→entity links
 * from buildGraphData, plus weighted entity↔entity edges computed from shared
 * signal activity, recency, and significance.
 *
 * For signals without explicit `mentionedEntityIds`, text-based co-occurrence
 * detection is run automatically to extract cross-entity relationships from
 * real DB signal content.
 */
export function buildIntelligentGraph(input: IntelligentGraphInput): IntelligentGraphResult {
  const { entities, events, signals, referenceDate, minStrength = 1 } = input;

  // Enrich signals with text-based entity co-occurrence for DB signals that
  // lack explicit mentionedEntityIds (no-op when already enriched)
  const enrichedSignals = enrichSignalsWithTextCooccurrence(signals, entities);

  // Start with the standard graph
  const base = buildGraphData({ entities, events, signals: enrichedSignals });

  // Compute signal-driven relationships using enriched signals
  const relationships = computeAllRelationships({
    entities,
    signals: enrichedSignals,
    events,
    referenceDate,
  });

  // Add weighted entity↔entity edges
  const existingLinks = new Set(
    base.links.map(l => `${l.source}::${l.target}`),
  );
  const seen = new Set(base.nodes.map(n => n.id));

  for (const rel of relationships) {
    if (rel.strength < minStrength) continue;

    // Skip if both entities aren't in the graph
    if (!seen.has(rel.sourceEntityId) || !seen.has(rel.targetEntityId)) continue;

    const key = `${rel.sourceEntityId}::${rel.targetEntityId}`;
    const reverseKey = `${rel.targetEntityId}::${rel.sourceEntityId}`;

    // Skip if link already exists in either direction
    if (existingLinks.has(key) || existingLinks.has(reverseKey)) continue;

    base.links.push({
      source: rel.sourceEntityId,
      target: rel.targetEntityId,
      strength: rel.strength,
      tier: rel.tier === 'none' ? undefined : rel.tier,
      sharedSignals: rel.sharedSignalCount,
      lastInteraction: rel.lastInteraction ?? undefined,
      edgeType: rel.edgeType,
    });
  }

  // ── Structural edge injection ────────────────────────────────────────────
  // Seed known real-world structural relationships (funding, partnerships,
  // regulation, competition) as weak baseline edges wherever signal-driven
  // edges don't already exist. This ensures the graph remains connected and
  // ecologically meaningful even when live signals are sparse.
  const withStructural = injectStructuralEdges(base);

  return { graph: withStructural, relationships };
}
