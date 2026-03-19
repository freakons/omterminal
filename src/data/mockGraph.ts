/** Entity sub-classification for richer visual meaning */
export type NodeSubtype = 'company' | 'investor' | 'model' | 'regulator';

/** Semantic relationship type for edge meaning */
export type EdgeType = 'funding' | 'competition' | 'partnership' | 'model-release' | 'regulation';

export type GraphNode = {
  id: string;
  type: "entity" | "event" | "signal";
  label: string;
  /** Optional sub-classification for entity nodes (company, investor, model, regulator). */
  subtype?: NodeSubtype;
};

export type GraphLink = {
  source: string;
  target: string;
  /** Relationship strength (0–100). Present on entity↔entity edges. */
  strength?: number;
  /** Qualitative tier: strong / moderate / weak. */
  tier?: 'strong' | 'moderate' | 'weak';
  /** Number of shared signals driving this edge. */
  sharedSignals?: number;
  /** ISO timestamp of the most recent shared interaction. */
  lastInteraction?: string;
  /** Semantic relationship type for edge meaning and visual styling. */
  edgeType?: EdgeType;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

/**
 * Minimal static graph for renderer sanity checks.
 *
 * 4 nodes · 3 links — a known-valid dataset that proves ForceGraph2D can
 * render entity / event / signal types and directed links correctly,
 * independently of live data or the relationship-intelligence pipeline.
 *
 * Use only as:
 *   - last-resort fallback when the API returns nothing usable
 *   - a gated sanity path (e.g. ?sanity=1) during debugging
 *
 * Never let it mask real production data.
 */
export const staticSanityGraph: GraphData = {
  nodes: [
    { id: 'openai',        type: 'entity', label: 'OpenAI',              subtype: 'company' },
    { id: 'anthropic',     type: 'entity', label: 'Anthropic',           subtype: 'company' },
    { id: 'claude-4',      type: 'event',  label: 'Claude 4 Release' },
    { id: 'frontier-race', type: 'signal', label: 'Frontier model race' },
  ],
  links: [
    { source: 'openai',    target: 'frontier-race',                      edgeType: 'competition' },
    { source: 'anthropic', target: 'claude-4',                           edgeType: 'model-release' },
    { source: 'claude-4',  target: 'frontier-race' },
  ],
};

export const mockGraphData: GraphData = {
  nodes: [
    // Entities — with subtypes for richer visual meaning
    { id: "openai",     type: "entity", label: "OpenAI",           subtype: "company" },
    { id: "anthropic",  type: "entity", label: "Anthropic",        subtype: "company" },
    { id: "deepmind",   type: "entity", label: "Google DeepMind",  subtype: "company" },
    { id: "nvidia",     type: "entity", label: "NVIDIA",           subtype: "company" },
    { id: "a16z",       type: "entity", label: "a16z",             subtype: "investor" },
    { id: "eu-ai-act",  type: "entity", label: "EU AI Act",        subtype: "regulator" },

    // Events
    { id: "gpt5",        type: "event", label: "GPT-5 Release" },
    { id: "anthfunding", type: "event", label: "Anthropic Funding Round" },
    { id: "gemini",      type: "event", label: "Gemini 2.0 Benchmark" },

    // Signals
    { id: "frontier",  type: "signal", label: "Frontier AI competition accelerating" },
    { id: "modelwave", type: "signal", label: "Model release wave" },
  ],
  links: [
    { source: "openai",      target: "gpt5",        edgeType: "model-release" },
    { source: "anthropic",   target: "anthfunding",  edgeType: "funding" },
    { source: "deepmind",    target: "gemini",       edgeType: "model-release" },
    { source: "a16z",        target: "anthropic",    edgeType: "funding" },
    { source: "openai",      target: "anthropic",    edgeType: "competition",    tier: "strong",   strength: 82, sharedSignals: 14 },
    { source: "openai",      target: "deepmind",     edgeType: "competition",    tier: "moderate", strength: 55, sharedSignals: 8  },
    { source: "eu-ai-act",   target: "openai",       edgeType: "regulation" },
    { source: "eu-ai-act",   target: "anthropic",    edgeType: "regulation" },
    { source: "gpt5",        target: "frontier" },
    { source: "gpt5",        target: "modelwave" },
    { source: "anthfunding", target: "frontier" },
    { source: "gemini",      target: "modelwave" },
    { source: "nvidia",      target: "frontier" },
    { source: "anthropic",   target: "modelwave" },
  ],
};
