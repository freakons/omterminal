/**
 * Mock event dataset — discrete, timestamped events in the AI ecosystem.
 * Events are more factual / confirmed than signals; they represent things
 * that have definitively happened (a product shipped, a deal closed, etc.).
 */

export type EventType =
  | 'funding'
  | 'launch'
  | 'announcement'
  | 'regulation'
  | 'acquisition'
  | 'partnership'
  | 'research';

export interface AiEvent {
  id: string;
  type: EventType;
  /** Canonical entity ID this event is attributed to */
  entityId: string;
  entityName: string;
  title: string;
  description: string;
  /** ISO date string */
  date: string;
  /** Optional dollar/euro amount (e.g. "$3.5B", "€180M") */
  amount?: string;
  /** Related signal IDs */
  signalIds?: string[];
}

export const MOCK_EVENTS: AiEvent[] = [
  {
    id: 'evt-001',
    type: 'funding',
    entityId: 'anthropic',
    entityName: 'Anthropic',
    title: 'Anthropic Series E — $3.5B',
    description: 'Google and Spark Capital lead $3.5B round at a $30B post-money valuation.',
    date: '2026-03-01',
    amount: '$3.5B',
    signalIds: ['sig-002'],
  },
  {
    id: 'evt-002',
    type: 'launch',
    entityId: 'openai',
    entityName: 'OpenAI',
    title: 'OpenAI o3-mini general availability',
    description: 'Reasoning model released to all API tiers; 40% cheaper than o3 full.',
    date: '2026-02-15',
    signalIds: ['sig-007'],
  },
  {
    id: 'evt-003',
    type: 'regulation',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    title: 'EU AI Office opens Gemini compliance review',
    description:
      'First formal enforcement action under the EU AI Act targets Gemini Ultra high-risk classification.',
    date: '2026-02-28',
    signalIds: ['sig-003'],
  },
  {
    id: 'evt-004',
    type: 'launch',
    entityId: 'meta_ai',
    entityName: 'Meta AI',
    title: 'Llama 4 open-weights release',
    description: '405B parameter model with commercial licence published on Hugging Face.',
    date: '2026-02-25',
    signalIds: ['sig-004'],
  },
  {
    id: 'evt-005',
    type: 'acquisition',
    entityId: 'mistral_ai',
    entityName: 'Mistral AI',
    title: 'Mistral acquires Nector',
    description: 'EU inference infrastructure startup acquired for €180M to secure sovereign cloud capacity.',
    date: '2026-02-20',
    amount: '€180M',
    signalIds: ['sig-005'],
  },
  {
    id: 'evt-006',
    type: 'research',
    entityId: 'xai',
    entityName: 'xAI',
    title: 'Grok-3 ARC-AGI benchmark result',
    description: 'Grok-3 achieves 94.7% on ARC-AGI; full technical paper published concurrently.',
    date: '2026-02-18',
    signalIds: ['sig-006'],
  },
  {
    id: 'evt-007',
    type: 'partnership',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    title: 'DeepMind × Novartis drug-design partnership',
    description:
      'AlphaFold 3 drug-design module licenced exclusively to Novartis for oncology pipeline.',
    date: '2026-02-12',
    signalIds: ['sig-008'],
  },
  {
    id: 'evt-008',
    type: 'funding',
    entityId: 'perplexity',
    entityName: 'Perplexity AI',
    title: 'Perplexity AI Series D — $500M',
    description: 'SoftBank Vision Fund 3 leads at $8B valuation; 100M MAU target set.',
    date: '2026-02-05',
    amount: '$500M',
    signalIds: ['sig-010'],
  },
  {
    id: 'evt-009',
    type: 'announcement',
    entityId: 'meta_ai',
    entityName: 'Meta AI',
    title: 'Llama Agents SDK hits 1M developers',
    description: 'Meta reports 1M monthly active developers on its open-source agent platform.',
    date: '2026-02-08',
    signalIds: ['sig-009'],
  },
  {
    id: 'evt-010',
    type: 'research',
    entityId: 'anthropic',
    entityName: 'Anthropic',
    title: 'Constitutional AI v3 paper published',
    description:
      'Interpretability-grounded RLHF variant with provable safety bounds, targeting Claude 4.',
    date: '2026-01-30',
    signalIds: ['sig-011'],
  },
  {
    id: 'evt-011',
    type: 'announcement',
    entityId: 'nvidia',
    entityName: 'NVIDIA',
    title: 'Blackwell Ultra supply normalises',
    description: 'TSMC ramp increases B300 wafer output 30%; hyperscaler lead times return to normal.',
    date: '2026-01-28',
    signalIds: ['sig-012'],
  },
  {
    id: 'evt-012',
    type: 'launch',
    entityId: 'mistral_ai',
    entityName: 'Mistral AI',
    title: 'Mistral Large 3 released',
    description:
      'Latest flagship model matches GPT-4o on coding benchmarks; EU-hosted inference default.',
    date: '2026-01-22',
  },
  {
    id: 'evt-013',
    type: 'funding',
    entityId: 'cohere',
    entityName: 'Cohere',
    title: 'Cohere Series D — $500M',
    description: 'Enterprise AI platform raises $500M, valuation undisclosed; APAC expansion confirmed.',
    date: '2026-01-15',
    amount: '$500M',
  },
  {
    id: 'evt-014',
    type: 'launch',
    entityId: 'openai',
    entityName: 'OpenAI',
    title: 'ChatGPT Enterprise hits 2M paid seats',
    description: 'OpenAI reports 2M paid enterprise seats, double the figure reported six months prior.',
    date: '2026-01-10',
  },
  {
    id: 'evt-015',
    type: 'regulation',
    entityId: 'openai',
    entityName: 'OpenAI',
    title: 'US Senate AI Safety Act introduced',
    description:
      'Bipartisan bill proposes mandatory third-party audits for frontier AI systems; OpenAI engaged.',
    date: '2026-01-08',
  },
  {
    id: 'evt-016',
    type: 'funding',
    entityId: 'a16z',
    entityName: 'a16z',
    title: 'a16z AI Fund — $1.5B follow-on commitment',
    description:
      'Andreessen Horowitz commits additional $1.5B to AI portfolio; positions span frontier model labs and applied AI infrastructure.',
    date: '2026-02-22',
    amount: '$1.5B',
    signalIds: ['sig-013'],
  },
  {
    id: 'evt-017',
    type: 'regulation',
    entityId: 'eu_ai_office',
    entityName: 'EU AI Office',
    title: 'EU AI Office GPAI model oversight framework published',
    description:
      'Binding guidance requiring all general-purpose AI model providers above compute thresholds to submit safety evaluations and incident reports.',
    date: '2026-03-10',
    signalIds: ['sig-015'],
  },
  {
    id: 'evt-018',
    type: 'funding',
    entityId: 'softbank',
    entityName: 'SoftBank',
    title: 'SoftBank Vision Fund 3 AI portfolio disclosure',
    description:
      'SoftBank discloses $4B+ concentration across AI consumer and infrastructure plays including Perplexity AI, OpenAI secondary, and Cohere.',
    date: '2026-01-20',
    amount: '$4B+',
    signalIds: ['sig-017'],
  },
  {
    id: 'evt-019',
    type: 'partnership',
    entityId: 'google_deepmind',
    entityName: 'Google DeepMind',
    title: 'Google Cloud × Anthropic multi-year compute agreement extended',
    description:
      "Google Cloud extends strategic TPU capacity commitment to Anthropic; $500M over three years deepens Alphabet's position as Anthropic's primary infrastructure partner.",
    date: '2026-02-03',
    amount: '$500M',
    signalIds: ['sig-016'],
  },
  {
    id: 'evt-020',
    type: 'launch',
    entityId: 'deepseek',
    entityName: 'DeepSeek',
    title: 'DeepSeek V3 open-source release',
    description:
      'DeepSeek V3 open-weights model released under MIT licence; matches GPT-4o on key benchmarks at fraction of reported training cost.',
    date: '2026-03-02',
    signalIds: ['sig-018'],
  },
  {
    id: 'evt-021',
    type: 'partnership',
    entityId: 'aws',
    entityName: 'Amazon Web Services',
    title: 'AWS × Anthropic $4B compute partnership',
    description:
      'Amazon Web Services commits $4B to Anthropic spanning Trainium 3 and Inferentia clusters; Anthropic becomes primary anchor tenant on AWS AI infrastructure.',
    date: '2026-02-18',
    amount: '$4B',
    signalIds: ['sig-019'],
  },
  {
    id: 'evt-022',
    type: 'research',
    entityId: 'sequoia',
    entityName: 'Sequoia Capital',
    title: 'Sequoia State of AI 2026 report published',
    description:
      'Annual report identifies frontier model commoditisation as the defining 2026 AI trend; warns of gross margin compression across frontier labs.',
    date: '2026-02-28',
    signalIds: ['sig-020'],
  },
  {
    id: 'evt-023',
    type: 'funding',
    entityId: 'scale_ai',
    entityName: 'Scale AI',
    title: 'Scale AI Series F — $1B at $14B valuation',
    description:
      'Scale AI raises $1B led by Accel at $14B valuation; RLHF and synthetic data demand from all major frontier labs drives round.',
    date: '2026-02-12',
    amount: '$1B',
    signalIds: ['sig-021'],
  },
  {
    id: 'evt-024',
    type: 'announcement',
    entityId: 'hugging_face',
    entityName: 'Hugging Face',
    title: 'Hugging Face 1M open models milestone',
    description:
      'Platform crosses one million community-hosted models, anchored by Llama 4, Mistral, and DeepSeek releases.',
    date: '2026-02-20',
    signalIds: ['sig-022'],
  },
  {
    id: 'evt-025',
    type: 'regulation',
    entityId: 'ftc',
    entityName: 'FTC',
    title: 'FTC opens dual AI antitrust investigation',
    description:
      'Federal Trade Commission opens parallel investigations into Microsoft–OpenAI and Google Cloud–Anthropic partnerships for potential competition law violations.',
    date: '2026-02-25',
    signalIds: ['sig-023'],
  },
  {
    id: 'evt-026',
    type: 'funding',
    entityId: 'character_ai',
    entityName: 'Character AI',
    title: 'Character AI Series C — $1B led by Google',
    description:
      'Character AI closes $1B round led by Google; Noam Shazeer returns as CEO; company launches first-party model development programme.',
    date: '2026-02-08',
    amount: '$1B',
    signalIds: ['sig-024'],
  },
  {
    id: 'evt-027',
    type: 'funding',
    entityId: 'spark_capital',
    entityName: 'Spark Capital',
    title: 'Spark Capital joins Anthropic board following Series E co-lead',
    description:
      'Spark Capital secures board representation at Anthropic after co-leading the $3.5B Series E alongside Google.',
    date: '2026-03-01',
    signalIds: ['sig-025'],
  },
  {
    id: 'evt-028',
    type: 'launch',
    entityId: 'apple',
    entityName: 'Apple',
    title: 'Apple Intelligence reaches 100M devices with Claude integration',
    description:
      'Apple Intelligence surpasses 100M active devices with Anthropic Claude powering complex Siri server-side tasks; deepens Apple–Anthropic strategic partnership.',
    date: '2026-03-05',
    signalIds: ['sig-026'],
  },
  {
    id: 'evt-029',
    type: 'launch',
    entityId: 'deepseek',
    entityName: 'DeepSeek',
    title: 'DeepSeek R2 open-source reasoning model released',
    description:
      'DeepSeek R2 matches OpenAI o3 on MATH-500; released under MIT licence, forcing accelerated roadmap responses from Google DeepMind and Anthropic.',
    date: '2026-03-08',
    signalIds: ['sig-027'],
  },
];

export function getEventById(id: string): AiEvent | undefined {
  return MOCK_EVENTS.find((e) => e.id === id);
}

export function getEventsByEntity(entityId: string): AiEvent[] {
  return MOCK_EVENTS.filter((e) => e.entityId === entityId);
}

export function getEventsByType(type: EventType): AiEvent[] {
  return MOCK_EVENTS.filter((e) => e.type === type);
}

/** Events in the last N days from a reference date (defaults to today) */
export function getRecentEvents(days: number, referenceDate = new Date()): AiEvent[] {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - days);
  return MOCK_EVENTS.filter((e) => new Date(e.date) >= cutoff);
}

export default MOCK_EVENTS;
