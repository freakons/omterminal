/**
 * Omterminal — Company Entity Registry
 *
 * Canonical list of AI companies tracked by the intelligence platform.
 * Used to normalise company names across ingested articles and events,
 * and to power entity linking in the intelligence pipeline.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type definition
// ─────────────────────────────────────────────────────────────────────────────

export type CompanyEntitySector =
  | 'foundation_models'
  | 'applied_ai'
  | 'ai_infrastructure'
  | 'semiconductors'
  | 'robotics'
  | 'enterprise_software'
  | 'consumer'
  | 'ai_safety'
  | 'research_lab'
  | 'data_platforms'
  | 'cloud_platforms'
  | 'policy_standards'
  | 'other';

export interface CompanyEntity {
  /** Stable machine-friendly identifier */
  id: string;
  /** Canonical company name used for normalisation */
  name: string;
  /** Headquarters country (ISO 3166-1 alpha-2 or named region) */
  country: string;
  /** Primary industry sector */
  sector: CompanyEntitySector;
  /** Company website */
  website: string;
  /** Known aliases used in news coverage (for entity resolution) */
  aliases?: string[];
  /** Stock ticker if publicly traded */
  ticker?: string;
  /** Year founded */
  founded?: number;
  /** Short description of the company's focus */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Company Registry
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANIES: CompanyEntity[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://openai.com',
    aliases: ['Open AI', 'OpenAI Inc', 'OpenAI Inc.'],
    founded: 2015,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://anthropic.com',
    aliases: ['Anthropic AI', 'Anthropic PBC'],
    founded: 2021,
  },
  {
    id: 'google_deepmind',
    name: 'Google DeepMind',
    country: 'GB',
    sector: 'foundation_models',
    website: 'https://deepmind.google',
    aliases: ['DeepMind', 'Google Brain', 'Google AI', 'Alphabet AI'],
    ticker: 'GOOGL',
    founded: 2023,
  },
  {
    id: 'meta_ai',
    name: 'Meta AI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://ai.meta.com',
    aliases: ['Meta Platforms AI', 'Facebook AI Research', 'Meta Platforms', 'Meta'],
    ticker: 'META',
    founded: 2023,
  },
  {
    id: 'mistral_ai',
    name: 'Mistral AI',
    country: 'FR',
    sector: 'foundation_models',
    website: 'https://mistral.ai',
    aliases: ['Mistral', 'MistralAI'],
    founded: 2023,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    country: 'CA',
    sector: 'foundation_models',
    website: 'https://cohere.com',
    aliases: ['Cohere AI', 'Cohere Inc'],
    founded: 2019,
  },
  {
    id: 'stability_ai',
    name: 'Stability AI',
    country: 'GB',
    sector: 'foundation_models',
    website: 'https://stability.ai',
    aliases: ['StabilityAI', 'Stability'],
    founded: 2020,
  },
  {
    id: 'xai',
    name: 'xAI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://x.ai',
    aliases: ['Elon Musk AI', 'X AI', 'x.ai'],
    founded: 2023,
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    country: 'US',
    sector: 'applied_ai',
    website: 'https://perplexity.ai',
    aliases: ['Perplexity'],
    founded: 2022,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    country: 'US',
    sector: 'semiconductors',
    website: 'https://nvidia.com',
    aliases: ['Nvidia', 'NVDA'],
    ticker: 'NVDA',
    founded: 1993,
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    country: 'US',
    sector: 'enterprise_software',
    website: 'https://microsoft.com',
    aliases: ['Microsoft Corp', 'Microsoft Corporation', 'MSFT'],
    ticker: 'MSFT',
    founded: 1975,
  },
  {
    id: 'amazon',
    name: 'Amazon',
    country: 'US',
    sector: 'enterprise_software',
    website: 'https://aws.amazon.com',
    aliases: ['Amazon Web Services', 'AWS', 'Amazon AI'],
    ticker: 'AMZN',
    founded: 1994,
  },
  {
    id: 'apple',
    name: 'Apple',
    country: 'US',
    sector: 'consumer',
    website: 'https://apple.com',
    aliases: ['Apple Inc', 'Apple Intelligence'],
    ticker: 'AAPL',
    founded: 1976,
  },
  {
    id: 'samsung',
    name: 'Samsung',
    country: 'KR',
    sector: 'semiconductors',
    website: 'https://samsung.com',
    aliases: ['Samsung Electronics', 'Samsung AI'],
    founded: 1938,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://deepseek.com',
    aliases: ['Deep Seek', 'DeepSeek AI'],
    founded: 2023,
  },
  {
    id: 'baidu',
    name: 'Baidu',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://baidu.com',
    aliases: ['Baidu AI', 'Baidu Inc'],
    founded: 2000,
  },
  {
    id: 'scale_ai',
    name: 'Scale AI',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://scale.com',
    aliases: ['Scale'],
    founded: 2016,
  },
  {
    id: 'hugging_face',
    name: 'Hugging Face',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://huggingface.co',
    aliases: ['HuggingFace', 'Hugging Face Inc'],
    founded: 2016,
  },
  {
    id: 'together_ai',
    name: 'Together AI',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://together.ai',
    aliases: ['Together'],
    founded: 2022,
  },
  {
    id: 'inflection_ai',
    name: 'Inflection AI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://inflection.ai',
    aliases: ['Inflection'],
    founded: 2022,
  },
  {
    id: 'databricks',
    name: 'Databricks',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://databricks.com',
    aliases: ['Databricks Inc', 'Mosaic ML', 'MosaicML'],
    founded: 2013,
  },
  {
    id: 'ai21_labs',
    name: 'AI21 Labs',
    country: 'IL',
    sector: 'foundation_models',
    website: 'https://ai21.com',
    aliases: ['AI21', 'AI21Labs'],
    founded: 2017,
  },
  {
    id: 'character_ai',
    name: 'Character.AI',
    country: 'US',
    sector: 'consumer',
    website: 'https://character.ai',
    aliases: ['Character AI', 'CharacterAI'],
    founded: 2021,
  },
  {
    id: 'runway',
    name: 'Runway',
    country: 'US',
    sector: 'applied_ai',
    website: 'https://runwayml.com',
    aliases: ['Runway ML', 'RunwayML'],
    founded: 2018,
    description: 'Creative AI platform specialising in video generation and editing tools.',
  },

  // ── Foundation Model Companies (additional) ─────────────────────────────────

  {
    id: 'aleph_alpha',
    name: 'Aleph Alpha',
    country: 'DE',
    sector: 'foundation_models',
    website: 'https://aleph-alpha.com',
    aliases: ['AlephAlpha', 'Aleph-Alpha'],
    founded: 2019,
    description: 'European enterprise AI company developing the Luminous model series and AI stack.',
  },
  {
    id: 'zhipu_ai',
    name: 'Zhipu AI',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://zhipuai.cn',
    aliases: ['ZhipuAI', 'GLM', 'ChatGLM', 'Zhipu'],
    founded: 2019,
    description: 'Chinese AI lab behind the GLM and ChatGLM large language models.',
  },
  {
    id: 'moonshot_ai',
    name: 'Moonshot AI',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://moonshot.cn',
    aliases: ['Kimi', 'Kimi AI', 'MoonshotAI'],
    founded: 2023,
    description: 'Chinese AI startup developing Kimi, a long-context multimodal language model.',
  },
  {
    id: 'zero_one_ai',
    name: '01.AI',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://01.ai',
    aliases: ['01 AI', 'Yi', 'Yi Labs', 'Zero One AI'],
    founded: 2023,
    description: 'AI startup founded by Kai-Fu Lee, developing the Yi series of open-weight models.',
  },
  {
    id: 'writer_ai',
    name: 'Writer AI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://writer.com',
    aliases: ['Writer'],
    founded: 2020,
    description: 'Enterprise AI platform with proprietary LLMs tailored for business workflows.',
  },
  {
    id: 'adept_ai',
    name: 'Adept AI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://adept.ai',
    aliases: ['Adept'],
    founded: 2022,
    description: 'AI research company building action models that operate software on behalf of users.',
  },
  {
    id: 'reka_ai',
    name: 'Reka AI',
    country: 'US',
    sector: 'foundation_models',
    website: 'https://reka.ai',
    aliases: ['Reka'],
    founded: 2023,
    description: 'Multimodal AI research company offering frontier and efficient edge models.',
  },
  {
    id: 'technology_innovation_institute',
    name: 'Technology Innovation Institute',
    country: 'AE',
    sector: 'research_lab',
    website: 'https://tii.ae',
    aliases: ['TII', 'TII Abu Dhabi', 'Falcon AI'],
    founded: 2020,
    description: 'UAE government research institute behind the open-source Falcon LLM series.',
  },
  {
    id: 'nous_research',
    name: 'Nous Research',
    country: 'US',
    sector: 'research_lab',
    website: 'https://nousresearch.com',
    aliases: ['Nous'],
    founded: 2023,
    description: 'Open-source AI research group specialising in fine-tuned language models.',
  },
  {
    id: 'minimax_ai',
    name: 'MiniMax',
    country: 'CN',
    sector: 'foundation_models',
    website: 'https://minimaxi.com',
    aliases: ['MiniMax AI', 'Hailuo AI', 'Hailuo'],
    founded: 2021,
    description: 'Chinese AI company behind Hailuo video generation and MoE language models.',
  },

  // ── AI Infrastructure & Compute ─────────────────────────────────────────────

  {
    id: 'groq',
    name: 'Groq',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://groq.com',
    aliases: ['GroqCloud', 'Groq Inc'],
    founded: 2016,
    description: 'AI chip company developing Language Processing Units (LPUs) for fast LLM inference.',
  },
  {
    id: 'cerebras',
    name: 'Cerebras Systems',
    country: 'US',
    sector: 'semiconductors',
    website: 'https://cerebras.net',
    aliases: ['Cerebras'],
    founded: 2016,
    description: 'AI semiconductor company maker of wafer-scale chips optimised for deep learning.',
  },
  {
    id: 'sambanova',
    name: 'SambaNova Systems',
    country: 'US',
    sector: 'semiconductors',
    website: 'https://sambanova.ai',
    aliases: ['SambaNova', 'SambaNova AI'],
    founded: 2017,
    description: 'AI chip and platform company offering fast inference for large language models.',
  },
  {
    id: 'coreweave',
    name: 'CoreWeave',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://coreweave.com',
    aliases: ['Core Weave', 'CoreWeave Cloud'],
    founded: 2017,
    description: 'GPU cloud provider purpose-built for large-scale AI and ML workloads.',
  },
  {
    id: 'lambda_labs',
    name: 'Lambda Labs',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://lambdalabs.com',
    aliases: ['Lambda GPU Cloud', 'Lambda'],
    founded: 2012,
    description: 'GPU cloud and workstation provider targeting AI researchers and developers.',
  },
  {
    id: 'runpod',
    name: 'RunPod',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://runpod.io',
    aliases: ['Run Pod'],
    founded: 2022,
    description: 'Serverless GPU cloud platform for AI model training and inference.',
  },
  {
    id: 'fireworks_ai',
    name: 'Fireworks AI',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://fireworks.ai',
    aliases: ['Fireworks'],
    founded: 2022,
    description: 'Fast LLM inference platform serving open-source models at production scale.',
  },
  {
    id: 'baseten',
    name: 'Baseten',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://baseten.co',
    aliases: [],
    founded: 2019,
    description: 'ML model deployment platform for fast, scalable inference in production.',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://replicate.com',
    aliases: ['Replicate AI'],
    founded: 2019,
    description: 'Cloud platform for running and deploying open-source AI models via API.',
  },
  {
    id: 'modal',
    name: 'Modal',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://modal.com',
    aliases: ['Modal Labs'],
    founded: 2021,
    description: 'Serverless cloud platform for running Python workloads including AI model inference.',
  },
  {
    id: 'weights_and_biases',
    name: 'Weights & Biases',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://wandb.ai',
    aliases: ['W&B', 'WandB', 'Weights and Biases'],
    founded: 2017,
    description: 'MLOps platform for experiment tracking, model versioning, and dataset management.',
  },
  {
    id: 'langchain',
    name: 'LangChain',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://langchain.com',
    aliases: ['LangChain AI', 'LangSmith'],
    founded: 2022,
    description: 'Open-source framework and platform for building LLM-powered applications.',
  },
  {
    id: 'anyscale',
    name: 'Anyscale',
    country: 'US',
    sector: 'ai_infrastructure',
    website: 'https://anyscale.com',
    aliases: ['Ray', 'Anyscale Inc'],
    founded: 2019,
    description: 'Company behind the Ray open-source framework for distributed AI compute.',
  },

  // ── Robotics & Autonomy ─────────────────────────────────────────────────────

  {
    id: 'figure_ai',
    name: 'Figure AI',
    country: 'US',
    sector: 'robotics',
    website: 'https://figure.ai',
    aliases: ['Figure'],
    founded: 2022,
    description: 'Humanoid robotics company developing general-purpose bipedal robots for labor.',
  },
  {
    id: '1x_technologies',
    name: '1X Technologies',
    country: 'NO',
    sector: 'robotics',
    website: 'https://1x.tech',
    aliases: ['1X', 'Halodi Robotics'],
    founded: 2014,
    description: 'Norwegian humanoid robotics company backed by OpenAI, developing EVE and NEO robots.',
  },
  {
    id: 'agility_robotics',
    name: 'Agility Robotics',
    country: 'US',
    sector: 'robotics',
    website: 'https://agilityrobotics.com',
    aliases: ['Agility'],
    founded: 2015,
    description: 'Creator of Digit, a bipedal humanoid robot designed for warehouse and logistics work.',
  },
  {
    id: 'physical_intelligence',
    name: 'Physical Intelligence',
    country: 'US',
    sector: 'robotics',
    website: 'https://physicalintelligence.company',
    aliases: ['pi.ai', 'PI AI', 'pi robotics'],
    founded: 2023,
    description: 'AI robotics company building general-purpose physical intelligence for robots.',
  },
  {
    id: 'covariant',
    name: 'Covariant',
    country: 'US',
    sector: 'robotics',
    website: 'https://covariant.ai',
    aliases: ['Covariant AI'],
    founded: 2017,
    description: 'AI robotics company using foundation models to enable robots to handle novel objects.',
  },
  {
    id: 'boston_dynamics',
    name: 'Boston Dynamics',
    country: 'US',
    sector: 'robotics',
    website: 'https://bostondynamics.com',
    aliases: ['BD Robotics'],
    founded: 1992,
    description: 'Advanced robotics company known for Spot, Atlas, and Stretch robots.',
  },
  {
    id: 'waymo',
    name: 'Waymo',
    country: 'US',
    sector: 'robotics',
    website: 'https://waymo.com',
    aliases: ['Waymo LLC', 'Google Self-Driving Car'],
    founded: 2009,
    description: 'Alphabet subsidiary operating autonomous ride-hailing and trucking platforms.',
  },
  {
    id: 'tesla',
    name: 'Tesla',
    country: 'US',
    sector: 'robotics',
    website: 'https://tesla.com',
    aliases: ['Tesla Inc', 'Tesla Motors', 'Optimus', 'Tesla FSD', 'Tesla Autopilot'],
    ticker: 'TSLA',
    founded: 2003,
    description: 'EV and energy company developing full self-driving technology and Optimus humanoid robot.',
  },
  {
    id: 'aurora_innovation',
    name: 'Aurora Innovation',
    country: 'US',
    sector: 'robotics',
    website: 'https://aurora.tech',
    aliases: ['Aurora'],
    ticker: 'AUR',
    founded: 2017,
    description: 'Autonomous vehicle technology company developing self-driving truck solutions.',
  },
  {
    id: 'nuro',
    name: 'Nuro',
    country: 'US',
    sector: 'robotics',
    website: 'https://nuro.ai',
    aliases: ['Nuro AI'],
    founded: 2016,
    description: 'Autonomous delivery vehicle startup developing lightweight unmanned road vehicles.',
  },
  {
    id: 'apptronik',
    name: 'Apptronik',
    country: 'US',
    sector: 'robotics',
    website: 'https://apptronik.com',
    aliases: [],
    founded: 2016,
    description: 'Humanoid robotics company developing Apollo, a general-purpose robot for industry.',
  },
  {
    id: 'skild_ai',
    name: 'Skild AI',
    country: 'US',
    sector: 'robotics',
    website: 'https://skild.ai',
    aliases: ['Skild'],
    founded: 2023,
    description: 'AI startup building foundation models for general-purpose robot intelligence.',
  },

  // ── Data, Vector & ML Tooling ───────────────────────────────────────────────

  {
    id: 'pinecone',
    name: 'Pinecone',
    country: 'US',
    sector: 'data_platforms',
    website: 'https://pinecone.io',
    aliases: ['Pinecone Systems'],
    founded: 2019,
    description: 'Managed vector database platform for semantic search and AI memory at scale.',
  },
  {
    id: 'weaviate',
    name: 'Weaviate',
    country: 'NL',
    sector: 'data_platforms',
    website: 'https://weaviate.io',
    aliases: [],
    founded: 2019,
    description: 'Open-source vector database with native support for multimodal data and LLM integrations.',
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    country: 'DE',
    sector: 'data_platforms',
    website: 'https://qdrant.tech',
    aliases: ['Qdrant AI'],
    founded: 2021,
    description: 'Open-source vector similarity search engine and database written in Rust.',
  },
  {
    id: 'zilliz',
    name: 'Zilliz',
    country: 'US',
    sector: 'data_platforms',
    website: 'https://zilliz.com',
    aliases: ['Milvus', 'Zilliz Cloud'],
    founded: 2017,
    description: 'Company behind the Milvus open-source vector database and Zilliz Cloud.',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    country: 'US',
    sector: 'data_platforms',
    website: 'https://snowflake.com',
    aliases: ['Snowflake Inc', 'Snowflake Cortex', 'Snowflake AI'],
    ticker: 'SNOW',
    founded: 2012,
    description: 'Cloud data platform integrating AI/ML features via Snowflake Cortex.',
  },
  {
    id: 'llamaindex',
    name: 'LlamaIndex',
    country: 'US',
    sector: 'data_platforms',
    website: 'https://llamaindex.ai',
    aliases: ['Llama Index', 'LlamaIndex AI'],
    founded: 2022,
    description: 'Data framework for connecting custom data sources to large language models.',
  },
  {
    id: 'dbt_labs',
    name: 'dbt Labs',
    country: 'US',
    sector: 'data_platforms',
    website: 'https://getdbt.com',
    aliases: ['dbt', 'Fishtown Analytics'],
    founded: 2016,
    description: 'Data transformation platform used in modern AI/analytics data stacks.',
  },

  // ── Research Labs ───────────────────────────────────────────────────────────

  {
    id: 'eleutherai',
    name: 'EleutherAI',
    country: 'US',
    sector: 'research_lab',
    website: 'https://eleuther.ai',
    aliases: ['Eleuther AI', 'EleutherAI Research'],
    founded: 2020,
    description: 'Non-profit AI research collective focused on open-source LLMs and interpretability.',
  },
  {
    id: 'allen_institute_ai',
    name: 'Allen Institute for AI',
    country: 'US',
    sector: 'research_lab',
    website: 'https://allenai.org',
    aliases: ['AI2', 'AllenAI', 'Allen AI'],
    founded: 2014,
    description: 'Non-profit AI research institute founded by Paul Allen, known for OLMo and Semantic Scholar.',
  },
  {
    id: 'mila',
    name: 'Mila Quebec AI Institute',
    country: 'CA',
    sector: 'research_lab',
    website: 'https://mila.quebec',
    aliases: ['MILA', 'Mila AI', 'Mila Institute'],
    founded: 1993,
    description: 'Leading academic AI research institute in Montreal co-founded by Yoshua Bengio.',
  },
  {
    id: 'redwood_research',
    name: 'Redwood Research',
    country: 'US',
    sector: 'ai_safety',
    website: 'https://redwoodresearch.org',
    aliases: ['Redwood'],
    founded: 2021,
    description: 'AI safety research organisation working on interpretability and alignment.',
  },
  {
    id: 'center_for_ai_safety',
    name: 'Center for AI Safety',
    country: 'US',
    sector: 'ai_safety',
    website: 'https://safe.ai',
    aliases: ['CAIS', 'Center AI Safety'],
    founded: 2022,
    description: 'Non-profit research centre focused on reducing societal-scale risks from AI.',
  },
  {
    id: 'miri',
    name: 'Machine Intelligence Research Institute',
    country: 'US',
    sector: 'ai_safety',
    website: 'https://intelligence.org',
    aliases: ['MIRI'],
    founded: 2000,
    description: 'Early AI alignment research organisation focused on mathematical frameworks for safe AI.',
  },
  {
    id: 'arc_eval',
    name: 'ARC Evals',
    country: 'US',
    sector: 'ai_safety',
    website: 'https://evals.alignment.org',
    aliases: ['Alignment Research Center', 'ARC', 'ARC Alignment'],
    founded: 2021,
    description: 'Non-profit evaluating potential dangerous capabilities of advanced AI systems.',
  },

  // ── Cloud & Platform AI Players ─────────────────────────────────────────────

  {
    id: 'google_cloud',
    name: 'Google Cloud',
    country: 'US',
    sector: 'cloud_platforms',
    website: 'https://cloud.google.com',
    aliases: ['GCP', 'Vertex AI', 'Google Cloud Platform'],
    ticker: 'GOOGL',
    founded: 2008,
    description: 'Google\'s cloud platform offering AI services via Vertex AI and Gemini APIs.',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    country: 'US',
    sector: 'cloud_platforms',
    website: 'https://oracle.com',
    aliases: ['Oracle Corporation', 'Oracle AI', 'Oracle Cloud'],
    ticker: 'ORCL',
    founded: 1977,
    description: 'Enterprise technology company offering Oracle Cloud Infrastructure with AI services.',
  },
  {
    id: 'ibm',
    name: 'IBM',
    country: 'US',
    sector: 'cloud_platforms',
    website: 'https://ibm.com',
    aliases: ['IBM Watson', 'watsonx', 'IBM AI', 'International Business Machines'],
    ticker: 'IBM',
    founded: 1911,
    description: 'Enterprise technology company offering the watsonx AI platform for business.',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    country: 'US',
    sector: 'enterprise_software',
    website: 'https://salesforce.com',
    aliases: ['Salesforce AI', 'Einstein AI', 'SFDC', 'Agentforce'],
    ticker: 'CRM',
    founded: 1999,
    description: 'CRM platform with Einstein and Agentforce AI layers for enterprise automation.',
  },
  {
    id: 'alibaba_cloud',
    name: 'Alibaba Cloud',
    country: 'CN',
    sector: 'cloud_platforms',
    website: 'https://alibabacloud.com',
    aliases: ['Aliyun', 'Alibaba AI', 'Qwen', 'Tongyi Qianwen'],
    founded: 2009,
    description: 'Alibaba\'s cloud arm developing the Qwen/Tongyi family of foundation models.',
  },
  {
    id: 'tencent_ai',
    name: 'Tencent AI',
    country: 'CN',
    sector: 'cloud_platforms',
    website: 'https://ai.tencent.com',
    aliases: ['Tencent', 'Hunyuan', 'Tencent Cloud'],
    founded: 2016,
    description: 'Tencent\'s AI research and cloud division, developing the Hunyuan model family.',
  },

  // ── Policy, Standards & Governance ─────────────────────────────────────────

  {
    id: 'partnership_on_ai',
    name: 'Partnership on AI',
    country: 'US',
    sector: 'policy_standards',
    website: 'https://partnershiponai.org',
    aliases: ['PAI', 'Partnership AI'],
    founded: 2016,
    description: 'Multi-stakeholder non-profit establishing best practices for responsible AI development.',
  },
  {
    id: 'future_of_life_institute',
    name: 'Future of Life Institute',
    country: 'US',
    sector: 'policy_standards',
    website: 'https://futureoflife.org',
    aliases: ['FLI'],
    founded: 2014,
    description: 'Non-profit focused on reducing catastrophic risks from transformative technologies including AI.',
  },
  {
    id: 'uk_ai_safety_institute',
    name: 'UK AI Safety Institute',
    country: 'GB',
    sector: 'policy_standards',
    website: 'https://gov.uk/government/organisations/ai-safety-institute',
    aliases: ['AISI', 'UK AISI', 'DSIT AI Safety'],
    founded: 2023,
    description: 'UK government body evaluating risks from frontier AI models.',
  },
  {
    id: 'nist',
    name: 'NIST',
    country: 'US',
    sector: 'policy_standards',
    website: 'https://nist.gov',
    aliases: ['National Institute of Standards and Technology', 'NIST AI RMF', 'NIST AI'],
    founded: 1901,
    description: 'US standards body that produced the AI Risk Management Framework (AI RMF).',
  },
  {
    id: 'eu_ai_office',
    name: 'EU AI Office',
    country: 'EU',
    sector: 'policy_standards',
    website: 'https://digital-strategy.ec.europa.eu',
    aliases: ['European AI Office', 'EU AI Act office'],
    founded: 2024,
    description: 'European Commission body overseeing enforcement of the EU AI Act for GPAI models.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Look up a company by its stable id */
export function getCompanyById(id: string): CompanyEntity | undefined {
  return COMPANIES.find((c) => c.id === id);
}

/**
 * Resolve a free-text company name (from an article or event) to the canonical
 * CompanyEntity by matching against id, name, and known aliases.
 *
 * Uses normalized comparison to handle punctuation/casing variants:
 *   "Open AI" → OpenAI, "deepmind" → Google DeepMind, etc.
 */
export function resolveCompany(nameOrAlias: string): CompanyEntity | undefined {
  const normalised = normalizeForMatch(nameOrAlias);
  return COMPANIES.find(
    (c) =>
      c.id === normalised ||
      normalizeForMatch(c.name) === normalised ||
      c.aliases?.some((a) => normalizeForMatch(a) === normalised)
  );
}

/** Normalize a name for matching: lowercase, strip punctuation, collapse spaces. */
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-_.,:;'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default COMPANIES;
