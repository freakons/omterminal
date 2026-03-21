/**
 * Research Sources
 *
 * Academic institutions, preprint servers, and research labs.
 * These are high-signal sources for model releases, benchmarks,
 * and foundational AI advances.
 *
 * Reliability guide:
 *    9 — Major research institution / preprint server (primary signal source)
 *    8 — Company research lab or specialist research publication
 */

import type { SourceDefinition } from '@/types/sources';

export const researchSources: SourceDefinition[] = [

  // ── arXiv preprint server (7 categories) ─────────────────────────────────

  {
    id: 'arxiv_ml',
    name: 'arXiv Machine Learning',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.LG',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_ai',
    name: 'arXiv Artificial Intelligence',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.AI',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_cl',
    name: 'arXiv Computation and Language',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.CL',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_cv',
    name: 'arXiv Computer Vision',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.CV',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_ro',
    name: 'arXiv Robotics',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.RO',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_ir',
    name: 'arXiv Information Retrieval',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.IR',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_stat_ml',
    name: 'arXiv Statistics — Machine Learning',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/stat.ML',
    reliability: 9,
    enabled: true,
  },

  // ── Academic research labs (9) ────────────────────────────────────────────

  {
    id: 'mit_csail',
    name: 'MIT CSAIL News',
    type: 'rss',
    category: 'research',
    url: 'https://www.csail.mit.edu/rss/news',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'stanford_ai_lab',
    name: 'Stanford AI Lab Blog',
    type: 'rss',
    category: 'research',
    url: 'https://ai.stanford.edu/blog/feed.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'bair_blog',
    name: 'Berkeley AI Research (BAIR) Blog',
    type: 'rss',
    category: 'research',
    url: 'https://bair.berkeley.edu/blog/feed.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'distill_pub',
    name: 'Distill.pub',
    type: 'rss',
    category: 'research',
    url: 'https://distill.pub/rss.xml',
    reliability: 9,
    enabled: false, // Distill.pub discontinued publication in 2021
  },
  {
    id: 'apple_ml_research',
    name: 'Apple Machine Learning Research',
    type: 'rss',
    category: 'research',
    url: 'https://machinelearning.apple.com/rss.xml',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'openreview',
    name: 'OpenReview',
    type: 'rss',
    category: 'research',
    url: 'https://openreview.net/rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'google_research_blog',
    name: 'Google Research Blog',
    type: 'rss',
    category: 'research',
    entity: 'Google',
    url: 'https://research.google/blog/rss/',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'microsoft_research_blog',
    name: 'Microsoft Research Blog',
    type: 'rss',
    category: 'research',
    entity: 'Microsoft',
    url: 'https://www.microsoft.com/en-us/research/feed/',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'nvidia_research_blog',
    name: 'NVIDIA Research',
    type: 'rss',
    category: 'research',
    entity: 'NVIDIA',
    url: 'https://research.nvidia.com/rss.xml',
    reliability: 8,
    enabled: true,
  },

  // ── Open research hubs (1) ────────────────────────────────────────────────

  {
    id: 'huggingface_blog',
    name: 'Hugging Face Blog',
    type: 'rss',
    category: 'research',
    url: 'https://huggingface.co/blog/feed.xml',
    reliability: 9,
    enabled: false, // duplicate id with companyBlogs.ts entry; canonical entry lives there
  },

  // ── Research aggregators (10) ─────────────────────────────────────────────

  {
    id: 'papers_with_code',
    name: 'Papers With Code',
    type: 'rss',
    category: 'research',
    entity: 'Papers With Code',
    url: 'https://paperswithcode.com/rss',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'huggingface_papers',
    name: 'HuggingFace Papers',
    type: 'rss',
    category: 'research',
    entity: 'HuggingFace',
    url: 'https://huggingface.co/papers/rss',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'semantic_scholar_ai',
    name: 'Semantic Scholar — Artificial Intelligence',
    type: 'rss',
    category: 'research',
    entity: 'Semantic Scholar',
    url: 'https://www.semanticscholar.org/rss/topic/artificial-intelligence',
    reliability: 10,
    enabled: true,
  },
  {
    id: 'ml_collective',
    name: 'ML Collective',
    type: 'rss',
    category: 'research',
    entity: 'ML Collective',
    url: 'https://mlcollective.org/feed/',
    reliability: 10,
    enabled: true,
  },

  // ── Major AI conferences (9) ──────────────────────────────────────────────

  {
    id: 'neurips_blog',
    name: 'NeurIPS Blog',
    type: 'rss',
    category: 'research',
    entity: 'NeurIPS',
    url: 'https://neurips.cc/feeds/blog.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'icml_blog',
    name: 'ICML Blog',
    type: 'rss',
    category: 'research',
    entity: 'ICML',
    url: 'https://icml.cc/feeds/blog.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'iclr_blog',
    name: 'ICLR Blog',
    type: 'rss',
    category: 'research',
    entity: 'ICLR',
    url: 'https://iclr.cc/feeds/blog.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'cvpr_blog',
    name: 'CVPR Blog',
    type: 'rss',
    category: 'research',
    entity: 'CVPR',
    url: 'https://cvpr.thecvf.com/feeds/blog.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'aaai_blog',
    name: 'AAAI Blog',
    type: 'rss',
    category: 'research',
    entity: 'AAAI',
    url: 'https://aaai.org/feed/',
    reliability: 9,
    enabled: true,
  },

  // ── Benchmark / model tracking (8) ───────────────────────────────────────

  {
    id: 'papers_with_code_trending',
    name: 'Papers With Code Trending',
    type: 'rss',
    category: 'research',
    entity: 'Papers With Code',
    url: 'https://paperswithcode.com/trending/rss',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'huggingface_trending_models',
    name: 'HuggingFace Trending Models',
    type: 'rss',
    category: 'research',
    entity: 'HuggingFace',
    url: 'https://huggingface.co/models?sort=trending&format=rss',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'huggingface_datasets',
    name: 'HuggingFace Datasets',
    type: 'rss',
    category: 'research',
    entity: 'HuggingFace',
    url: 'https://huggingface.co/datasets?format=rss',
    reliability: 8,
    enabled: false, // high-volume, low intelligence value; dataset uploads ≠ AI intelligence signal
  },

  // ── Additional university labs (3) — Tier 1 ──────────────────────────────

  {
    id: 'mit_news_ai',
    name: 'MIT News — Artificial Intelligence',
    type: 'rss',
    category: 'research',
    url: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'cmu_ml_blog',
    name: 'CMU Machine Learning Blog',
    type: 'rss',
    category: 'research',
    url: 'https://blog.ml.cmu.edu/feed/',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'oxford_internet_institute',
    name: 'Oxford Internet Institute Blog',
    type: 'rss',
    category: 'research',
    url: 'https://www.oii.ox.ac.uk/feed/',
    reliability: 8,
    enabled: true,
  },

  // ── Journals & scholarly publications (2) — Tier 1 ───────────────────────

  {
    id: 'nature_machine_intelligence',
    name: 'Nature Machine Intelligence',
    type: 'rss',
    category: 'research',
    url: 'https://www.nature.com/natmachintell.rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'jmlr',
    name: 'Journal of Machine Learning Research',
    type: 'rss',
    category: 'research',
    url: 'https://jmlr.org/jmlr.xml',
    reliability: 9,
    enabled: true,
  },

  // ── AI education & learning (1) — Tier 1 ─────────────────────────────────

  {
    id: 'deeplearning_ai_blog',
    name: 'DeepLearning.AI Blog',
    type: 'rss',
    category: 'research',
    entity: 'DeepLearning.AI',
    url: 'https://www.deeplearning.ai/blog/rss/',
    reliability: 9,
    enabled: true,
  },

  // ── National AI institutes (2) — Tier 1 ──────────────────────────────────

  {
    id: 'vector_institute_blog',
    name: 'Vector Institute Blog',
    type: 'rss',
    category: 'research',
    url: 'https://vectorinstitute.ai/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'mila_news',
    name: 'MILA Quebec AI Institute',
    type: 'rss',
    category: 'research',
    url: 'https://mila.quebec/en/feeds/',
    reliability: 9,
    enabled: true,
  },

  // ── Additional arXiv categories (2) — Tier 1 ─────────────────────────────

  {
    id: 'arxiv_ne',
    name: 'arXiv Neural & Evolutionary Computing',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.NE',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_ma',
    name: 'arXiv Multiagent Systems',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.MA',
    reliability: 9,
    enabled: true,
  },

  // ── Scholarly tech news (1) — Tier 2 ─────────────────────────────────────

  {
    id: 'acm_tech_news',
    name: 'ACM TechNews',
    type: 'rss',
    category: 'research',
    url: 'https://technews.acm.org/feed/',
    reliability: 8,
    enabled: true,
  },

  // ── Additional research labs — wave 2 (6) ──────────────────────────────
  // Added 2026-03: Source expansion week

  {
    id: 'princeton_nlp',
    name: 'Princeton NLP Blog',
    type: 'rss',
    category: 'research',
    url: 'https://princeton-nlp.github.io/feed.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'toronto_ml',
    name: 'University of Toronto ML Group',
    type: 'rss',
    category: 'research',
    url: 'https://mlg.eng.cam.ac.uk/blog/feed.xml',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'eth_ai_center',
    name: 'ETH Zurich AI Center',
    type: 'rss',
    category: 'research',
    url: 'https://ai.ethz.ch/news/feed.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'max_planck_is',
    name: 'Max Planck Institute for Intelligent Systems',
    type: 'rss',
    category: 'research',
    url: 'https://is.mpg.de/news/feed',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'inria_ai',
    name: 'INRIA AI Research News',
    type: 'rss',
    category: 'research',
    url: 'https://www.inria.fr/en/rss.xml',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'kaist_ai',
    name: 'KAIST AI Institute',
    type: 'rss',
    category: 'research',
    url: 'https://ai.kaist.ac.kr/feed/',
    reliability: 8,
    enabled: true,
  },

  // ── Additional arXiv categories (3) ──────────────────────────────────────

  {
    id: 'arxiv_se',
    name: 'arXiv Software Engineering',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.SE',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_dc',
    name: 'arXiv Distributed Computing',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.DC',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'arxiv_hc',
    name: 'arXiv Human-Computer Interaction',
    type: 'arxiv',
    category: 'research',
    url: 'https://arxiv.org/rss/cs.HC',
    reliability: 9,
    enabled: true,
  },

  // ── Additional journals (3) ──────────────────────────────────────────────

  {
    id: 'nature_ai',
    name: 'Nature — Artificial Intelligence',
    type: 'rss',
    category: 'research',
    url: 'https://www.nature.com/search.rss?q=artificial+intelligence&order=date_desc',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'science_robotics',
    name: 'Science Robotics',
    type: 'rss',
    category: 'research',
    url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=scirobotics',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'transactions_on_ml',
    name: 'Transactions on Machine Learning Research',
    type: 'rss',
    category: 'research',
    url: 'https://jmlr.org/tmlr/feed.xml',
    reliability: 9,
    enabled: true,
  },
];
