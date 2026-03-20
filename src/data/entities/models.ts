/**
 * Omterminal — AI Model Entity Registry
 *
 * Canonical list of tracked AI models.
 * Used to normalise model references across ingested articles and events.
 *
 * Each entry represents a distinct model family or specific version
 * that has been publicly announced or released.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type definition
// ─────────────────────────────────────────────────────────────────────────────

export type ModelType =
  | 'large_language_model'
  | 'multimodal'
  | 'image_generation'
  | 'video_generation'
  | 'audio'
  | 'code'
  | 'embedding'
  | 'reasoning'
  | 'other';

export type ModelCategory =
  | 'foundation_model'
  | 'multimodal'
  | 'image_generation'
  | 'video_generation'
  | 'speech_audio'
  | 'embedding'
  | 'code_model'
  | 'reasoning_model'
  | 'research_model'
  | 'other';

export interface ModelEntity {
  /** Stable machine-friendly identifier */
  id: string;
  /** Canonical model name, e.g. "GPT-4o" */
  name: string;
  /** Canonical company id from the company registry (equivalent to provider) */
  company: string;
  /** Primary model type */
  type: ModelType;
  /** Year the model was publicly released or announced */
  releaseYear: number;
  /** Whether model weights are publicly available */
  isOpenWeights?: boolean;
  /** Known aliases or version names used in news (for entity resolution) */
  aliases?: string[];
  /** Brief description of the model's key characteristics */
  description?: string;
  /** URL-safe slug; defaults to id if omitted */
  slug?: string;
  /** High-level category for filtering and display */
  category?: ModelCategory;
  /** Supported input/output modalities (e.g. ['text', 'vision', 'audio']) */
  modality?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Registry
// ─────────────────────────────────────────────────────────────────────────────

