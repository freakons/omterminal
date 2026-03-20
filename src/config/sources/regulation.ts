/**
 * Regulation Sources
 *
 * Government bodies, regulatory agencies, and international standards
 * organisations publishing AI policy, guidance, and compliance frameworks.
 *
 * Reliability guide:
 *    9 — Official government or intergovernmental body
 */

import type { SourceDefinition } from '@/types/sources';

export const regulationSources: SourceDefinition[] = [

  // ── Government & regulatory bodies (5) ───────────────────────────────────

  {
    id: 'eu_ai_office',
    name: 'EU AI Office',
    type: 'regulation',
    category: 'policy',
    url: 'https://digital-strategy.ec.europa.eu/en/policies/artificial-intelligence/rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'whitehouse_ostp',
    name: 'White House OSTP AI Policy',
    type: 'regulation',
    category: 'policy',
    url: 'https://www.whitehouse.gov/ostp/news-updates/feed/',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'uk_ai_safety_institute',
    name: 'UK AI Safety Institute',
    type: 'regulation',
    category: 'policy',
    url: 'https://www.gov.uk/government/organisations/ai-safety-institute.atom',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'oecd_ai_policy',
    name: 'OECD AI Policy Observatory',
    type: 'regulation',
    category: 'policy',
    url: 'https://oecd.ai/en/feed',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'nist_ai',
    name: 'NIST AI Program',
    type: 'regulation',
    category: 'policy',
    url: 'https://www.nist.gov/blogs/taking-measure/rss.xml',
    reliability: 9,
    enabled: true,
  },

  // ── Additional government regulatory bodies (2) — Tier 1 ─────────────────

  {
    id: 'ftc_news',
    name: 'FTC News & Events',
    type: 'regulation',
    category: 'policy',
    url: 'https://www.ftc.gov/feeds/ftc-news.xml',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'alan_turing_institute',
    name: 'Alan Turing Institute News',
    type: 'regulation',
    category: 'policy',
    url: 'https://www.turing.ac.uk/news/all/rss',
    reliability: 9,
    enabled: true,
  },

  // ── Policy research & think tanks (5) — Tier 1 ───────────────────────────

  {
    id: 'stanford_hai_news',
    name: 'Stanford HAI News',
    type: 'rss',
    category: 'policy',
    url: 'https://hai.stanford.edu/news/rss',
    reliability: 9,
    enabled: true,
  },
  {
    id: 'brookings_ai',
    name: 'Brookings AI Policy',
    type: 'rss',
    category: 'policy',
    url: 'https://www.brookings.edu/topic/artificial-intelligence/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'cnas_ai',
    name: 'Center for a New American Security',
    type: 'rss',
    category: 'policy',
    url: 'https://www.cnas.org/feed',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'cset_ai',
    name: 'Center for Security and Emerging Technology',
    type: 'rss',
    category: 'policy',
    url: 'https://cset.georgetown.edu/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'ai_now_institute',
    name: 'AI Now Institute',
    type: 'rss',
    category: 'policy',
    url: 'https://ainowinstitute.org/feed',
    reliability: 8,
    enabled: true,
  },

  // ── AI safety & existential risk (3) — Tier 1 ────────────────────────────

  {
    id: 'future_of_life_institute',
    name: 'Future of Life Institute',
    type: 'rss',
    category: 'policy',
    url: 'https://futureoflife.org/feed/',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'alignment_forum',
    name: 'Alignment Forum',
    type: 'rss',
    category: 'policy',
    url: 'https://www.alignmentforum.org/feed.xml',
    reliability: 8,
    enabled: true,
  },
  {
    id: 'eff_deeplinks',
    name: 'EFF Deeplinks (AI & Privacy)',
    type: 'rss',
    category: 'policy',
    url: 'https://www.eff.org/rss/updates.xml',
    reliability: 8,
    enabled: true,
  },
];
