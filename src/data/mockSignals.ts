/**
 * Mock signal dataset — intelligence signals detected across the AI ecosystem.
 * Signals represent meaningful moments of change: model launches, funding rounds,
 * regulatory moves, breakthrough research, etc.
 */

import type { SignalContext } from '@/types/intelligence';

export type { SignalContext };

export type SignalCategory =
  | 'models'
  | 'funding'
  | 'regulation'
  | 'agents'
  | 'research'
  | 'product';

export interface Signal {
  id: string;
  title: string;
  category: SignalCategory;
  /** Canonical entity ID this signal is attributed to */
  entityId: string;
  entityName: string;
  summary: string;
  /** ISO date string */
  date: string;
  /** Confidence score 0–100 */
  confidence: number;
  /** Optional related signal IDs */
  relatedIds?: string[];
  /**
   * Additional entity IDs co-mentioned or implicated in this signal beyond
   * the primary entityId.  Used by the relationship intelligence engine to
   * build entity↔entity edges from signal co-occurrence.
   */
  mentionedEntityIds?: string[];
  /**
   * Precomputed intelligence context (status='ready').
   * Present only when a context row has been generated; undefined otherwise.
   */
  context?: SignalContext | null;
  /**
   * Composite significance score (0–100) computed at write time.
   * Null for signals written before migration 008.
   */
  significanceScore?: number | null;
  /**
   * Number of distinct sources corroborating this signal.
   * Null for signals written before migration 008.
   */
  sourceSupportCount?: number | null;
  /**
   * Momentum activity counts for the signal.
   * Present when computed by batch or detail queries; undefined otherwise.
   */
  momentum?: { recentCount: number; previousCount: number } | null;

  // ── Intelligence layer fields (migration 014) ──────────────────────────────

  /** Plain-language explanation of why this signal matters */
  whyThisMatters?: string | null;
  /** Strategic implications for decision-makers */
  strategicImpact?: string | null;
  /** Target audience / roles most affected */
  whoShouldCare?: string | null;
  /** Forward-looking assessment */
  prediction?: string | null;
}

