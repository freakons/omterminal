/**
 * Site-wide configuration — single source of truth for branding, URLs, and metadata.
 */
export const siteConfig = {
  name: 'Omterminal',
  tagline: 'Every signal that moves AI. One terminal.',
  description:
    'Track AI regulation, models, funding, and policy shifts — scored by impact and structured into actionable intelligence. One terminal for every signal that matters.',
  url: 'https://omterminal.com',
  domain: 'omterminal.com',
  ogImage: '/og-image.png',
  creator: 'Omterminal',
  email: 'digest@omterminal.com',

  nav: {
    platform: [
      { label: 'Dashboard', href: '/', id: 'home', icon: 'home', chip: null },
      { label: 'Intelligence Feed', href: '/intelligence', id: 'intelligence', icon: 'zap', chip: 'LIVE' },
      { label: 'Signals', href: '/signals', id: 'signals', icon: 'activity', chip: null },
      { label: 'Regulation', href: '/regulation', id: 'regulation', icon: 'scale', chip: null },
      { label: 'Models', href: '/models', id: 'models', icon: 'cpu', chip: null },
      { label: 'Funding', href: '/funding', id: 'funding', icon: 'trending-up', chip: null },
      { label: 'Ecosystem Graph', href: '/graph', id: 'graph', icon: 'share-2', chip: null },
      { label: 'Watchlist', href: '/watchlist', id: 'watchlist', icon: 'star', chip: null },
      { label: 'Alerts', href: '/alerts', id: 'alerts', icon: 'bell', chip: null },
      { label: 'Compare', href: '/compare', id: 'compare', icon: 'columns', chip: null },
    ],
    info: [
      { label: 'About', href: '/about', id: 'about', icon: 'info' },
    ],
  },

  features: [
    { icon: '📡', title: 'Signals', body: 'Every regulation change, model release, funding round, and policy shift — scored by impact and delivered as structured intelligence, not articles.' },
    { icon: '⭐', title: 'Watchlist', body: 'Track the companies, models, and regulations that matter to your portfolio. One view, always current.' },
    { icon: '🔔', title: 'Alerts', body: 'Get notified when something moves — enforcement actions, capability jumps, acquisition signals — before the market reacts.' },
    { icon: '⚖️', title: 'Regulation Tracker', body: 'EU AI Act. US executive orders. China\'s CAC rules. Every law that affects AI deployment — tracked with plain-English impact analysis.' },
    { icon: '✅', title: 'Verified Intelligence', body: 'Zero aggregator noise. Every signal traced to a primary source and verified before it enters the terminal.' },
  ],

  stats: {
    signals: 47,
    companies: 18,
    regulations: 7,
    markets: 8,
    sources: 24,
  },
} as const;
