/**
 * News Sources
 *
 * Tech media outlets, AI-focused newsletters, industry analysts,
 * and venture capital firms producing AI content.
 *
 * Reliability guide:
 *    8 — Established technology / business news outlet
 *    7 — Reputable VC firm or well-known industry publication
 *    6 — Independent newsletter, analyst commentary, or industry blog
 */

import type { SourceDefinition } from '@/types/sources';

export const newsSources: SourceDefinition[] = [

  // ── Tech media & newsletters (10) ─────────────────────────────────────────

  {
    id: 'techcrunch_ai',
    name: 'TechCrunch AI',
    type: 'rss',
    category: 'news',
    url: 'https://techcrunch.com/tag/artificial-intelligence/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'venturebeat_ai',
    name: 'VentureBeat AI',
    type: 'rss',
    category: 'news',
    url: 'https://venturebeat.com/category/ai/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'mit_tech_review_ai',
    name: 'MIT Technology Review AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'semafor_ai',
    name: 'Semafor AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.semafor.com/vertical/technology/rss',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'the_information',
    name: 'The Information',
    type: 'rss',
    category: 'news',
    url: 'https://www.theinformation.com/feed',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'import_ai',
    name: 'Import AI (Jack Clark)',
    type: 'rss',
    category: 'news',
    url: 'https://importai.substack.com/feed',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'ai_snake_oil',
    name: 'AI Snake Oil (Princeton)',
    type: 'rss',
    category: 'news',
    url: 'https://aisnakeoil.substack.com/feed',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'interconnects',
    name: 'Interconnects (Nathan Lambert)',
    type: 'rss',
    category: 'news',
    url: 'https://www.interconnects.ai/feed',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'stratechery',
    name: 'Stratechery',
    type: 'rss',
    category: 'news',
    url: 'https://stratechery.com/feed/',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'the_verge_ai',
    name: 'The Verge AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    reliability: 8,
    enabled: true,
  },

  // ── Venture capital & funding intelligence (8) ────────────────────────────

  {
    id: 'crunchbase_ai',
    name: 'Crunchbase News AI',
    type: 'rss',
    category: 'news',
    url: 'https://news.crunchbase.com/tag/artificial-intelligence/feed/',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'sequoia_ai',
    name: 'Sequoia Capital AI Perspectives',
    type: 'rss',
    category: 'news',
    url: 'https://www.sequoiacap.com/our-views/rss/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'a16z_ai',
    name: 'Andreessen Horowitz AI',
    type: 'rss',
    category: 'news',
    url: 'https://a16z.com/tag/ai/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'lightspeed_blog',
    name: 'Lightspeed Venture Partners Blog',
    type: 'rss',
    category: 'news',
    url: 'https://lsvp.com/feed/',
    reliability: 6,
    enabled: false, // general VC blog, low AI specificity — insufficient signal
  },
  {
    id: 'general_catalyst_blog',
    name: 'General Catalyst Insights',
    type: 'rss',
    category: 'news',
    url: 'https://www.generalcatalyst.com/perspectives/rss',
    reliability: 6,
    enabled: false, // general VC blog, low AI specificity — insufficient signal
  },
  {
    id: 'first_round_review',
    name: 'First Round Review',
    type: 'rss',
    category: 'news',
    url: 'https://review.firstround.com/feed.xml',
    reliability: 6,
    enabled: false, // startup culture/advice content, not AI intelligence
  },
  {
    id: 'techcrunch_venture',
    name: 'TechCrunch Venture',
    type: 'rss',
    category: 'news',
    url: 'https://techcrunch.com/tag/venture-capital/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'ai_fund_news',
    name: 'AI Fund Blog',
    type: 'rss',
    category: 'news',
    url: 'https://aifund.ai/blog/feed/',
    reliability: 6,
    enabled: false, // niche VC blog, very low volume, minimal incremental signal
  },

  // ── AI / tech news — Batch 2 (6) ──────────────────────────────────────────

  {
    id: 'the_decoder',
    name: 'The Decoder',
    type: 'rss',
    category: 'news',
    url: 'https://the-decoder.com/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'ai_business',
    name: 'AI Business',
    type: 'rss',
    category: 'news',
    url: 'https://aibusiness.com/rss.xml',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'wired_ai',
    name: 'Wired AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.wired.com/tag/artificial-intelligence/rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'fast_company_tech',
    name: 'Fast Company Tech',
    type: 'rss',
    category: 'news',
    url: 'https://www.fastcompany.com/section/technology/rss',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'the_register_ai',
    name: 'The Register AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.theregister.com/software/ai_ml/headlines.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'ars_technica_ai',
    name: 'Ars Technica AI',
    type: 'rss',
    category: 'news',
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    reliability: 9,
    enabled: true,
  },

  // ── Venture / startup ecosystem — Batch 2 (9) ─────────────────────────────

  {
    id: 'crunchbase_news',
    name: 'Crunchbase News',
    type: 'rss',
    category: 'news',
    url: 'https://news.crunchbase.com/feed/',
    reliability: 8,
    enabled: false, // duplicates crunchbase_ai; full feed has broad non-AI content
  },
  {
    id: 'sifted',
    name: 'Sifted',
    type: 'rss',
    category: 'news',
    url: 'https://sifted.eu/feed',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'strictly_vc',
    name: 'StrictlyVC',
    type: 'rss',
    category: 'news',
    url: 'https://www.strictlyvc.com/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'nvca_news',
    name: 'NVCA News',
    type: 'rss',
    category: 'news',
    url: 'https://nvca.org/feed/',
    reliability: 7,
    enabled: false, // VC trade association, not AI-specific; general industry noise
  },
  {
    id: 'accel_insights',
    name: 'Accel Insights',
    type: 'rss',
    category: 'news',
    url: 'https://www.accel.com/feed',
    reliability: 7,
    enabled: false, // general VC blog, low AI specificity — insufficient signal
  },
  {
    id: 'a16z_blog',
    name: 'Andreessen Horowitz Blog',
    type: 'rss',
    category: 'news',
    url: 'https://a16z.com/feed/',
    reliability: 7,
    enabled: false, // full blog duplicates a16z_ai; AI-tagged feed is sufficient
  },
  {
    id: 'sequoia_blog',
    name: 'Sequoia Capital Blog',
    type: 'rss',
    category: 'news',
    url: 'https://www.sequoiacap.com/feed/',
    reliability: 7,
    enabled: false, // full blog duplicates sequoia_ai; curated views feed is sufficient
  },
  {
    id: 'yc_blog',
    name: 'Y Combinator Blog',
    type: 'rss',
    category: 'news',
    url: 'https://www.ycombinator.com/blog/feed',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'greylock_blog',
    name: 'Greylock Blog',
    type: 'rss',
    category: 'news',
    url: 'https://greylock.com/feed/',
    reliability: 7,
    enabled: false, // general VC blog, low AI specificity — insufficient signal
  },

  // ── Chips / infra / cloud / enterprise AI — Batch 2 (8) ───────────────────

  {
    id: 'serve_the_home',
    name: 'ServeTheHome',
    type: 'rss',
    category: 'news',
    url: 'https://www.servethehome.com/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'blocks_and_files',
    name: 'Blocks and Files',
    type: 'rss',
    category: 'news',
    url: 'https://blocksandfiles.com/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'data_center_dynamics',
    name: 'Data Center Dynamics',
    type: 'rss',
    category: 'news',
    url: 'https://www.datacenterdynamics.com/en/rss/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'silicon_angle',
    name: 'SiliconANGLE',
    type: 'rss',
    category: 'news',
    url: 'https://siliconangle.com/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'cloudflare_blog',
    name: 'Cloudflare Blog',
    type: 'rss',
    category: 'news',
    url: 'https://blog.cloudflare.com/rss/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'aws_ml_blog_news',
    name: 'AWS Machine Learning Blog',
    type: 'rss',
    category: 'news',
    url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
    reliability: 9,
    enabled: false, // exact URL duplicate of aws_ml_blog in companyBlogs.ts
  },
  {
    id: 'google_cloud_ai_blog',
    name: 'Google Cloud Blog AI',
    type: 'rss',
    category: 'news',
    url: 'https://cloud.google.com/blog/topics/ai-ml/rss/',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'azure_ai_blog',
    name: 'Microsoft Azure AI Blog',
    type: 'rss',
    category: 'news',
    url: 'https://azure.microsoft.com/en-us/blog/topics/ai-machine-learning/feed/',
    reliability: 9,
    enabled: true,
  },

  // ── Automotive / robotics / industrial AI — Batch 2 (7) ───────────────────

  {
    id: 'electrek',
    name: 'Electrek',
    type: 'rss',
    category: 'news',
    url: 'https://electrek.co/feed/',
    reliability: 8,
    enabled: false, // EV consumer news, not AI-focused; covered by AV/robotics sources
  },
  {
    id: 'inside_evs',
    name: 'InsideEVs',
    type: 'rss',
    category: 'news',
    url: 'https://insideevs.com/rss/',
    reliability: 7,
    enabled: false, // EV consumer news, tangential to AI intelligence
  },
  {
    id: 'autonomous_vehicle_intl',
    name: 'Autonomous Vehicle International',
    type: 'rss',
    category: 'news',
    url: 'https://www.autonomousvehicleinternational.com/feed',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'robotics_business_review',
    name: 'Robotics Business Review',
    type: 'rss',
    category: 'news',
    url: 'https://www.roboticsbusinessreview.com/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'the_robot_report',
    name: 'The Robot Report',
    type: 'rss',
    category: 'news',
    url: 'https://www.therobotreport.com/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'industry_week',
    name: 'IndustryWeek',
    type: 'rss',
    category: 'news',
    url: 'https://www.industryweek.com/rss',
    reliability: 7,
    enabled: false, // generic manufacturing/industry trade pub, low AI signal
  },
  {
    id: 'manufacturing_net',
    name: 'Manufacturing.net',
    type: 'rss',
    category: 'news',
    url: 'https://www.manufacturing.net/rss',
    reliability: 6,
    enabled: false, // generic manufacturing trade publication, very low AI signal
  },

  // ── Tier 2: Established tech & science journalism ─────────────────────────

  {
    id: 'ieee_spectrum_ai',
    name: 'IEEE Spectrum AI',
    type: 'rss',
    category: 'news',
    url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'bloomberg_tech',
    name: 'Bloomberg Technology',
    type: 'rss',
    category: 'news',
    url: 'https://feeds.bloomberg.com/technology/news.rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'reuters_tech',
    name: 'Reuters Technology',
    type: 'rss',
    category: 'news',
    url: 'https://feeds.reuters.com/reuters/technologyNews',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'fortune_ai',
    name: 'Fortune AI',
    type: 'rss',
    category: 'news',
    url: 'https://fortune.com/tag/artificial-intelligence/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'zdnet_ai',
    name: 'ZDNet AI',
    type: 'rss',
    category: 'news',
    url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'infoq_ai',
    name: 'InfoQ AI/ML',
    type: 'rss',
    category: 'news',
    url: 'https://www.infoq.com/ai-ml-data-eng/articles.atom',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'thenewstack_ai',
    name: 'The New Stack AI',
    type: 'rss',
    category: 'news',
    url: 'https://thenewstack.io/category/machine-learning/feed/',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'science_daily_ai',
    name: 'ScienceDaily Artificial Intelligence',
    type: 'rss',
    category: 'news',
    url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'the_atlantic_tech',
    name: 'The Atlantic Technology',
    type: 'rss',
    category: 'news',
    url: 'https://www.theatlantic.com/feed/channel/technology/',
    reliability: 8,
    enabled: true,
  },

  // ── Tier 2: AI-focused newsletters & analyst commentary ───────────────────

  {
    id: 'the_batch_newsletter',
    name: 'The Batch (DeepLearning.AI)',
    type: 'rss',
    category: 'news',
    url: 'https://www.deeplearning.ai/the-batch/rss/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'ben_evans',
    name: 'Benedict Evans',
    type: 'rss',
    category: 'news',
    url: 'https://www.ben-evans.com/benedictevans?format=rss',
    reliability: 7,
    enabled: true,
  },
  {
    id: 'gradient_flow',
    name: 'Gradient Flow',
    type: 'rss',
    category: 'news',
    url: 'https://gradientflow.com/feed/',
    reliability: 7,
    enabled: true,
  },

  // ── Tier 2: Developer-oriented AI news ───────────────────────────────────

  {
    id: 'hacker_news_ai',
    name: 'Hacker News (AI / ML top posts)',
    type: 'rss',
    category: 'news',
    url: 'https://hnrss.org/newest?q=AI+machine+learning&points=100',
    reliability: 7,
    enabled: true,
  },

  // ── Tier 3: Broader AI news aggregators ──────────────────────────────────

  {
    id: 'marktechpost',
    name: 'MarkTechPost',
    type: 'rss',
    category: 'news',
    url: 'https://www.marktechpost.com/feed/',
    reliability: 6,
    enabled: true,
  },
  {
    id: 'towards_data_science',
    name: 'Towards Data Science',
    type: 'rss',
    category: 'news',
    url: 'https://towardsdatascience.com/feed',
    reliability: 6,
    enabled: true,
  },
];
