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
  /** URL slug for entity page navigation (slugify(entity.name)). */
  slug?: string;
  /** Signal count / importance score — drives node sizing in the graph. */
  importance?: number;
  /** Momentum score 0–100 — surface via glow intensity or ring highlight. */
  momentum?: number;
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
 * Rich static graph for renderer fallback — used when the API returns nothing usable.
 *
 * 18 entity nodes + 4 event/signal nodes · 32 links.
 * Represents the core AI ecosystem structure across all semantic zones:
 *   center (frontier labs) · left (investors) · top (regulators) · bottom (infra)
 *
 * Use only as:
 *   - last-resort fallback when the API returns nothing usable
 *   - a gated sanity path (e.g. ?sanity=1) during debugging
 *
 * Never let it mask real production data.
 * All entities and relationships are real AI ecosystem actors.
 */
export const staticSanityGraph: GraphData = {
  nodes: [
    // ── Core frontier labs (center zone) ────────────────────────────────────
    { id: 'openai',         type: 'entity', label: 'OpenAI',           subtype: 'company',   slug: 'openai',         importance: 7 },
    { id: 'anthropic',      type: 'entity', label: 'Anthropic',        subtype: 'company',   slug: 'anthropic',      importance: 6 },
    { id: 'google_deepmind',type: 'entity', label: 'Google DeepMind',  subtype: 'company',   slug: 'google-deepmind',importance: 5 },
    { id: 'meta_ai',        type: 'entity', label: 'Meta AI',          subtype: 'company',   slug: 'meta-ai',        importance: 4 },
    { id: 'mistral_ai',     type: 'entity', label: 'Mistral AI',       subtype: 'company',   slug: 'mistral-ai',     importance: 3 },
    { id: 'xai',            type: 'entity', label: 'xAI',              subtype: 'company',   slug: 'xai',            importance: 3 },
    { id: 'deepseek',       type: 'entity', label: 'DeepSeek',         subtype: 'company',   slug: 'deepseek',       importance: 3 },
    // ── Investors (left zone) ────────────────────────────────────────────────
    { id: 'a16z',           type: 'entity', label: 'a16z',             subtype: 'investor',  slug: 'a16z',           importance: 2 },
    { id: 'sequoia',        type: 'entity', label: 'Sequoia Capital',   subtype: 'investor',  slug: 'sequoia-capital',importance: 2 },
    { id: 'softbank',       type: 'entity', label: 'SoftBank',         subtype: 'investor',  slug: 'softbank',       importance: 2 },
    { id: 'spark_capital',  type: 'entity', label: 'Spark Capital',    subtype: 'investor',  slug: 'spark-capital',  importance: 1 },
    // ── Regulators (top zone) ────────────────────────────────────────────────
    { id: 'eu_ai_office',   type: 'entity', label: 'EU AI Office',     subtype: 'regulator', slug: 'eu-ai-office',   importance: 3 },
    { id: 'ftc',            type: 'entity', label: 'FTC',              subtype: 'regulator', slug: 'ftc',            importance: 2 },
    // ── Infrastructure / compute (bottom zone) ───────────────────────────────
    { id: 'nvidia',         type: 'entity', label: 'NVIDIA',           subtype: 'company',   slug: 'nvidia',         importance: 4 },
    { id: 'microsoft',      type: 'entity', label: 'Microsoft',        subtype: 'company',   slug: 'microsoft',      importance: 3 },
    { id: 'aws',            type: 'entity', label: 'Amazon Web Services', subtype: 'company', slug: 'amazon-web-services', importance: 3 },
    { id: 'scale_ai',       type: 'entity', label: 'Scale AI',         subtype: 'company',   slug: 'scale-ai',       importance: 2 },
    { id: 'hugging_face',   type: 'entity', label: 'Hugging Face',     subtype: 'company',   slug: 'hugging-face',   importance: 2 },
    // ── Events / signals ─────────────────────────────────────────────────────
    { id: 'ev-frontier-race',  type: 'event',  label: 'Frontier Model Race' },
    { id: 'ev-ai-regulation',  type: 'event',  label: 'Global AI Regulation Wave' },
    { id: 'sig-model-release', type: 'signal', label: 'Model release velocity' },
    { id: 'sig-infra-demand',  type: 'signal', label: 'AI infrastructure demand surge' },
  ],
  links: [
    // ── Funding / investment ─────────────────────────────────────────────────
    { source: 'microsoft',   target: 'openai',         edgeType: 'funding',     tier: 'moderate', strength: 45 },
    { source: 'aws',         target: 'anthropic',      edgeType: 'funding',     tier: 'moderate', strength: 45 },
    { source: 'a16z',        target: 'openai',         edgeType: 'funding',     tier: 'moderate', strength: 35 },
    { source: 'a16z',        target: 'mistral_ai',     edgeType: 'funding',     tier: 'weak',     strength: 25 },
    { source: 'spark_capital', target: 'anthropic',    edgeType: 'funding',     tier: 'moderate', strength: 40 },
    { source: 'sequoia',     target: 'openai',         edgeType: 'funding',     tier: 'weak',     strength: 25 },
    { source: 'softbank',    target: 'openai',         edgeType: 'funding',     tier: 'weak',     strength: 22 },
    { source: 'google_deepmind', target: 'anthropic',  edgeType: 'funding',     tier: 'weak',     strength: 28 },
    // ── Partnerships ─────────────────────────────────────────────────────────
    { source: 'scale_ai',    target: 'openai',         edgeType: 'partnership', tier: 'moderate', strength: 38 },
    { source: 'scale_ai',    target: 'anthropic',      edgeType: 'partnership', tier: 'moderate', strength: 33 },
    { source: 'scale_ai',    target: 'google_deepmind',edgeType: 'partnership', tier: 'weak',     strength: 25 },
    { source: 'hugging_face',target: 'meta_ai',        edgeType: 'partnership', tier: 'weak',     strength: 28 },
    { source: 'hugging_face',target: 'mistral_ai',     edgeType: 'partnership', tier: 'weak',     strength: 26 },
    { source: 'nvidia',      target: 'openai',         edgeType: 'partnership', tier: 'weak',     strength: 28 },
    { source: 'nvidia',      target: 'anthropic',      edgeType: 'partnership', tier: 'weak',     strength: 22 },
    // ── Competition ──────────────────────────────────────────────────────────
    { source: 'openai',      target: 'anthropic',      edgeType: 'competition', tier: 'moderate', strength: 35 },
    { source: 'openai',      target: 'google_deepmind',edgeType: 'competition', tier: 'weak',     strength: 28 },
    { source: 'openai',      target: 'meta_ai',        edgeType: 'competition', tier: 'weak',     strength: 22 },
    { source: 'openai',      target: 'deepseek',       edgeType: 'competition', tier: 'weak',     strength: 22 },
    { source: 'xai',         target: 'openai',         edgeType: 'competition', tier: 'weak',     strength: 20 },
    // ── Regulation ───────────────────────────────────────────────────────────
    { source: 'eu_ai_office',target: 'openai',         edgeType: 'regulation',  tier: 'moderate', strength: 35 },
    { source: 'eu_ai_office',target: 'google_deepmind',edgeType: 'regulation',  tier: 'moderate', strength: 33 },
    { source: 'eu_ai_office',target: 'meta_ai',        edgeType: 'regulation',  tier: 'weak',     strength: 25 },
    { source: 'ftc',         target: 'openai',         edgeType: 'regulation',  tier: 'moderate', strength: 33 },
    { source: 'ftc',         target: 'microsoft',      edgeType: 'regulation',  tier: 'weak',     strength: 27 },
    // ── Event / signal links ─────────────────────────────────────────────────
    { source: 'openai',      target: 'ev-frontier-race' },
    { source: 'anthropic',   target: 'ev-frontier-race' },
    { source: 'google_deepmind', target: 'ev-frontier-race' },
    { source: 'eu_ai_office',target: 'ev-ai-regulation' },
    { source: 'ev-frontier-race',  target: 'sig-model-release' },
    { source: 'nvidia',      target: 'sig-infra-demand' },
    { source: 'aws',         target: 'sig-infra-demand' },
  ],
};

export const mockGraphData: GraphData = {
  nodes: [
    // Entities — with subtypes for richer visual meaning
    { id: "openai",     type: "entity", label: "OpenAI",           subtype: "company",   slug: "openai",          importance: 7 },
    { id: "anthropic",  type: "entity", label: "Anthropic",        subtype: "company",   slug: "anthropic",       importance: 6 },
    { id: "deepmind",   type: "entity", label: "Google DeepMind",  subtype: "company",   slug: "google-deepmind", importance: 5 },
    { id: "nvidia",     type: "entity", label: "NVIDIA",           subtype: "company",   slug: "nvidia",          importance: 5 },
    { id: "a16z",       type: "entity", label: "a16z",             subtype: "investor",  slug: "a16z",            importance: 3 },
    { id: "eu-ai-act",  type: "entity", label: "EU AI Act",        subtype: "regulator", slug: "eu-ai-act",       importance: 3 },

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
