/**
 * graphComposition.ts — Ecosystem Graph Composition Layer
 *
 * Enforces minimum viable graph density so the graph always feels like a real
 * ecosystem intelligence map, even when live DB data is sparse.
 *
 * Strategy:
 *   1. Structural anchor entities — a curated set of real AI ecosystem actors
 *      that should always appear in the graph as spatial reference points.
 *   2. Structural relationship seeding — known, publicly documented real-world
 *      relationships (funding, partnerships, regulation, competition) injected
 *      as weak baseline edges when no signal-driven edge exists.
 *   3. Minimum density enforcement — if live data is below MIN_ENTITY_COUNT,
 *      supplement with anchor entities from the MOCK_ENTITIES registry.
 *
 * Rules:
 *   • No fake entities — only entities from MOCK_ENTITIES are used.
 *   • No fabricated relationships — all structural edges are real, documented.
 *   • Signal-driven edges always take priority over structural baseline edges.
 *   • Anchor entities injected without live signals appear with low importance
 *     so they render lighter/smaller — visible but not dominant.
 */

import type { GraphData, GraphLink } from '@/data/mockGraph';
import type { EntityProfile } from '@/data/mockEntities';
import { MOCK_ENTITIES } from '@/data/mockEntities';

// ─────────────────────────────────────────────────────────────────────────────
// Structural anchor entity IDs
// All are real AI ecosystem actors drawn from MOCK_ENTITIES.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered list of structural anchor entity IDs.
 * Ordered by priority: most important anchors first.
 * When the entity list needs supplementing, anchors are added in this order.
 */
export const STRUCTURAL_ANCHOR_IDS: readonly string[] = [
  // Core frontier labs
  'openai',
  'anthropic',
  'google_deepmind',
  'meta_ai',
  'mistral_ai',
  'xai',
  'deepseek',
  // Cloud / platform hyperscalers
  'microsoft',
  'aws',
  // Chips / compute infrastructure
  'nvidia',
  // Major investors
  'a16z',
  'sequoia',
  'softbank',
  'spark_capital',
  // Regulators
  'eu_ai_office',
  'ftc',
  // Developer infrastructure / platforms
  'scale_ai',
  'hugging_face',
  // Applied AI / consumer
  'cohere',
  'perplexity',
  'character_ai',
  'apple',
];

// ─────────────────────────────────────────────────────────────────────────────
// Density configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Target minimum entity count for a useful graph. */
export const MIN_ENTITY_COUNT = 20;

/**
 * Importance score assigned to anchor entities that have no live signal data.
 * Kept at 1 so they render at minimum size — present but not dominant.
 */
const ANCHOR_IMPORTANCE_BASELINE = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Structural relationship definitions
// ─────────────────────────────────────────────────────────────────────────────

interface StructuralEdge {
  source: string;
  target: string;
  edgeType: GraphLink['edgeType'];
  /**
   * Baseline strength for structural edges (20–45).
   * Intentionally lower than typical signal-driven edges (50–100) so that
   * real data always dominates the visual.
   */
  strength: number;
  tier: GraphLink['tier'];
}

/**
 * Known, publicly documented structural relationships in the AI ecosystem.
 *
 * Sources: public funding announcements, regulatory filings, press releases,
 * earnings reports, and publicly available partnership agreements.
 *
 * Strength is kept LOW (20–45) so that signal-driven edges remain dominant.
 * These only appear as light structural connectors when real signal edges are absent.
 */