export const MOCK_SIGNALS: Signal[] = [
  {
    id: 'sig-001',
    title: 'GPT-5 architecture leak signals imminent launch',
    category: 'models',
    entityId: 'openai',
    entityName: 'OpenAI',
    summary:
      'Multiple sources corroborate a 10T-parameter sparse mixture-of-experts design, expected Q2 launch window.',
    date: '2026-03-05',
    confidence: 82,
    relatedIds: ['sig-007'],
    significanceScore: 78,
    sourceSupportCount: 4,
    mentionedEntityIds: ['anthropic', 'google_deepmind'],
  },
  {
    id: 'sig-002',
    title: 'Anthropic raises $3.5B Series E at $30B valuation',
    category: 'funding',
    entityId: 'anthropic',
    entityName: 'Anthropic',
    summary:
      'Round led by Google and Spark Capital. Proceeds earmarked for interpretability research and compute expansion.',
    date: '2026-03-01',
    confidence: 96,
    significanceScore: 92,
    sourceSupportCount: 6,
    mentionedEntityIds: ['google_deepmind'],
  },
  {
    id: 'sig-003',
    title: 'EU AI Act enforcement triggers first compliance audit',
    category: 'regulation',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    summary:
      'European AI Office opens formal review of Gemini Ultra deployment under high-risk AI provisions.',
    date: '2026-02-28',
    confidence: 91,
    significanceScore: 85,
    sourceSupportCount: 5,
    mentionedEntityIds: ['eu_ai_office', 'openai', 'anthropic', 'mistral_ai'],
  },
  {
    id: 'sig-004',
    title: 'Meta AI releases Llama 4 under open-weights licence',
    category: 'models',
    entityId: 'meta_ai',
    entityName: 'Meta AI',
    summary:
      'Llama 4 405B outperforms GPT-4o on MMLU; instruct variant available via Hugging Face immediately.',
    date: '2026-02-25',
    confidence: 99,
    relatedIds: ['sig-009'],
    significanceScore: 88,
    sourceSupportCount: 7,
    mentionedEntityIds: ['openai', 'anthropic'],
  },
  {
    id: 'sig-005',
    title: 'Mistral AI acquires inference startup Nector for €180M',
    category: 'funding',
    entityId: 'mistral_ai',
    entityName: 'Mistral AI',
    summary:
      'Strategic buy secures sovereign cloud inference capacity across EU data-centres ahead of regulation.',
    date: '2026-02-20',
    confidence: 88,
    significanceScore: 72,
    sourceSupportCount: 3,
  },
  {
    id: 'sig-006',
    title: 'xAI Grok-3 beats o3 on ARC-AGI benchmark',
    category: 'research',
    entityId: 'xai',
    entityName: 'xAI',
    summary:
      'Grok-3 scores 94.7% on ARC-AGI, the highest any closed model has reached. Full paper released concurrently.',
    date: '2026-02-18',
    confidence: 95,
    significanceScore: 83,
    sourceSupportCount: 4,
    mentionedEntityIds: ['openai'],
  },
  {
    id: 'sig-007',
    title: 'OpenAI launches o3-mini with 40% cost reduction',
    category: 'product',
    entityId: 'openai',
    entityName: 'OpenAI',
    summary:
      'Reasoning model available via API; targets developer segment displaced by Claude 3.5 Haiku.',
    date: '2026-02-15',
    confidence: 99,
    relatedIds: ['sig-001'],
    significanceScore: 80,
    sourceSupportCount: 5,
    mentionedEntityIds: ['anthropic'],
  },
  {
    id: 'sig-008',
    title: 'Google DeepMind AlphaFold 3 extended to drug design',
    category: 'research',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    summary:
      'New module predicts small-molecule binding with 89% accuracy; partnership with Novartis announced.',
    date: '2026-02-12',
    confidence: 93,
    significanceScore: 76,
    sourceSupportCount: 3,
  },
  {
    id: 'sig-009',
    title: 'Meta AI autonomous agent stack reaches 1M developers',
    category: 'agents',
    entityId: 'meta_ai',
    entityName: 'Meta AI',
    summary:
      'Llama Agents SDK crosses one-million monthly active developers; tightest growth curve since React launch.',
    date: '2026-02-08',
    confidence: 87,
    relatedIds: ['sig-004'],
    significanceScore: 70,
    sourceSupportCount: 3,
  },
  {
    id: 'sig-010',
    title: 'Perplexity AI secures $500M at $8B valuation',
    category: 'funding',
    entityId: 'perplexity',
    entityName: 'Perplexity AI',
    summary:
      'SoftBank Vision Fund 3 leads round; company targets 100M MAU by year-end with Spaces product.',
    date: '2026-02-05',
    confidence: 97,
    significanceScore: 82,
    sourceSupportCount: 5,
    mentionedEntityIds: ['softbank', 'openai', 'google_deepmind'],
  },
  {
    id: 'sig-011',
    title: 'Anthropic Constitutional AI v3 published',
    category: 'research',
    entityId: 'anthropic',
    entityName: 'Anthropic',
    summary:
      'New RLHF variant uses model-written critiques with provable safety bounds; Claude 4 will ship with it.',
    date: '2026-01-30',
    confidence: 90,
    significanceScore: 74,
    sourceSupportCount: 2,
  },
  {
    id: 'sig-012',
    title: 'NVIDIA Blackwell Ultra supply constraint eases',
    category: 'product',
    entityId: 'nvidia',
    entityName: 'NVIDIA',
    summary:
      'TSMC ramp unlocks 30% more B300 wafers per month; hyperscaler allocation resumes normal lead times.',
    date: '2026-01-28',
    confidence: 85,
    significanceScore: 65,
    sourceSupportCount: 3,
    mentionedEntityIds: ['openai', 'anthropic', 'google_deepmind', 'meta_ai'],
  },
  {
    id: 'sig-013',
    title: 'a16z AI fund doubles down as frontier model competition intensifies',
    category: 'funding',
    entityId: 'a16z',
    entityName: 'a16z',
    summary:
      'Andreessen Horowitz commits $1.5B additional capital to AI portfolio including OpenAI, Anthropic competitors, xAI and Mistral AI. Partners cite frontier model race as generational investment opportunity.',
    date: '2026-02-22',
    confidence: 88,
    significanceScore: 74,
    sourceSupportCount: 4,
    mentionedEntityIds: ['openai', 'anthropic', 'xai', 'mistral_ai'],
  },
  {
    id: 'sig-014',
    title: 'Microsoft Azure expands GPU infrastructure for OpenAI partnership',
    category: 'product',
    entityId: 'microsoft',
    entityName: 'Microsoft',
    summary:
      'Microsoft announces $3B expansion of Azure AI infrastructure to support OpenAI model training. New NVIDIA GB200 clusters to be provisioned exclusively for frontier model development.',
    date: '2026-02-10',
    confidence: 91,
    significanceScore: 78,
    sourceSupportCount: 4,
    mentionedEntityIds: ['openai', 'nvidia'],
  },
  {
    id: 'sig-015',
    title: 'EU AI Office expands general-purpose AI model oversight framework',
    category: 'regulation',
    entityId: 'eu_ai_office',
    entityName: 'EU AI Office',
    summary:
      'European AI Office issues binding guidance requiring all GPAI model providers above compute thresholds to file safety evaluations. Affects Meta AI, Mistral AI, Google DeepMind, OpenAI, and Anthropic deployments in the EU.',
    date: '2026-03-10',
    confidence: 94,
    significanceScore: 87,
    sourceSupportCount: 5,
    mentionedEntityIds: ['meta_ai', 'mistral_ai', 'google_deepmind', 'openai', 'anthropic'],
  },
  {
    id: 'sig-016',
    title: 'Google Cloud commits multi-year TPU capacity to Anthropic agreement',
    category: 'funding',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    summary:
      "Google Cloud extends its strategic compute agreement with Anthropic, committing $500M in TPU capacity over three years. Deepens Alphabet's position as Anthropic's primary compute and strategic partner.",
    date: '2026-02-03',
    confidence: 89,
    significanceScore: 80,
    sourceSupportCount: 3,
    mentionedEntityIds: ['anthropic'],
  },
  {
    id: 'sig-017',
    title: 'SoftBank Vision Fund 3 builds concentrated AI infrastructure position',
    category: 'funding',
    entityId: 'softbank',
    entityName: 'SoftBank',
    summary:
      'SoftBank Vision Fund 3 discloses positions across AI consumer and infrastructure plays including Perplexity AI, OpenAI secondary shares, and Cohere enterprise. Total AI allocation exceeds $4B.',
    date: '2026-01-20',
    confidence: 86,
    significanceScore: 71,
    sourceSupportCount: 3,
    mentionedEntityIds: ['perplexity', 'openai', 'cohere'],
  },
  {
    id: 'sig-018',
    title: 'DeepSeek V3 open-source release compresses closed-model pricing across providers',
    category: 'models',
    entityId: 'deepseek',
    entityName: 'DeepSeek',
    summary:
      'DeepSeek V3 open-source release matches GPT-4o performance at near-zero inference cost; OpenAI, Anthropic, and Google DeepMind cut API prices within 72 hours. Mistral AI accelerates open-weights roadmap in response.',
    date: '2026-03-02',
    confidence: 97,
    significanceScore: 91,
    sourceSupportCount: 8,
    mentionedEntityIds: ['openai', 'anthropic', 'google_deepmind', 'mistral_ai', 'meta_ai'],
  },
  {
    id: 'sig-019',
    title: 'AWS commits $4B to Anthropic multi-year compute partnership',
    category: 'funding',
    entityId: 'aws',
    entityName: 'Amazon Web Services',
    summary:
      'Amazon Web Services announces $4B strategic compute commitment to Anthropic spanning Trainium and Inferentia 3 clusters. Agreement mirrors Google Cloud TPU deal and positions AWS as co-primary infrastructure partner.',
    date: '2026-02-18',
    confidence: 95,
    significanceScore: 84,
    sourceSupportCount: 5,
    mentionedEntityIds: ['anthropic', 'nvidia', 'google_deepmind'],
  },
  {
    id: 'sig-020',
    title: 'Sequoia State of AI 2026: frontier model commoditisation accelerating',
    category: 'research',
    entityId: 'sequoia',
    entityName: 'Sequoia Capital',
    summary:
      'Sequoia\'s annual State of AI report identifies DeepSeek-driven commoditisation as the defining trend of 2026. Report benchmarks OpenAI, Anthropic, Google DeepMind, xAI, and Mistral AI; projects gross margin compression across the sector.',
    date: '2026-02-28',
    confidence: 93,
    significanceScore: 78,
    sourceSupportCount: 4,
    mentionedEntityIds: ['openai', 'anthropic', 'google_deepmind', 'xai', 'mistral_ai', 'deepseek'],
  },
  {
    id: 'sig-021',
    title: 'Scale AI raises Series F at $14B valuation as RLHF demand surges',
    category: 'funding',
    entityId: 'scale_ai',
    entityName: 'Scale AI',
    summary:
      'Scale AI closes $1B Series F at $14B valuation citing record RLHF and synthetic data demand from OpenAI, Anthropic, Google DeepMind, and Meta AI. US government defence contracts provide additional revenue floor.',
    date: '2026-02-12',
    confidence: 91,
    significanceScore: 79,
    sourceSupportCount: 5,
    mentionedEntityIds: ['openai', 'anthropic', 'google_deepmind', 'meta_ai'],
  },
  {
    id: 'sig-022',
    title: 'Hugging Face crosses 1 million open models milestone',
    category: 'product',
    entityId: 'hugging_face',
    entityName: 'Hugging Face',
    summary:
      'Hugging Face surpasses one million community models, anchored by Meta AI Llama 4, Mistral, and DeepSeek releases. Platform becomes de facto distribution layer for the open-weights ecosystem, with OpenAI evaluating selective model uploads.',
    date: '2026-02-20',
    confidence: 99,
    significanceScore: 68,
    sourceSupportCount: 4,
    mentionedEntityIds: ['meta_ai', 'mistral_ai', 'deepseek', 'openai'],
  },
  {
    id: 'sig-023',
    title: 'FTC opens investigation into Microsoft–OpenAI and Google–Anthropic cloud AI partnerships',
    category: 'regulation',
    entityId: 'ftc',
    entityName: 'FTC',
    summary:
      'Federal Trade Commission opens parallel antitrust investigations into the structural partnerships between Microsoft and OpenAI, and Google Cloud and Anthropic, on grounds of potential market foreclosure in cloud AI services.',
    date: '2026-02-25',
    confidence: 89,
    significanceScore: 82,
    sourceSupportCount: 5,
    mentionedEntityIds: ['microsoft', 'openai', 'google_deepmind', 'anthropic', 'aws', 'eu_ai_office'],
  },
  {
    id: 'sig-024',
    title: 'Character AI raises $1B Series C led by Google following Noam Shazeer return',
    category: 'funding',
    entityId: 'character_ai',
    entityName: 'Character AI',
    summary:
      'Character AI closes $1B Series C led by Google; Noam Shazeer rejoins as CEO. 20M daily active users and first-party model development signal ambition to compete with Meta AI and OpenAI in the consumer agent layer.',
    date: '2026-02-08',
    confidence: 93,
    significanceScore: 74,
    sourceSupportCount: 4,
    mentionedEntityIds: ['google_deepmind', 'meta_ai', 'openai'],
  },
  {
    id: 'sig-025',
    title: 'Spark Capital confirms Anthropic board seat following Series E co-lead',
    category: 'funding',
    entityId: 'spark_capital',
    entityName: 'Spark Capital',
    summary:
      'Spark Capital secures a board seat at Anthropic following its co-lead role in the $3.5B Series E alongside Google. Positions Spark alongside a16z and SoftBank as the tier-one institutional AI investor group.',
    date: '2026-03-01',
    confidence: 88,
    significanceScore: 66,
    sourceSupportCount: 3,
    mentionedEntityIds: ['anthropic', 'google_deepmind', 'a16z', 'softbank'],
  },
  {
    id: 'sig-026',
    title: 'Apple Intelligence reaches 100M devices with Anthropic Claude integration',
    category: 'product',
    entityId: 'apple',
    entityName: 'Apple',
    summary:
      'Apple Intelligence surpasses 100M active device deployments with on-device and server-side routing to Anthropic Claude for complex Siri tasks. Partnership bypasses OpenAI for privacy-sensitive enterprise workflows; signals a strategic hedge against GPT dependence.',
    date: '2026-03-05',
    confidence: 91,
    significanceScore: 80,
    sourceSupportCount: 5,
    mentionedEntityIds: ['anthropic', 'openai', 'microsoft'],
  },
  {
    id: 'sig-027',
    title: 'DeepSeek R2 reasoning model matches o3 on MATH benchmark at open-source release',
    category: 'models',
    entityId: 'deepseek',
    entityName: 'DeepSeek',
    summary:
      'DeepSeek R2 achieves 95.2% on MATH-500, matching OpenAI o3 performance on mathematical reasoning, and releases weights under MIT licence. Google DeepMind and Anthropic confirm accelerated reasoning roadmaps in response.',
    date: '2026-03-08',
    confidence: 94,
    significanceScore: 88,
    sourceSupportCount: 6,
    mentionedEntityIds: ['openai', 'google_deepmind', 'anthropic', 'xai', 'meta_ai'],
  },
];

export function getSignalById(id: string): Signal | undefined {
  return MOCK_SIGNALS.find((s) => s.id === id);
}

export function getSignalsByEntity(entityId: string): Signal[] {
  return MOCK_SIGNALS.filter((s) => s.entityId === entityId);
}

export function getSignalsByCategory(category: SignalCategory): Signal[] {
  return MOCK_SIGNALS.filter((s) => s.category === category);
}

export default MOCK_SIGNALS;