export const MODELS: ModelEntity[] = [

  // ── OpenAI ──────────────────────────────────────────────────────────────────

  {
    id: 'gpt4o',
    name: 'GPT-4o',
    company: 'openai',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['GPT-4 Omni', 'gpt-4o', 'GPT4o'],
    description: 'OpenAI\'s flagship multimodal model with text, vision, and audio capabilities.',
  },
  {
    id: 'gpt4_turbo',
    name: 'GPT-4 Turbo',
    company: 'openai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['GPT-4T', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'GPT-4 Turbo with Vision'],
    description: 'Faster, cheaper variant of GPT-4 with an updated knowledge cutoff.',
  },
  {
    id: 'gpt4',
    name: 'GPT-4',
    company: 'openai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['GPT4', 'gpt-4', 'GPT 4'],
    description: 'OpenAI\'s high-capability language model, successor to GPT-3.5.',
  },
  {
    id: 'gpt35_turbo',
    name: 'GPT-3.5 Turbo',
    company: 'openai',
    type: 'large_language_model',
    releaseYear: 2022,
    isOpenWeights: false,
    aliases: ['ChatGPT', 'gpt-3.5-turbo', 'GPT 3.5', 'GPT3.5'],
    description: 'The model behind the original ChatGPT, widely used for cost-effective generation.',
  },
  {
    id: 'gpt5',
    name: 'GPT-5',
    company: 'openai',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['GPT5', 'gpt-5', 'GPT 5'],
    description: 'OpenAI\'s next-generation flagship language model.',
  },
  {
    id: 'o1',
    name: 'OpenAI o1',
    company: 'openai',
    type: 'reasoning',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['o1-preview', 'o1-mini', 'o1 mini', 'o1 preview'],
    description: 'OpenAI\'s chain-of-thought reasoning model series.',
  },
  {
    id: 'o3',
    name: 'OpenAI o3',
    company: 'openai',
    type: 'reasoning',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['o3-mini', 'o3 mini', 'o3-mini-high', 'o3 mini high'],
    description: 'OpenAI\'s advanced reasoning model, successor to o1.',
  },
  {
    id: 'o4',
    name: 'OpenAI o4',
    company: 'openai',
    type: 'reasoning',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['o4-mini', 'o4 mini'],
    description: 'OpenAI\'s next-generation reasoning model family.',
  },
  {
    id: 'sora',
    name: 'Sora',
    company: 'openai',
    type: 'video_generation',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['OpenAI Sora', 'Sora AI'],
    description: 'OpenAI\'s text-to-video generation model.',
  },
  {
    id: 'whisper',
    name: 'Whisper',
    company: 'openai',
    type: 'audio',
    releaseYear: 2022,
    isOpenWeights: true,
    aliases: ['OpenAI Whisper', 'Whisper ASR', 'whisper-large'],
    description: 'OpenAI\'s open-source automatic speech recognition model.',
  },
  {
    id: 'dall_e_3',
    name: 'DALL-E 3',
    company: 'openai',
    type: 'image_generation',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['DALL·E 3', 'DALLE 3', 'DALL-E3', 'dalle-3', 'OpenAI DALL-E'],
    description: 'OpenAI\'s third-generation text-to-image model with improved instruction following.',
  },
  {
    id: 'dall_e_2',
    name: 'DALL-E 2',
    company: 'openai',
    type: 'image_generation',
    releaseYear: 2022,
    isOpenWeights: false,
    aliases: ['DALL·E 2', 'DALLE 2', 'DALL-E2'],
    description: 'OpenAI\'s second-generation text-to-image diffusion model.',
  },

  // ── Anthropic ────────────────────────────────────────────────────────────────

  {
    id: 'claude3_5_sonnet',
    name: 'Claude 3.5 Sonnet',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Claude 3.5', 'claude-3-5-sonnet', 'Claude Sonnet 3.5', 'Claude 3.5 Sonnet v2'],
    description: 'Anthropic\'s balanced model combining speed and capability.',
  },
  {
    id: 'claude35_haiku',
    name: 'Claude 3.5 Haiku',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['claude-3-5-haiku', 'Claude Haiku 3.5'],
    description: 'Anthropic\'s fastest Claude 3.5 model, optimised for low latency.',
  },
  {
    id: 'claude3_opus',
    name: 'Claude 3 Opus',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Claude Opus', 'claude-3-opus', 'Claude 3 Opus'],
    description: 'Anthropic\'s most capable model in the Claude 3 family.',
  },
  {
    id: 'claude3_sonnet',
    name: 'Claude 3 Sonnet',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['claude-3-sonnet', 'Claude Sonnet'],
    description: 'Anthropic\'s balanced Claude 3 model.',
  },
  {
    id: 'claude3_haiku',
    name: 'Claude 3 Haiku',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['claude-3-haiku', 'Claude Haiku'],
    description: 'Anthropic\'s fastest and most compact Claude 3 model.',
  },
  {
    id: 'claude_4',
    name: 'Claude 4',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['Claude 4 Sonnet', 'Claude 4 Opus', 'Claude Sonnet 4', 'Claude Opus 4'],
    description: 'Anthropic\'s fourth-generation Claude model family.',
  },

  // ── Google DeepMind ──────────────────────────────────────────────────────────

  {
    id: 'gemini_2',
    name: 'Gemini 2.0',
    company: 'google_deepmind',
    type: 'multimodal',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['Gemini 2', 'Gemini 2.0 Flash', 'Gemini 2.0 Pro', 'Gemini 2 Flash', 'Gemini 2 Pro'],
    description: 'Google DeepMind\'s second-generation Gemini model family.',
  },
  {
    id: 'gemini_15_pro',
    name: 'Gemini 1.5 Pro',
    company: 'google_deepmind',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Gemini Pro', 'gemini-1.5-pro', 'Gemini 1.5'],
    description: 'Google DeepMind\'s long-context multimodal model with 1M token context.',
  },
  {
    id: 'gemini_flash',
    name: 'Gemini Flash',
    company: 'google_deepmind',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Gemini 1.5 Flash', 'gemini-1.5-flash', 'Gemini Flash 1.5', 'Gemini 2.0 Flash Lite'],
    description: 'Google\'s fast and cost-efficient Gemini variant for high-throughput tasks.',
  },
  {
    id: 'gemini_ultra',
    name: 'Gemini Ultra',
    company: 'google_deepmind',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Gemini 1.0 Ultra', 'Gemini Advanced'],
    description: 'Google\'s most capable Gemini model, available via Gemini Advanced.',
  },
  {
    id: 'gemini_nano',
    name: 'Gemini Nano',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Gemini Nano 1.5', 'Gemini 1.5 Nano'],
    description: 'Google\'s on-device Gemini model for mobile and edge applications.',
  },
  {
    id: 'gemma2',
    name: 'Gemma 2',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['gemma-2', 'Gemma2', 'Gemma 2B', 'Gemma 9B', 'Gemma 27B', 'Google Gemma 2'],
    description: 'Google\'s open-weights Gemma 2 family in 2B, 9B, and 27B sizes.',
  },
  {
    id: 'gemma3',
    name: 'Gemma 3',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: true,
    aliases: ['gemma-3', 'Gemma3', 'Google Gemma 3'],
    description: 'Google\'s third-generation open-weights Gemma model.',
  },
  {
    id: 'palm2',
    name: 'PaLM 2',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['PaLM-2', 'Google Bard', 'Bard', 'palm-2'],
    description: 'Google\'s PaLM 2 language model family, powering early Bard.',
  },
  {
    id: 'imagen3',
    name: 'Imagen 3',
    company: 'google_deepmind',
    type: 'image_generation',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Google Imagen 3', 'Imagen3', 'Imagen 3.0'],
    description: 'Google DeepMind\'s third-generation text-to-image generation model.',
  },
  {
    id: 'veo',
    name: 'Veo',
    company: 'google_deepmind',
    type: 'video_generation',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Google Veo', 'Veo 2', 'Veo2'],
    description: 'Google DeepMind\'s text-to-video generation model.',
  },

  // ── Meta AI ──────────────────────────────────────────────────────────────────

  {
    id: 'llama4',
    name: 'Llama 4',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: true,
    aliases: ['LLaMA 4', 'Meta Llama 4', 'llama-4', 'Llama 4 Scout', 'Llama 4 Maverick', 'Llama4'],
    description: 'Meta\'s fourth-generation open-weights LLM family.',
  },
  {
    id: 'llama3_3',
    name: 'Llama 3.3',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['LLaMA 3.3', 'Meta Llama 3.3', 'llama-3.3', 'Llama 3.3 70B'],
    description: 'Meta\'s improved 70B open-weights model in the Llama 3 family.',
  },
  {
    id: 'llama3_2',
    name: 'Llama 3.2',
    company: 'meta_ai',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['LLaMA 3.2', 'Meta Llama 3.2', 'llama-3.2', 'Llama 3.2 Vision'],
    description: 'Meta\'s multimodal Llama family with vision support and smaller edge variants.',
  },
  {
    id: 'llama3_1',
    name: 'Llama 3.1',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['LLaMA 3.1', 'Meta Llama 3.1', 'llama-3.1', 'Llama 3.1 405B'],
    description: 'Meta\'s largest open-weights model with 405B parameters.',
  },
  {
    id: 'llama3',
    name: 'Llama 3',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['LLaMA 3', 'Meta Llama 3', 'llama-3'],
    description: 'Meta\'s open-weights LLM family, available in 8B and 70B variants.',
  },
  {
    id: 'llama2',
    name: 'Llama 2',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['LLaMA 2', 'Meta Llama 2', 'llama-2'],
    description: 'Meta\'s widely adopted open-weights model that popularised open-source LLMs.',
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    company: 'meta_ai',
    type: 'code',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['CodeLlama', 'code-llama', 'Code LLaMA'],
    description: 'Meta\'s code-specialised fine-tune of Llama for code generation and completion.',
  },

  // ── Mistral AI ───────────────────────────────────────────────────────────────

  {
    id: 'mistral_large',
    name: 'Mistral Large',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['mistral-large-latest', 'Mistral Large 2', 'Mistral Large 3'],
    description: 'Mistral AI\'s flagship frontier model with strong reasoning and coding.',
  },
  {
    id: 'mixtral_8x7b',
    name: 'Mixtral 8x7B',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Mixtral', 'mixtral-8x7b-instruct', 'Mixtral-8x7B'],
    description: 'Mistral\'s sparse mixture-of-experts open-weights model.',
  },
  {
    id: 'mixtral_8x22b',
    name: 'Mixtral 8x22B',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Mixtral-8x22B', 'mixtral-8x22b'],
    description: 'Mistral\'s larger MoE model with improved capability over 8x7B.',
  },
  {
    id: 'mistral_7b',
    name: 'Mistral 7B',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Mistral-7B', 'mistral-7b-instruct', 'Mistral 7B Instruct'],
    description: 'Mistral\'s original open-weights 7B model that set new benchmarks for its size.',
  },
  {
    id: 'mistral_small',
    name: 'Mistral Small',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['mistral-small', 'Mistral Small 3'],
    description: 'Mistral\'s lightweight model optimised for low-latency enterprise use.',
  },
  {
    id: 'codestral',
    name: 'Codestral',
    company: 'mistral_ai',
    type: 'code',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Mistral Codestral', 'codestral-latest'],
    description: 'Mistral\'s code-specialised model for code generation and completion.',
  },
  {
    id: 'mistral_nemo',
    name: 'Mistral NeMo',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Mistral Nemo', 'mistral-nemo'],
    description: 'Mistral\'s 12B open-weights model built in partnership with NVIDIA.',
  },

  // ── DeepSeek ─────────────────────────────────────────────────────────────────

  {
    id: 'deepseek_v3',
    name: 'DeepSeek-V3',
    company: 'deepseek',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['DeepSeek V3', 'DeepSeek-V3', 'deepseek-v3', 'DeepSeek V3.5'],
    description: 'DeepSeek\'s competitive open-weights model with MoE architecture.',
  },
  {
    id: 'deepseek_r1',
    name: 'DeepSeek-R1',
    company: 'deepseek',
    type: 'reasoning',
    releaseYear: 2025,
    isOpenWeights: true,
    aliases: ['DeepSeek R1', 'DeepSeek-R1', 'deepseek-r1', 'DeepSeek R1 Zero', 'DeepSeek-R1-Zero'],
    description: 'DeepSeek\'s reasoning model with chain-of-thought capabilities.',
  },
  {
    id: 'deepseek_v2',
    name: 'DeepSeek-V2',
    company: 'deepseek',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['DeepSeek V2', 'deepseek-v2'],
    description: 'DeepSeek\'s second-generation MoE model with 236B total parameters.',
  },
  {
    id: 'deepseek_coder',
    name: 'DeepSeek Coder',
    company: 'deepseek',
    type: 'code',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['deepseek-coder', 'DeepSeek-Coder', 'DeepSeek Coder V2'],
    description: 'DeepSeek\'s code-specialised model for programming tasks.',
  },

  // ── xAI ──────────────────────────────────────────────────────────────────────

  {
    id: 'grok3',
    name: 'Grok-3',
    company: 'xai',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: false,
    aliases: ['Grok 3', 'grok-3', 'Grok 3 Mini', 'Grok3'],
    description: 'xAI\'s third-generation model with significantly enhanced reasoning capabilities.',
  },
  {
    id: 'grok2',
    name: 'Grok-2',
    company: 'xai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Grok 2', 'grok-2', 'Grok2'],
    description: 'xAI\'s second-generation model with access to real-time X data.',
  },
  {
    id: 'grok1',
    name: 'Grok-1',
    company: 'xai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Grok 1', 'grok-1', 'Grok1'],
    description: 'xAI\'s first open-weights model release.',
  },

  // ── Microsoft / Phi ──────────────────────────────────────────────────────────

  {
    id: 'phi4',
    name: 'Phi-4',
    company: 'microsoft',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Phi 4', 'phi-4', 'Microsoft Phi-4', 'Phi4'],
    description: 'Microsoft\'s small language model achieving strong performance at 14B parameters.',
  },
  {
    id: 'phi3',
    name: 'Phi-3',
    company: 'microsoft',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Phi 3', 'phi-3', 'Phi-3-mini', 'Phi-3-medium', 'Phi-3-small', 'Microsoft Phi-3', 'Phi3'],
    description: 'Microsoft\'s family of small language models, notably the 3.8B Phi-3-mini.',
  },

  // ── Alibaba / Qwen ───────────────────────────────────────────────────────────

  {
    id: 'qwen3',
    name: 'Qwen 3',
    company: 'alibaba',
    type: 'large_language_model',
    releaseYear: 2025,
    isOpenWeights: true,
    aliases: ['Qwen3', 'qwen-3', 'Alibaba Qwen 3'],
    description: 'Alibaba\'s third-generation open-weights LLM family.',
  },
  {
    id: 'qwen25',
    name: 'Qwen 2.5',
    company: 'alibaba',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Qwen2.5', 'qwen-2.5', 'Alibaba Qwen 2.5', 'Qwen 2.5 Max'],
    description: 'Alibaba\'s capable open-weights LLM series available in multiple sizes.',
  },
  {
    id: 'qwen2',
    name: 'Qwen 2',
    company: 'alibaba',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Qwen2', 'qwen-2', 'Alibaba Qwen 2'],
    description: 'Alibaba\'s second-generation Qwen model family.',
  },
  {
    id: 'qwq',
    name: 'QwQ',
    company: 'alibaba',
    type: 'reasoning',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['QwQ-32B', 'QwQ 32B', 'Alibaba QwQ'],
    description: 'Alibaba\'s reasoning model with extended chain-of-thought capabilities.',
  },

  // ── Cohere ───────────────────────────────────────────────────────────────────

  {
    id: 'command_r_plus',
    name: 'Command R+',
    company: 'cohere',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['command-r-plus', 'Command R Plus'],
    description: 'Cohere\'s enterprise-optimised RAG and tool-use model.',
  },
  {
    id: 'command_r',
    name: 'Command R',
    company: 'cohere',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['command-r', 'Cohere Command R'],
    description: 'Cohere\'s retrieval-augmented generation model.',
  },

  // ── Amazon ───────────────────────────────────────────────────────────────────

  {
    id: 'nova',
    name: 'Amazon Nova',
    company: 'amazon',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Nova Pro', 'Nova Lite', 'Nova Micro', 'Amazon Nova Pro', 'Amazon Nova Lite', 'Amazon Bedrock Nova'],
    description: 'Amazon\'s proprietary Nova model family offered through AWS Bedrock.',
  },
  {
    id: 'titan',
    name: 'Amazon Titan',
    company: 'amazon',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Titan Text', 'Amazon Titan Text', 'Titan Express'],
    description: 'Amazon\'s foundational Titan language models available on Bedrock.',
  },

  // ── Stability AI ─────────────────────────────────────────────────────────────

  {
    id: 'stable_diffusion_3',
    name: 'Stable Diffusion 3',
    company: 'stability_ai',
    type: 'image_generation',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['SD3', 'SD 3', 'Stable Diffusion 3.5', 'SD3.5'],
    description: 'Stability AI\'s third-generation text-to-image model with improved text rendering.',
  },
  {
    id: 'stable_diffusion_xl',
    name: 'Stable Diffusion XL',
    company: 'stability_ai',
    type: 'image_generation',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['SDXL', 'Stable Diffusion XL Turbo', 'SDXL Turbo'],
    description: 'Stability AI\'s SDXL model with improved resolution and quality.',
  },

  // ── Black Forest Labs (FLUX) ─────────────────────────────────────────────────

  {
    id: 'flux',
    name: 'FLUX.1',
    company: 'black_forest_labs',
    type: 'image_generation',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['FLUX 1', 'FLUX.1 Dev', 'FLUX.1 Schnell', 'FLUX.1 Pro', 'Black Forest Labs FLUX'],
    description: 'Black Forest Labs\' state-of-the-art text-to-image generation model.',
  },

  // ── Runway ───────────────────────────────────────────────────────────────────

  {
    id: 'runway_gen3',
    name: 'Runway Gen-3',
    company: 'runway',
    type: 'video_generation',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Runway Gen3', 'Gen-3 Alpha', 'Gen-3', 'RunwayML Gen-3'],
    description: 'Runway\'s third-generation video generation model.',
  },

  // ── Google / Midjourney ──────────────────────────────────────────────────────

  {
    id: 'midjourney',
    name: 'Midjourney',
    company: 'midjourney',
    type: 'image_generation',
    releaseYear: 2022,
    isOpenWeights: false,
    aliases: ['Midjourney v6', 'Midjourney v7', 'MJ', 'midjourney ai'],
    description: 'Midjourney\'s proprietary text-to-image model known for artistic quality.',
  },

  // ── Regional / Research models ───────────────────────────────────────────────

  {
    id: 'ernie',
    name: 'ERNIE Bot',
    company: 'baidu',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['ERNIE 4.0', 'Wenxin Yiyan', 'Baidu ERNIE', 'ERNIE 3.5'],
    description: 'Baidu\'s large language model, China\'s flagship enterprise AI assistant.',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    company: 'moonshot_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Kimi k1.5', 'Moonshot Kimi', 'Moonshot AI Kimi'],
    description: 'Moonshot AI\'s long-context model with reasoning capabilities.',
  },
  {
    id: 'glm4',
    name: 'GLM-4',
    company: 'zhipu_ai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['GLM 4', 'ChatGLM', 'ChatGLM-4', 'Zhipu GLM-4', 'GLM4'],
    description: 'Zhipu AI\'s fourth-generation General Language Model.',
  },
  {
    id: 'yi',
    name: 'Yi',
    company: '01_ai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Yi-34B', 'Yi-1.5', '01.AI Yi', 'Yi-Large', 'Yi-Lightning'],
    description: '01.AI\'s bilingual open-weights model series.',
  },
  {
    id: 'internlm',
    name: 'InternLM',
    company: 'shanghai_ai_lab',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['InternLM2', 'InternLM 2', 'Shanghai AI Lab InternLM', 'InternLM-2'],
    description: 'Shanghai AI Lab\'s open-source LLM series focused on instruction following.',
  },
  {
    id: 'falcon',
    name: 'Falcon',
    company: 'tii',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Falcon 180B', 'Falcon 40B', 'Falcon 7B', 'TII Falcon'],
    description: 'Technology Innovation Institute\'s open-weights LLM family.',
  },

  // ── Coding models ────────────────────────────────────────────────────────────

  {
    id: 'starcoder2',
    name: 'StarCoder 2',
    company: 'hugging_face',
    type: 'code',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['StarCoder2', 'starcoder-2', 'BigCode StarCoder 2'],
    description: 'BigCode\'s second-generation open code model trained on 600+ languages.',
  },

  // ── Embedding models ─────────────────────────────────────────────────────────

  {
    id: 'text_embedding_3',
    name: 'text-embedding-3',
    company: 'openai',
    type: 'embedding',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['text-embedding-3-large', 'text-embedding-3-small', 'OpenAI embeddings'],
    description: 'OpenAI\'s third-generation text embedding models.',
    category: 'embedding',
    modality: ['text'],
  },

  // ── OpenAI (additional) ──────────────────────────────────────────────────────

  {
    id: 'gpt4o_mini',
    name: 'GPT-4o mini',
    company: 'openai',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['GPT-4o Mini', 'gpt-4o-mini', 'GPT4o mini', 'gpt4omini'],
    description: 'OpenAI\'s lightweight multimodal model optimised for speed and cost.',
    category: 'foundation_model',
    modality: ['text', 'vision'],
  },

  // ── Anthropic (additional) ───────────────────────────────────────────────────

  {
    id: 'claude2',
    name: 'Claude 2',
    company: 'anthropic',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Claude 2.0', 'claude-2', 'Claude2', 'claude-2.0', 'claude-2.1', 'Claude 2.1'],
    description: 'Anthropic\'s second-generation Claude model with improved reasoning and longer context.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Google DeepMind (additional) ─────────────────────────────────────────────

  {
    id: 'gemini_10_pro',
    name: 'Gemini 1.0 Pro',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Gemini Pro 1.0', 'gemini-pro', 'gemini-1.0-pro', 'Gemini 1.0'],
    description: 'Google\'s original Gemini Pro model, successor to PaLM 2.',
    category: 'foundation_model',
    modality: ['text'],
  },
  {
    id: 'imagen',
    name: 'Imagen',
    company: 'google_deepmind',
    type: 'image_generation',
    releaseYear: 2022,
    isOpenWeights: false,
    aliases: ['Google Imagen', 'Imagen 2', 'Imagen2', 'Google Imagen 2'],
    description: 'Google\'s text-to-image diffusion model series, powering image generation in Google products.',
    category: 'image_generation',
    modality: ['text', 'image'],
  },
  {
    id: 't5',
    name: 'T5',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2019,
    isOpenWeights: true,
    aliases: ['T5-large', 'T5-base', 'T5-small', 'T5-XL', 'T5-XXL', 'Text-to-Text Transfer Transformer'],
    description: 'Google\'s Text-to-Text Transfer Transformer, a foundational encoder-decoder language model.',
    category: 'research_model',
    modality: ['text'],
  },
  {
    id: 'ul2',
    name: 'UL2',
    company: 'google_deepmind',
    type: 'large_language_model',
    releaseYear: 2022,
    isOpenWeights: true,
    aliases: ['UL2 20B', 'Unified Language Learner', 'Flan-UL2'],
    description: 'Google\'s Unified Language Learner, a flexible encoder-decoder model with strong few-shot performance.',
    category: 'research_model',
    modality: ['text'],
  },

  // ── Meta AI (additional) ─────────────────────────────────────────────────────

  {
    id: 'sam',
    name: 'Segment Anything',
    company: 'meta_ai',
    type: 'multimodal',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['SAM', 'Segment Anything Model', 'SAM 2', 'SAM2', 'Meta SAM'],
    description: 'Meta\'s zero-shot image segmentation model capable of segmenting any object from a prompt.',
    category: 'multimodal',
    modality: ['vision'],
  },
  {
    id: 'opt',
    name: 'OPT',
    company: 'meta_ai',
    type: 'large_language_model',
    releaseYear: 2022,
    isOpenWeights: true,
    aliases: ['OPT-66B', 'OPT-175B', 'OPT-30B', 'OPT-13B', 'Open Pre-trained Transformer'],
    description: 'Meta\'s Open Pre-trained Transformer language model suite, released for research.',
    category: 'research_model',
    modality: ['text'],
  },

  // ── Mistral AI (additional) ──────────────────────────────────────────────────

  {
    id: 'mistral_medium',
    name: 'Mistral Medium',
    company: 'mistral_ai',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['mistral-medium', 'Mistral Medium 2', 'Mistral Medium 3'],
    description: 'Mistral\'s mid-tier model balancing capability and cost for enterprise use.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Cohere (additional) ──────────────────────────────────────────────────────

  {
    id: 'cohere_embed_v3',
    name: 'Embed v3',
    company: 'cohere',
    type: 'embedding',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Cohere Embed v3', 'embed-english-v3.0', 'embed-multilingual-v3.0', 'Cohere Embed 3'],
    description: 'Cohere\'s third-generation text embedding model with improved multilingual support.',
    category: 'embedding',
    modality: ['text'],
  },

  // ── AI21 Labs ────────────────────────────────────────────────────────────────

  {
    id: 'jurassic2',
    name: 'Jurassic-2',
    company: 'ai21_labs',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['J2', 'Jurassic 2', 'AI21 Jurassic-2', 'j2-ultra', 'j2-mid'],
    description: 'AI21 Labs\' second-generation language model for enterprise text generation.',
    category: 'foundation_model',
    modality: ['text'],
  },
  {
    id: 'jamba',
    name: 'Jamba',
    company: 'ai21_labs',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['AI21 Jamba', 'Jamba 1.5', 'Jamba-Instruct'],
    description: 'AI21 Labs\' hybrid SSM-Transformer model combining Mamba and attention layers.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── xAI (additional) ─────────────────────────────────────────────────────────

  {
    id: 'grok15',
    name: 'Grok-1.5',
    company: 'xai',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Grok 1.5', 'grok-1.5', 'Grok 1.5V', 'Grok-1.5V'],
    description: 'xAI\'s Grok-1.5 with enhanced reasoning and vision capabilities.',
    category: 'foundation_model',
    modality: ['text', 'vision'],
  },

  // ── Amazon (additional) ──────────────────────────────────────────────────────

  {
    id: 'titan_image',
    name: 'Titan Image',
    company: 'amazon',
    type: 'image_generation',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Amazon Titan Image', 'Titan Image Generator', 'Amazon Titan Image Generator'],
    description: 'Amazon\'s Titan image generation model available on AWS Bedrock.',
    category: 'image_generation',
    modality: ['text', 'image'],
  },

  // ── Microsoft (additional) ───────────────────────────────────────────────────

  {
    id: 'phi2',
    name: 'Phi-2',
    company: 'microsoft',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['Phi 2', 'phi-2', 'Microsoft Phi-2', 'Phi2'],
    description: 'Microsoft\'s 2.7B small language model demonstrating strong reasoning per parameter.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Snowflake ────────────────────────────────────────────────────────────────

  {
    id: 'arctic',
    name: 'Snowflake Arctic',
    company: 'snowflake',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Arctic', 'Snowflake Arctic Instruct', 'Arctic Embed'],
    description: 'Snowflake\'s enterprise-focused open-weights LLM optimised for SQL and data tasks.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Databricks ───────────────────────────────────────────────────────────────

  {
    id: 'dbrx',
    name: 'DBRX',
    company: 'databricks',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['DBRX Instruct', 'Databricks DBRX', 'dbrx-instruct'],
    description: 'Databricks\' open MoE language model trained on high-quality data.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── NVIDIA ───────────────────────────────────────────────────────────────────

  {
    id: 'nemotron4',
    name: 'Nemotron-4',
    company: 'nvidia',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['NVIDIA Nemotron-4', 'Nemotron 4', 'Nemotron-4 340B', 'Nemotron-4 15B'],
    description: 'NVIDIA\'s large language model trained for enterprise and research applications.',
    category: 'foundation_model',
    modality: ['text'],
  },
  {
    id: 'nvidia_nim',
    name: 'NVIDIA NIM',
    company: 'nvidia',
    type: 'other',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['NIM', 'NVIDIA NIM microservices', 'NIM microservices'],
    description: 'NVIDIA\'s inference microservices platform for deploying optimised AI models at scale.',
    category: 'other',
    modality: ['text', 'vision'],
  },

  // ── Alibaba (additional) ─────────────────────────────────────────────────────

  {
    id: 'qwen15',
    name: 'Qwen 1.5',
    company: 'alibaba',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: true,
    aliases: ['Qwen1.5', 'qwen-1.5', 'Alibaba Qwen 1.5', 'Qwen 1.5 72B'],
    description: 'Alibaba\'s Qwen 1.5 open-weights LLM series, the predecessor to Qwen 2.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Tencent ──────────────────────────────────────────────────────────────────

  {
    id: 'hunyuan',
    name: 'Hunyuan',
    company: 'tencent',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Tencent Hunyuan', 'Hunyuan-large', 'HunyuanDiT', 'Hunyuan Video'],
    description: 'Tencent\'s large language and multimodal model family.',
    category: 'foundation_model',
    modality: ['text', 'vision'],
  },

  // ── Runway (additional) ──────────────────────────────────────────────────────

  {
    id: 'runway_gen2',
    name: 'Runway Gen-2',
    company: 'runway',
    type: 'video_generation',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Runway Gen2', 'Gen-2', 'RunwayML Gen-2'],
    description: 'Runway\'s second-generation text-to-video and image-to-video model.',
    category: 'video_generation',
    modality: ['text', 'video', 'image'],
  },

  // ── Pika Labs ────────────────────────────────────────────────────────────────

  {
    id: 'pika_10',
    name: 'Pika 1.0',
    company: 'pika_labs',
    type: 'video_generation',
    releaseYear: 2023,
    isOpenWeights: false,
    aliases: ['Pika', 'Pika Labs 1.0', 'Pika 2.0'],
    description: 'Pika Labs\' text-to-video model for short-form video generation.',
    category: 'video_generation',
    modality: ['text', 'video'],
  },

  // ── Adept ────────────────────────────────────────────────────────────────────

  {
    id: 'act1',
    name: 'ACT-1',
    company: 'adept',
    type: 'other',
    releaseYear: 2022,
    isOpenWeights: false,
    aliases: ['Adept ACT-1', 'Action Transformer', 'ACT1'],
    description: 'Adept\'s Action Transformer, a model designed to operate computers via UI actions.',
    category: 'other',
    modality: ['text', 'vision'],
  },

  // ── Inflection AI ────────────────────────────────────────────────────────────

  {
    id: 'inflection2',
    name: 'Inflection-2',
    company: 'inflection',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Inflection 2', 'Pi model', 'Inflection-2.5', 'Inflection 2.5'],
    description: 'Inflection AI\'s large language model powering the Pi personal AI assistant.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Perplexity AI ────────────────────────────────────────────────────────────

  {
    id: 'perplexity_sonar',
    name: 'Perplexity Sonar',
    company: 'perplexity',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Sonar', 'Perplexity Sonar Large', 'Perplexity Sonar Small', 'sonar-small-online', 'sonar-medium-online'],
    description: 'Perplexity AI\'s search-augmented language model optimised for real-time web retrieval.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Reka AI ──────────────────────────────────────────────────────────────────

  {
    id: 'reka_core',
    name: 'Reka Core',
    company: 'reka',
    type: 'multimodal',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Reka', 'Reka Flash', 'Reka Edge', 'reka-core'],
    description: 'Reka AI\'s flagship multimodal model with text, vision, and video understanding.',
    category: 'multimodal',
    modality: ['text', 'vision', 'video'],
  },

  // ── Groq ecosystem ───────────────────────────────────────────────────────────

  {
    id: 'llama3_groq',
    name: 'LLaMA-3-Groq',
    company: 'groq',
    type: 'large_language_model',
    releaseYear: 2024,
    isOpenWeights: false,
    aliases: ['Mixtral-Groq', 'Groq LLaMA', 'llama-3-groq', 'Groq Mixtral', 'Llama 3 Groq'],
    description: 'Meta\'s Llama 3 and Mistral Mixtral models served via Groq\'s LPU inference infrastructure.',
    category: 'foundation_model',
    modality: ['text'],
  },

  // ── Open source / Research ───────────────────────────────────────────────────

  {
    id: 'mpt',
    name: 'MPT',
    company: 'databricks',
    type: 'large_language_model',
    releaseYear: 2023,
    isOpenWeights: true,
    aliases: ['MPT-7B', 'MPT-30B', 'MosaicML MPT', 'MPT-7B-Instruct', 'MPT-30B-Instruct'],
    description: 'MosaicML\'s open-source MPT transformer series for efficient LLM training and inference.',
    category: 'research_model',
    modality: ['text'],
  },
  {
    id: 'bloom',
    name: 'BLOOM',
    company: 'hugging_face',
    type: 'large_language_model',
    releaseYear: 2022,
    isOpenWeights: true,
    aliases: ['BigScience BLOOM', 'BLOOMZ', 'bloom-176b', 'BLOOM 176B'],
    description: 'BigScience\'s multilingual 176B open-access language model trained on 46 languages.',
    category: 'research_model',
    modality: ['text'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Look up a model by its stable id */
export function getModelById(id: string): ModelEntity | undefined {
  return MODELS.find((m) => m.id === id);
}

/**
 * Resolve a free-text model name to the canonical ModelEntity by matching
 * against id, name, and known aliases.
 *
 * Uses normalized comparison to handle punctuation/casing variants:
 *   "gpt-4o" → GPT-4o, "Claude 3.5" → Claude 3.5 Sonnet, etc.
 */
export function resolveModel(nameOrAlias: string): ModelEntity | undefined {
  const normalised = normalizeForMatch(nameOrAlias);
  return MODELS.find(
    (m) =>
      m.id === normalised ||
      normalizeForMatch(m.name) === normalised ||
      m.aliases?.some((a) => normalizeForMatch(a) === normalised)
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

/** Returns all models for a given company id */
export function getModelsByCompany(companyId: string): ModelEntity[] {
  return MODELS.filter((m) => m.company === companyId);
}

export default MODELS;