export const STRUCTURAL_RELATIONSHIPS: StructuralEdge[] = [
  // ── Funding / investment ────────────────────────────────────────────────
  // Microsoft: multi-billion OpenAI partnership (2019, 2021, 2023)
  { source: 'microsoft',    target: 'openai',         edgeType: 'funding',     strength: 45, tier: 'moderate' },
  // Amazon Web Services: $4B Anthropic commitment
  { source: 'aws',          target: 'anthropic',      edgeType: 'funding',     strength: 45, tier: 'moderate' },
  // a16z: early OpenAI investor; AI fund lead across multiple labs
  { source: 'a16z',         target: 'openai',         edgeType: 'funding',     strength: 35, tier: 'moderate' },
  { source: 'a16z',         target: 'mistral_ai',     edgeType: 'funding',     strength: 30, tier: 'weak'     },
  // Spark Capital: lead investor Anthropic Series E
  { source: 'spark_capital', target: 'anthropic',     edgeType: 'funding',     strength: 40, tier: 'moderate' },
  // Sequoia: OpenAI early investor; State of AI report author
  { source: 'sequoia',      target: 'openai',         edgeType: 'funding',     strength: 30, tier: 'weak'     },
  // SoftBank Vision Fund: led Perplexity Series D; secondary in OpenAI
  { source: 'softbank',     target: 'perplexity',     edgeType: 'funding',     strength: 30, tier: 'weak'     },
  { source: 'softbank',     target: 'openai',         edgeType: 'funding',     strength: 25, tier: 'weak'     },
  // Google invested in Anthropic (competing cloud deal alongside AWS)
  { source: 'google_deepmind', target: 'anthropic',   edgeType: 'funding',     strength: 30, tier: 'weak'     },

  // ── Partnerships ─────────────────────────────────────────────────────────
  // Apple Intelligence: Claude integration in Siri (confirmed 2025)
  { source: 'apple',        target: 'anthropic',      edgeType: 'partnership', strength: 40, tier: 'moderate' },
  // Scale AI: RLHF/data partner for all major labs
  { source: 'scale_ai',     target: 'openai',         edgeType: 'partnership', strength: 40, tier: 'moderate' },
  { source: 'scale_ai',     target: 'anthropic',      edgeType: 'partnership', strength: 35, tier: 'moderate' },
  { source: 'scale_ai',     target: 'google_deepmind', edgeType: 'partnership', strength: 30, tier: 'weak'   },
  { source: 'scale_ai',     target: 'meta_ai',        edgeType: 'partnership', strength: 25, tier: 'weak'    },
  // Hugging Face: primary distribution platform for open-weights models
  { source: 'hugging_face', target: 'meta_ai',        edgeType: 'partnership', strength: 30, tier: 'weak'    },
  { source: 'hugging_face', target: 'mistral_ai',     edgeType: 'partnership', strength: 30, tier: 'weak'    },
  { source: 'hugging_face', target: 'deepseek',       edgeType: 'partnership', strength: 25, tier: 'weak'    },
  // AWS: Bedrock catalogue includes Anthropic, Meta, Mistral models
  { source: 'aws',          target: 'meta_ai',        edgeType: 'partnership', strength: 25, tier: 'weak'    },
  { source: 'aws',          target: 'mistral_ai',     edgeType: 'partnership', strength: 25, tier: 'weak'    },
  { source: 'aws',          target: 'cohere',         edgeType: 'partnership', strength: 25, tier: 'weak'    },
  // NVIDIA: compute supply relationships with major frontier labs
  { source: 'nvidia',       target: 'openai',         edgeType: 'partnership', strength: 30, tier: 'weak'    },
  { source: 'nvidia',       target: 'anthropic',      edgeType: 'partnership', strength: 25, tier: 'weak'    },
  { source: 'nvidia',       target: 'google_deepmind', edgeType: 'partnership', strength: 25, tier: 'weak'   },
  { source: 'nvidia',       target: 'meta_ai',        edgeType: 'partnership', strength: 25, tier: 'weak'    },
  // Microsoft: Azure hosts OpenAI models; enterprise AI stack
  { source: 'microsoft',    target: 'anthropic',      edgeType: 'partnership', strength: 25, tier: 'weak'    },

  // ── Competition ──────────────────────────────────────────────────────────
  // OpenAI vs Anthropic: direct frontier model competition
  { source: 'openai',       target: 'anthropic',      edgeType: 'competition', strength: 35, tier: 'moderate' },
  // OpenAI vs DeepMind: longstanding research rivalry
  { source: 'openai',       target: 'google_deepmind', edgeType: 'competition', strength: 30, tier: 'weak'   },
  // OpenAI vs Meta: open vs closed weights market battle
  { source: 'openai',       target: 'meta_ai',        edgeType: 'competition', strength: 25, tier: 'weak'    },
  // OpenAI vs DeepSeek: pricing war after DeepSeek V3 release
  { source: 'openai',       target: 'deepseek',       edgeType: 'competition', strength: 25, tier: 'weak'    },
  // Anthropic vs DeepMind: enterprise safety-focused lab competition
  { source: 'anthropic',    target: 'google_deepmind', edgeType: 'competition', strength: 25, tier: 'weak'   },
  // Mistral vs DeepSeek: European vs Chinese open-weights labs
  { source: 'mistral_ai',   target: 'deepseek',       edgeType: 'competition', strength: 20, tier: 'weak'    },
  // xAI vs OpenAI: Grok vs ChatGPT consumer AI
  { source: 'xai',          target: 'openai',         edgeType: 'competition', strength: 25, tier: 'weak'    },

  // ── Regulation ───────────────────────────────────────────────────────────
  // EU AI Office: General-Purpose AI model oversight under AI Act
  { source: 'eu_ai_office', target: 'openai',         edgeType: 'regulation',  strength: 35, tier: 'moderate' },
  { source: 'eu_ai_office', target: 'google_deepmind', edgeType: 'regulation', strength: 35, tier: 'moderate' },
  { source: 'eu_ai_office', target: 'meta_ai',        edgeType: 'regulation',  strength: 30, tier: 'weak'    },
  { source: 'eu_ai_office', target: 'mistral_ai',     edgeType: 'regulation',  strength: 25, tier: 'weak'    },
  // FTC: AI market concentration investigation (Microsoft-OpenAI, Google-Anthropic)
  { source: 'ftc',          target: 'openai',         edgeType: 'regulation',  strength: 35, tier: 'moderate' },
  { source: 'ftc',          target: 'microsoft',      edgeType: 'regulation',  strength: 30, tier: 'weak'    },
  { source: 'ftc',          target: 'google_deepmind', edgeType: 'regulation', strength: 25, tier: 'weak'    },
  { source: 'ftc',          target: 'anthropic',      edgeType: 'regulation',  strength: 25, tier: 'weak'    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Entity lookup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ENTITY_MAP = new Map(MOCK_ENTITIES.map(e => [e.id, e]));

// ─────────────────────────────────────────────────────────────────────────────
// Supplement logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the entity list reaches the target minimum count.
 *
 * 1. First pass: add structural anchors that are missing (in priority order).
 * 2. Second pass: if still below target, add any remaining MOCK_ENTITIES
 *    sorted by signal count.
 *
 * Injected entities use signalCount=ANCHOR_IMPORTANCE_BASELINE so they render
 * at minimum node size — present as structural reference but not visually dominant.
 *
 * @param liveEntities  Entities already in the graph (from DB or mock).
 * @param targetCount   Minimum entity count to aim for.
 * @returns             Augmented entity list (liveEntities first, anchors appended).
 */
export function supplementWithAnchors(
  liveEntities: EntityProfile[],
  targetCount = MIN_ENTITY_COUNT,
): EntityProfile[] {
  const presentIds = new Set(liveEntities.map(e => e.id));
  const result: EntityProfile[] = [...liveEntities];

  // Pass 1 — priority anchor set
  for (const anchorId of STRUCTURAL_ANCHOR_IDS) {
    if (result.length >= targetCount) break;
    if (presentIds.has(anchorId)) continue;

    const anchor = MOCK_ENTITY_MAP.get(anchorId);
    if (anchor) {
      result.push({
        ...anchor,
        // Cap signal count so anchor appears lighter than live high-signal entities
        signalCount: Math.min(anchor.signalCount, ANCHOR_IMPORTANCE_BASELINE),
      });
      presentIds.add(anchorId);
    }
  }

  // Pass 2 — fill remaining slots from MOCK_ENTITIES by signal count
  if (result.length < targetCount) {
    const remaining = [...MOCK_ENTITIES]
      .filter(e => !presentIds.has(e.id))
      .sort((a, b) => b.signalCount - a.signalCount);

    for (const e of remaining) {
      if (result.length >= targetCount) break;
      result.push({ ...e, signalCount: ANCHOR_IMPORTANCE_BASELINE });
      presentIds.add(e.id);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structural edge injection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject structural relationship edges into a graph.
 *
 * Rules:
 *   - Both entity IDs must be present as nodes in the graph.
 *   - If a signal-driven edge already exists between a pair, skip it
 *     (real data always takes priority).
 *   - Structural edges are marked with low strength so they render
 *     lighter and less dominant than signal-driven relationships.
 *
 * @param graph  The base graph (already has signal-driven edges).
 * @returns      A new GraphData with structural baseline edges appended.
 */
export function injectStructuralEdges(graph: GraphData): GraphData {
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  // Build a set of existing edge keys (undirected)
  const existingKeys = new Set<string>();
  for (const l of graph.links) {
    const src = typeof l.source === 'string' ? l.source : (l.source as { id: string }).id;
    const tgt = typeof l.target === 'string' ? l.target : (l.target as { id: string }).id;
    existingKeys.add(src < tgt ? `${src}::${tgt}` : `${tgt}::${src}`);
  }

  const newLinks: GraphLink[] = [];

  for (const rel of STRUCTURAL_RELATIONSHIPS) {
    // Skip if either endpoint is not in the current graph
    if (!nodeIds.has(rel.source) || !nodeIds.has(rel.target)) continue;

    const key = rel.source < rel.target
      ? `${rel.source}::${rel.target}`
      : `${rel.target}::${rel.source}`;

    // Skip — a signal-driven edge already exists for this pair
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    newLinks.push({
      source: rel.source,
      target: rel.target,
      edgeType: rel.edgeType,
      strength: rel.strength,
      tier: rel.tier,
    });
  }

  return { ...graph, links: [...graph.links, ...newLinks] };
}
