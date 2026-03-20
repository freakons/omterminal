export interface AIModel {
  id: string;
  name: string;
  company: string;
  icon: string;
  releaseDate: string;
  type: 'proprietary' | 'open-weight' | 'open-source';
  contextWindow: string;
  keyCapability: string;
  summary: string;
}

export const MODELS: AIModel[] = [
  // ── Frontier closed ─────────────────────────────────────────────────────────
  {
    id: 'claude-opus-4', name: 'Claude Opus 4', company: 'Anthropic', icon: '🟣',
    releaseDate: 'Feb 2026', type: 'proprietary', contextWindow: '200K',
    keyCapability: 'Extended thinking, agentic coding',
    summary: 'Most capable Claude model with extended thinking for complex multi-step reasoning. #1 on SWE-bench for agentic coding tasks.',
  },
  {
    id: 'gpt-5', name: 'GPT-5', company: 'OpenAI', icon: '🟢',
    releaseDate: 'Jan 2026', type: 'proprietary', contextWindow: '128K',
    keyCapability: 'Multimodal reasoning, tool use',
    summary: 'Next-generation GPT model with improved reasoning, multimodal capabilities, and native tool use integration.',
  },
  {
    id: 'gpt4o', name: 'GPT-4o', company: 'OpenAI', icon: '🟢',
    releaseDate: 'May 2024', type: 'proprietary', contextWindow: '128K',
    keyCapability: 'Multimodal: text, vision, audio',
    summary: 'OpenAI\'s flagship omni model combining text, vision, and audio in a single model at faster speeds.',
  },
  {
    id: 'gemini-2', name: 'Gemini 2.0 Pro', company: 'Google DeepMind', icon: '🔵',
    releaseDate: 'Dec 2025', type: 'proprietary', contextWindow: '2M',
    keyCapability: '2M token context, multimodal',
    summary: 'Google\'s flagship model with the longest context window available, supporting text, images, audio, and video natively.',
  },
  {
    id: 'gemini-flash', name: 'Gemini Flash', company: 'Google DeepMind', icon: '🔵',
    releaseDate: 'May 2024', type: 'proprietary', contextWindow: '1M',
    keyCapability: 'Speed and cost efficiency',
    summary: 'Google\'s high-throughput Gemini variant designed for latency-sensitive and cost-sensitive applications.',
  },
  {
    id: 'grok-3', name: 'Grok-3', company: 'xAI', icon: '⚫',
    releaseDate: 'Feb 2025', type: 'proprietary', contextWindow: '128K',
    keyCapability: 'Real-time X data, reasoning',
    summary: 'xAI\'s third-generation model with significantly enhanced reasoning and real-time access to X platform data.',
  },
  {
    id: 'o3', name: 'OpenAI o3', company: 'OpenAI', icon: '🟢',
    releaseDate: 'Apr 2025', type: 'proprietary', contextWindow: '200K',
    keyCapability: 'Advanced chain-of-thought reasoning',
    summary: 'OpenAI\'s most capable reasoning model, setting state-of-the-art results on complex math and science benchmarks.',
  },
  {
    id: 'kimi-k1', name: 'Kimi k1.5', company: 'Moonshot AI', icon: '🌙',
    releaseDate: 'Jan 2025', type: 'proprietary', contextWindow: '128K',
    keyCapability: 'Long-context reasoning',
    summary: 'Moonshot AI\'s reasoning model with extended context for document-heavy tasks.',
  },

  // ── Open-weight / Open-source ────────────────────────────────────────────────
  {
    id: 'llama-4', name: 'Llama 4 Maverick', company: 'Meta', icon: '🟠',
    releaseDate: 'Feb 2026', type: 'open-weight', contextWindow: '128K',
    keyCapability: 'MoE architecture, open weights',
    summary: 'Meta\'s most capable open-weight model using mixture-of-experts architecture for efficient inference at scale.',
  },
  {
    id: 'llama-3-1', name: 'Llama 3.1 405B', company: 'Meta', icon: '🟠',
    releaseDate: 'Jul 2024', type: 'open-weight', contextWindow: '128K',
    keyCapability: 'Largest open-weights LLM',
    summary: 'Meta\'s flagship 405B open-weight model, competitive with GPT-4 class models on many benchmarks.',
  },
  {
    id: 'deepseek-v3', name: 'DeepSeek V3', company: 'DeepSeek', icon: '⚪',
    releaseDate: 'Jan 2026', type: 'open-source', contextWindow: '128K',
    keyCapability: 'Cost-efficient, near-frontier performance',
    summary: 'Chinese open-source model scoring within 2% of GPT-4o on benchmarks at 1/10th the inference cost.',
  },
  {
    id: 'deepseek-r1', name: 'DeepSeek-R1', company: 'DeepSeek', icon: '⚪',
    releaseDate: 'Jan 2025', type: 'open-source', contextWindow: '128K',
    keyCapability: 'Open-source reasoning model',
    summary: 'DeepSeek\'s open-source reasoning model matching o1 performance with full weight availability.',
  },
  {
    id: 'mistral-large-3', name: 'Mistral Large 3', company: 'Mistral AI', icon: '🔷',
    releaseDate: 'Jan 2026', type: 'open-weight', contextWindow: '128K',
    keyCapability: 'European AI, multilingual',
    summary: 'Mistral\'s flagship model emphasizing European data sovereignty and strong multilingual performance.',
  },
  {
    id: 'qwen-2-5', name: 'Qwen 2.5', company: 'Alibaba', icon: '🟡',
    releaseDate: 'Sep 2024', type: 'open-weight', contextWindow: '128K',
    keyCapability: 'Multilingual, strong on Asian languages',
    summary: 'Alibaba\'s open-weights model series excelling at multilingual tasks including Chinese, Japanese, and Korean.',
  },
  {
    id: 'phi-4', name: 'Phi-4', company: 'Microsoft', icon: '🔷',
    releaseDate: 'Dec 2024', type: 'open-weight', contextWindow: '16K',
    keyCapability: 'Small but capable at 14B',
    summary: 'Microsoft\'s Phi-4 small language model achieves frontier-level performance on math and coding with just 14B parameters.',
  },
  {
    id: 'gemma-2', name: 'Gemma 2', company: 'Google DeepMind', icon: '🔵',
    releaseDate: 'Jun 2024', type: 'open-weight', contextWindow: '8K',
    keyCapability: 'Efficient on-device inference',
    summary: 'Google\'s open-weights Gemma 2 family in 2B, 9B, and 27B sizes for deployment on consumer hardware.',
  },

  // ── Image / Video / Audio ────────────────────────────────────────────────────
  {
    id: 'dall-e-3', name: 'DALL-E 3', company: 'OpenAI', icon: '🎨',
    releaseDate: 'Oct 2023', type: 'proprietary', contextWindow: 'N/A',
    keyCapability: 'Accurate prompt following',
    summary: 'OpenAI\'s text-to-image model with superior prompt adherence, integrated natively into ChatGPT.',
  },
  {
    id: 'midjourney', name: 'Midjourney', company: 'Midjourney', icon: '🎨',
    releaseDate: 'Mar 2022', type: 'proprietary', contextWindow: 'N/A',
    keyCapability: 'Artistic quality, stylised output',
    summary: 'Leading text-to-image platform known for its distinctive aesthetic and high-quality artistic outputs.',
  },
  {
    id: 'flux-1', name: 'FLUX.1', company: 'Black Forest Labs', icon: '🎨',
    releaseDate: 'Aug 2024', type: 'open-weight', contextWindow: 'N/A',
    keyCapability: 'State-of-the-art open image model',
    summary: 'Black Forest Labs\' FLUX.1 achieves state-of-the-art image quality with open-weights variants for self-hosting.',
  },
  {
    id: 'sora', name: 'Sora', company: 'OpenAI', icon: '🎬',
    releaseDate: 'Dec 2024', type: 'proprietary', contextWindow: 'N/A',
    keyCapability: 'Long-form video generation',
    summary: 'OpenAI\'s text-to-video model capable of generating cinematic, physically consistent video up to one minute.',
  },
  {
    id: 'veo-2', name: 'Veo 2', company: 'Google DeepMind', icon: '🎬',
    releaseDate: 'Dec 2024', type: 'proprietary', contextWindow: 'N/A',
    keyCapability: 'Photorealistic video generation',
    summary: 'Google DeepMind\'s second-generation video generation model with improved motion coherence.',
  },
  {
    id: 'whisper', name: 'Whisper', company: 'OpenAI', icon: '🎙️',
    releaseDate: 'Sep 2022', type: 'open-source', contextWindow: 'N/A',
    keyCapability: 'Multilingual ASR',
    summary: 'OpenAI\'s open-source speech recognition model supporting 99 languages with robust noise handling.',
  },
];
