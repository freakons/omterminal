/**
 * JSON-LD schema builders for structured data.
 * Helps search engines and AI crawlers understand page content.
 */

import { siteConfig } from '@/config/site';

/** Organization + WebSite schemas for the root layout */
export function buildSiteSchemas() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      email: siteConfig.email,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
    },
  ];
}

/** Article JSON-LD for signal detail pages */
export function buildArticleSchema(opts: {
  headline: string;
  description: string;
  datePublished: string;
  url: string;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    url: opts.url,
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(', ') } : {}),
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

/** Organization JSON-LD for entity dossier pages */
export function buildEntitySchema(opts: {
  name: string;
  pageUrl: string;
  description?: string | null;
  foundingDate?: number;
  website?: string | null;
  sameAs?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.pageUrl,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.foundingDate && opts.foundingDate > 0 ? { foundingDate: String(opts.foundingDate) } : {}),
    ...(opts.website ? { sameAs: opts.website } : {}),
  };
}

/** Dataset JSON-LD for the signals list page */
export function buildDatasetSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Omterminal AI Intelligence Signals',
    description:
      'Real-time AI intelligence signals covering model releases, funding rounds, regulatory shifts, and research breakthroughs — scored by impact and corroborated by multiple sources.',
    url: `${siteConfig.url}/signals`,
    creator: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    keywords: [
      'AI signals',
      'artificial intelligence',
      'AI intelligence',
      'AI funding',
      'AI regulation',
      'AI models',
      'machine learning',
    ],
  };
}
