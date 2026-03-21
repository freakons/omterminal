/**
 * GitHub Sources
 *
 * GitHub release feeds and repository activity for key AI open-source
 * projects. Tracks model releases, library updates, and tooling changes.
 *
 * Source type: "github"
 * Category: "developer"
 *
 * Reliability guide:
 *   10 — Frontier AI infra / canonical model tooling repos
 *    9 — Major model ecosystem or research repos
 *    8 — Strong AI tooling / orchestration projects
 *    7 — Niche but useful ecosystem projects
 */

import type { SourceDefinition } from '@/types/sources';

export const githubSources: SourceDefinition[] = [

  // ── Language models / model tooling (8) ───────────────────────────────────

  {
    id: 'github_hf_transformers',
    name: 'Hugging Face Transformers Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/transformers/releases.atom',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'github_hf_peft',
    name: 'Hugging Face PEFT Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/peft/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_hf_safetensors',
    name: 'Hugging Face Safetensors Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/safetensors/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_hf_tgi',
    name: 'Hugging Face Text Generation Inference Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/text-generation-inference/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_llama_cpp',
    name: 'llama.cpp Releases',
    type: 'github',
    category: 'developer',
    entity: 'llama.cpp',
    url: 'https://github.com/ggerganov/llama.cpp/releases.atom',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'github_vllm',
    name: 'vLLM Releases',
    type: 'github',
    category: 'developer',
    entity: 'vLLM',
    url: 'https://github.com/vllm-project/vllm/releases.atom',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'github_ollama',
    name: 'Ollama Releases',
    type: 'github',
    category: 'developer',
    entity: 'Ollama',
    url: 'https://github.com/ollama/ollama/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_mlx',
    name: 'MLX Releases',
    type: 'github',
    category: 'developer',
    entity: 'Apple',
    url: 'https://github.com/ml-explore/mlx/releases.atom',
    reliability: 9,
    enabled: true,
  },

  // ── Agents / orchestration / tooling (6) ─────────────────────────────────

  {
    id: 'github_langgraph',
    name: 'LangGraph Releases',
    type: 'github',
    category: 'developer',
    entity: 'LangChain',
    url: 'https://github.com/langchain-ai/langgraph/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_crewai',
    name: 'CrewAI Releases',
    type: 'github',
    category: 'developer',
    entity: 'CrewAI',
    url: 'https://github.com/joaomdmoura/crewAI/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_autogen',
    name: 'AutoGen Releases',
    type: 'github',
    category: 'developer',
    entity: 'Microsoft',
    url: 'https://github.com/microsoft/autogen/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_haystack',
    name: 'Haystack Releases',
    type: 'github',
    category: 'developer',
    entity: 'deepset',
    url: 'https://github.com/deepset-ai/haystack/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_dspy',
    name: 'DSPy Releases',
    type: 'github',
    category: 'developer',
    entity: 'Stanford NLP',
    url: 'https://github.com/stanfordnlp/dspy/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_semantic_kernel',
    name: 'Semantic Kernel Releases',
    type: 'github',
    category: 'developer',
    entity: 'Microsoft',
    url: 'https://github.com/microsoft/semantic-kernel/releases.atom',
    reliability: 9,
    enabled: true,
  },

  // ── RAG / vector / infra (5) ──────────────────────────────────────────────

  {
    id: 'github_qdrant',
    name: 'Qdrant Releases',
    type: 'github',
    category: 'developer',
    entity: 'Qdrant',
    url: 'https://github.com/qdrant/qdrant/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_milvus',
    name: 'Milvus Releases',
    type: 'github',
    category: 'developer',
    entity: 'Milvus',
    url: 'https://github.com/milvus-io/milvus/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_weaviate',
    name: 'Weaviate Releases',
    type: 'github',
    category: 'developer',
    entity: 'Weaviate',
    url: 'https://github.com/weaviate/weaviate/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_chroma',
    name: 'Chroma Releases',
    type: 'github',
    category: 'developer',
    entity: 'Chroma',
    url: 'https://github.com/chroma-core/chroma/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_lancedb',
    name: 'LanceDB Releases',
    type: 'github',
    category: 'developer',
    entity: 'LanceDB',
    url: 'https://github.com/lancedb/lancedb/releases.atom',
    reliability: 7,
    enabled: false, // smallest vector DB in category; overlaps with Qdrant/Milvus/Weaviate
  },

  // ── Multimodal / diffusion / vision (3) ──────────────────────────────────

  {
    id: 'github_hf_diffusers',
    name: 'Hugging Face Diffusers Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/diffusers/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_comfyui',
    name: 'ComfyUI Releases',
    type: 'github',
    category: 'developer',
    entity: 'ComfyUI',
    url: 'https://github.com/comfyanonymous/ComfyUI/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_sd_webui',
    name: 'Stable Diffusion WebUI Releases',
    type: 'github',
    category: 'developer',
    entity: 'AUTOMATIC1111',
    url: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui/releases.atom',
    reliability: 8,
    enabled: false, // image gen UI niche; overlaps with ComfyUI; lower release cadence
  },

  // ── AI coding & agents — wave 2 (6) ─────────────────────────────────────
  // Added 2026-03: Source expansion week

  {
    id: 'github_openai_agents',
    name: 'OpenAI Agents SDK Releases',
    type: 'github',
    category: 'developer',
    entity: 'OpenAI',
    url: 'https://github.com/openai/openai-agents-python/releases.atom',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'github_anthropic_sdk',
    name: 'Anthropic SDK Releases',
    type: 'github',
    category: 'developer',
    entity: 'Anthropic',
    url: 'https://github.com/anthropics/anthropic-sdk-python/releases.atom',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'github_vercel_ai',
    name: 'Vercel AI SDK Releases',
    type: 'github',
    category: 'developer',
    entity: 'Vercel',
    url: 'https://github.com/vercel/ai/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_mistral_client',
    name: 'Mistral Client Releases',
    type: 'github',
    category: 'developer',
    entity: 'Mistral AI',
    url: 'https://github.com/mistralai/client-python/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_sglang',
    name: 'SGLang Releases',
    type: 'github',
    category: 'developer',
    entity: 'SGLang',
    url: 'https://github.com/sgl-project/sglang/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_openrouter',
    name: 'OpenRouter Releases',
    type: 'github',
    category: 'developer',
    entity: 'OpenRouter',
    url: 'https://github.com/OpenRouterTeam/openrouter-runner/releases.atom',
    reliability: 8,
    enabled: true,
  },

  // ── ML training & fine-tuning (4) ────────────────────────────────────────

  {
    id: 'github_unsloth',
    name: 'Unsloth Releases',
    type: 'github',
    category: 'developer',
    entity: 'Unsloth',
    url: 'https://github.com/unslothai/unsloth/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_axolotl',
    name: 'Axolotl Releases',
    type: 'github',
    category: 'developer',
    entity: 'Axolotl',
    url: 'https://github.com/OpenAccess-AI-Collective/axolotl/releases.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'github_trl',
    name: 'TRL (Transformer Reinforcement Learning) Releases',
    type: 'github',
    category: 'developer',
    entity: 'Hugging Face',
    url: 'https://github.com/huggingface/trl/releases.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'github_litellm',
    name: 'LiteLLM Releases',
    type: 'github',
    category: 'developer',
    entity: 'LiteLLM',
    url: 'https://github.com/BerriAI/litellm/releases.atom',
    reliability: 8,
    enabled: true,
  },
];
