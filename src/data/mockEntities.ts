/**
 * Mock entity intelligence profiles — enriched snapshots of AI ecosystem actors.
 * Combines static company data with live-ish intelligence metrics (signal counts,
 * risk levels, etc.) for use in entity queries and comparison views.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface EntityProfile {
  /** Matches the canonical company/entity id */
  id: string;
  name: string;
  sector: string;
  country: string;
  founded: number;
  website: string;
  /** Total signals attributed to this entity in the platform */
  signalCount: number;
  /** Events in the last 30 days */
  eventCount30d: number;
  /** Most recent signal title */
  latestSignal: string;
  /** Most recent event date */
  lastEventDate: string;
  /** Aggregated intelligence risk level */
  riskLevel: RiskLevel;
  /** Brief strategic intelligence summary */
  summary: string;
  /** Market position tags */
  tags: string[];
  /** Estimated ARR or funding total, human-readable */
  financialScale?: string;
}

export const MOCK_ENTITIES: EntityProfile[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    sector: 'Foundation Models',
    country: 'US',
    founded: 2015,
    website: 'https://openai.com',
    signalCount: 7,
    eventCount30d: 4,
    latestSignal: 'GPT-5 architecture leak signals imminent launch',
    lastEventDate: '2026-03-05',
    riskLevel: 'medium',
    summary:
      'Dominant in consumer AI with ChatGPT; API business under margin pressure from open-weight competitors. GPT-5 launch imminent.',
    tags: ['LLM', 'API', 'Enterprise', 'Consumer'],
    financialScale: '$5B ARR',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    sector: 'Foundation Models',
    country: 'US',
    founded: 2021,
    website: 'https://anthropic.com',
    signalCount: 5,
    eventCount30d: 3,
    latestSignal: 'Anthropic raises $3.5B Series E at $30B valuation',
    lastEventDate: '2026-03-01',
    riskLevel: 'low',
    summary:
      'Best-in-class safety posture and enterprise traction. Constitutional AI v3 differentiates on compliance. Well-funded through 2027.',
    tags: ['LLM', 'Safety', 'Enterprise', 'Research'],
    financialScale: '$1.3B ARR',
  },
  {
    id: 'google_deepmind',
    name: 'Google DeepMind',
    sector: 'Foundation Models',
    country: 'GB',
    founded: 2023,
    website: 'https://deepmind.google',
    signalCount: 6,
    eventCount30d: 3,
    latestSignal: 'EU AI Office opens Gemini compliance review',
    lastEventDate: '2026-02-28',
    riskLevel: 'medium',
    summary:
      'Regulatory headwinds in EU from Gemini compliance review. Gemini 2.0 gaining enterprise share; AlphaFold 3 breakthrough in life sciences.',
    tags: ['LLM', 'Research', 'Multimodal', 'Life Sciences'],
    financialScale: 'Alphabet subsidiary',
  },
  {
    id: 'meta_ai',
    name: 'Meta AI',
    sector: 'Foundation Models',
    country: 'US',
    founded: 2023,
    website: 'https://ai.meta.com',
    signalCount: 4,
    eventCount30d: 2,
    latestSignal: 'Meta AI releases Llama 4 under open-weights licence',
    lastEventDate: '2026-02-25',
    riskLevel: 'low',
    summary:
      'Open-weights strategy with Llama 4 is commoditising model access; Agents SDK traction signals platform ambitions.',
    tags: ['Open Weights', 'LLM', 'Agents', 'Developer'],
    financialScale: 'Meta P&L (~$170B revenue)',
  },
  {
    id: 'mistral_ai',
    name: 'Mistral AI',
    sector: 'Foundation Models',
    country: 'FR',
    founded: 2023,
    website: 'https://mistral.ai',
    signalCount: 4,
    eventCount30d: 2,
    latestSignal: 'Mistral AI acquires inference startup Nector for €180M',
    lastEventDate: '2026-02-20',
    riskLevel: 'low',
    summary:
      'European sovereign AI champion. Nector acquisition locks in EU inference capacity ahead of AI Act requirements. Mistral Large 3 competitive on coding.',
    tags: ['LLM', 'Sovereign', 'European', 'Open Weights'],
    financialScale: '€1B+ raised',
  },
  {
    id: 'xai',
    name: 'xAI',
    sector: 'Foundation Models',
    country: 'US',
    founded: 2023,
    website: 'https://x.ai',
    signalCount: 3,
    eventCount30d: 1,
    latestSignal: 'xAI Grok-3 beats o3 on ARC-AGI benchmark',
    lastEventDate: '2026-02-18',
    riskLevel: 'medium',
    summary:
      'Grok-3 ARC-AGI result marks inflection point. X platform distribution is unique moat; governance concerns persist.',
    tags: ['LLM', 'Research', 'Social', 'Reasoning'],
    financialScale: '$6B raised',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    sector: 'Applied AI',
    country: 'US',
    founded: 2022,
    website: 'https://perplexity.ai',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Perplexity AI secures $500M at $8B valuation',
    lastEventDate: '2026-02-05',
    riskLevel: 'medium',
    summary:
      'Answer-engine with strong user growth; $500M round extends runway. Valuation rich relative to revenue; depends on search UX moat.',
    tags: ['Search', 'Consumer', 'Answer Engine'],
    financialScale: '$500M raised to date',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    sector: 'Semiconductors',
    country: 'US',
    founded: 1993,
    website: 'https://nvidia.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'NVIDIA Blackwell Ultra supply constraint eases',
    lastEventDate: '2026-01-28',
    riskLevel: 'low',
    summary:
      'GPU monopoly intact; Blackwell ramp normalising. Customers hedging with AMD MI300X but CUDA moat is durable.',
    tags: ['Semiconductors', 'GPU', 'Infrastructure', 'CUDA'],
    financialScale: '$130B revenue (FY2026E)',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    sector: 'Foundation Models',
    country: 'CA',
    founded: 2019,
    website: 'https://cohere.com',
    signalCount: 1,
    eventCount30d: 1,
    latestSignal: 'Cohere Series D — $500M',
    lastEventDate: '2026-01-15',
    riskLevel: 'low',
    summary:
      'Enterprise NLP specialist with strong search and retrieval product. $500M round funds APAC expansion; B2B focus insulates from consumer volatility.',
    tags: ['Enterprise', 'NLP', 'Retrieval', 'B2B'],
    financialScale: '$270M ARR',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    sector: 'Enterprise Software',
    country: 'US',
    founded: 1975,
    website: 'https://microsoft.com',
    signalCount: 1,
    eventCount30d: 1,
    latestSignal: 'Microsoft Azure expands GPU infrastructure for OpenAI partnership',
    lastEventDate: '2026-02-10',
    riskLevel: 'low',
    summary:
      'Copilot integration across Microsoft 365 is the highest-distribution AI product on earth. OpenAI partnership provides frontier model access; Azure AI infrastructure commitment deepens.',
    tags: ['Enterprise', 'Copilot', 'Cloud', 'Azure'],
    financialScale: '$245B revenue (FY2026E)',
  },
  {
    id: 'eu_ai_office',
    name: 'EU AI Office',
    sector: 'AI Regulation',
    country: 'BE',
    founded: 2024,
    website: 'https://digital-strategy.ec.europa.eu/en/policies/ai-office',
    signalCount: 3,
    eventCount30d: 2,
    latestSignal: 'EU AI Office expands general-purpose AI model oversight framework',
    lastEventDate: '2026-03-10',
    riskLevel: 'medium',
    summary:
      'European Commission body responsible for enforcing the EU AI Act. Oversees general-purpose AI models and coordinates with national authorities. First formal enforcement actions initiated in 2026.',
    tags: ['Regulator', 'EU', 'Policy', 'Compliance', 'GPAI'],
    financialScale: 'EU regulatory body',
  },
  {
    id: 'a16z',
    name: 'a16z',
    sector: 'Venture Capital',
    country: 'US',
    founded: 2009,
    website: 'https://a16z.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'a16z AI fund doubles down as frontier model competition intensifies',
    lastEventDate: '2026-02-22',
    riskLevel: 'low',
    summary:
      'Andreessen Horowitz is the most active AI investor across frontier models and applied AI infrastructure. AI fund concentration across OpenAI competitors, xAI, and Mistral AI positions them across multiple winning scenarios.',
    tags: ['Investor', 'Venture Capital', 'AI Fund', 'Frontier Models'],
    financialScale: '$7.2B AI fund',
  },
  {
    id: 'softbank',
    name: 'SoftBank',
    sector: 'Investment Fund',
    country: 'JP',
    founded: 1981,
    website: 'https://softbank.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'SoftBank Vision Fund 3 builds concentrated AI infrastructure position',
    lastEventDate: '2026-02-05',
    riskLevel: 'medium',
    summary:
      'SoftBank Vision Fund 3 is deploying capital across AI consumer apps and infrastructure. Led the Perplexity AI Series D; secondary positions in OpenAI; enterprise AI via Cohere.',
    tags: ['Investor', 'Vision Fund', 'AI Infrastructure', 'Consumer AI'],
    financialScale: '$4B+ AI allocation',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    sector: 'Foundation Models',
    country: 'CN',
    founded: 2023,
    website: 'https://deepseek.com',
    signalCount: 4,
    eventCount30d: 2,
    latestSignal: 'DeepSeek V3 open-source release triggers pricing war across API providers',
    lastEventDate: '2026-03-02',
    riskLevel: 'medium',
    summary:
      'Chinese frontier model lab delivering performance competitive with GPT-4o at a fraction of reported training cost. DeepSeek V3 and R1 open-source releases are commoditising reasoning model access globally.',
    tags: ['LLM', 'Open Weights', 'Reasoning', 'China', 'Cost-Efficient'],
    financialScale: 'High Flyer subsidiary',
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    sector: 'Cloud Infrastructure',
    country: 'US',
    founded: 2006,
    website: 'https://aws.amazon.com',
    signalCount: 3,
    eventCount30d: 2,
    latestSignal: 'AWS commits $4B to Anthropic compute partnership',
    lastEventDate: '2026-02-18',
    riskLevel: 'low',
    summary:
      'AWS anchors the AI infrastructure layer with Trainium and Inferentia chips plus Bedrock model hosting. $4B commitment to Anthropic and Bedrock catalogue spanning Meta, Mistral, and Cohere makes AWS the dominant multi-model cloud.',
    tags: ['Cloud', 'Infrastructure', 'Bedrock', 'Trainium', 'Enterprise'],
    financialScale: '$105B revenue (FY2025)',
  },
  {
    id: 'sequoia',
    name: 'Sequoia Capital',
    sector: 'Venture Capital',
    country: 'US',
    founded: 1972,
    website: 'https://sequoiacap.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Sequoia State of AI 2026 benchmarks frontier labs and warns of margin compression',
    lastEventDate: '2026-02-28',
    riskLevel: 'low',
    summary:
      'Sequoia Capital publishes the influential State of AI report and has positions across frontier model labs and AI infrastructure. Strong conviction in the application layer as model commoditisation accelerates.',
    tags: ['Investor', 'Venture Capital', 'AI Report', 'Application Layer'],
    financialScale: '$85B AUM',
  },
  {
    id: 'spark_capital',
    name: 'Spark Capital',
    sector: 'Venture Capital',
    country: 'US',
    founded: 2005,
    website: 'https://sparkcapital.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Spark Capital confirms Anthropic board position following Series E',
    lastEventDate: '2026-03-01',
    riskLevel: 'low',
    summary:
      'Spark Capital is a lead investor in Anthropic across multiple rounds, securing a board seat in the Series E. Portfolio also includes applied AI companies across the developer tooling and infrastructure layers.',
    tags: ['Investor', 'Venture Capital', 'Anthropic', 'Developer Tools'],
    financialScale: '$3.2B AUM',
  },
  {
    id: 'scale_ai',
    name: 'Scale AI',
    sector: 'AI Infrastructure',
    country: 'US',
    founded: 2016,
    website: 'https://scale.com',
    signalCount: 3,
    eventCount30d: 2,
    latestSignal: 'Scale AI raises Series F at $14B valuation as RLHF demand surges',
    lastEventDate: '2026-02-12',
    riskLevel: 'low',
    summary:
      'Scale AI is the dominant data-labelling and RLHF platform for frontier model development. Customer base spans OpenAI, Anthropic, Google DeepMind, Meta AI, and government defence agencies — making it structurally critical to the entire AI ecosystem.',
    tags: ['Data', 'RLHF', 'Infrastructure', 'Government', 'Defence'],
    financialScale: '$14B valuation',
  },
  {
    id: 'hugging_face',
    name: 'Hugging Face',
    sector: 'AI Developer Platform',
    country: 'US',
    founded: 2016,
    website: 'https://huggingface.co',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Hugging Face passes 1 million open models milestone',
    lastEventDate: '2026-02-20',
    riskLevel: 'low',
    summary:
      'Hugging Face is the central open-source AI platform with over one million community models. Indispensable infrastructure for the open-weights ecosystem — Meta Llama, Mistral, and DeepSeek models all depend on its distribution.',
    tags: ['Open Source', 'Developer Platform', 'Model Hub', 'Community'],
    financialScale: '$4.5B valuation',
  },
  {
    id: 'character_ai',
    name: 'Character AI',
    sector: 'Applied AI',
    country: 'US',
    founded: 2021,
    website: 'https://character.ai',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Character AI raises $1B Series C led by Google after Noam Shazeer return',
    lastEventDate: '2026-02-08',
    riskLevel: 'medium',
    summary:
      'Character AI is the leading consumer AI persona platform with 20M+ daily active users. $1B Series C led by Google followed Noam Shazeer\'s return. Potential acquisition interest from multiple frontier labs.',
    tags: ['Consumer AI', 'Personas', 'Chat', 'Google-backed'],
    financialScale: '$1B raised',
  },
  {
    id: 'ftc',
    name: 'FTC',
    sector: 'AI Regulation',
    country: 'US',
    founded: 1914,
    website: 'https://ftc.gov',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'FTC opens AI market concentration investigation targeting cloud-model partnerships',
    lastEventDate: '2026-02-25',
    riskLevel: 'high',
    summary:
      'Federal Trade Commission is scrutinising AI market concentration, focusing on the strategic partnerships between cloud hyperscalers and frontier model labs — specifically Microsoft–OpenAI and Google–Anthropic. Merger review powers could impact future consolidation.',
    tags: ['Regulator', 'US', 'Antitrust', 'Competition', 'Cloud Partnerships'],
    financialScale: 'US regulatory body',
  },
  {
    id: 'apple',
    name: 'Apple',
    sector: 'Consumer Technology',
    country: 'US',
    founded: 1976,
    website: 'https://apple.com',
    signalCount: 2,
    eventCount30d: 1,
    latestSignal: 'Apple Intelligence expands to 100M devices with Claude integration',
    lastEventDate: '2026-03-05',
    riskLevel: 'low',
    summary:
      'Apple Intelligence is the largest-distribution on-device AI deployment on earth, reaching 100M+ devices. Strategic partnership with Anthropic for Claude integration in Siri represents a material revenue opportunity for Anthropic and a key competitive signal for the consumer AI race.',
    tags: ['Consumer', 'On-Device AI', 'Siri', 'Enterprise', 'Privacy'],
    financialScale: '$391B revenue (FY2025)',
  },
];

export function getEntityById(id: string): EntityProfile | undefined {
  return MOCK_ENTITIES.find((e) => e.id === id);
}

/**
 * Fuzzy-resolve an entity by name or id.
 * Checks id, name (case-insensitive), and simple partial match.
 */
export function resolveEntity(query: string): EntityProfile | undefined {
  const q = query.toLowerCase().trim();
  return MOCK_ENTITIES.find(
    (e) =>
      e.id === q ||
      e.name.toLowerCase() === q ||
      e.name.toLowerCase().includes(q) ||
      e.id.includes(q)
  );
}

export function getTopEntities(n = 5): EntityProfile[] {
  return [...MOCK_ENTITIES].sort((a, b) => b.signalCount - a.signalCount).slice(0, n);
}

export default MOCK_ENTITIES;
