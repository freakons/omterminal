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

/** BreadcrumbList JSON-LD for navigation structure — helps AI crawlers understand page hierarchy */
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** NewsArticle JSON-LD for signal detail pages — enriched with entity context and article section */
export function buildArticleSchema(opts: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  keywords?: string[];
  entityName?: string;
  entityUrl?: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    url: opts.url,
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(', ') } : {}),
    ...(opts.category ? { articleSection: opts.category } : {}),
    ...(opts.entityName
      ? {
          about: {
            '@type': 'Organization',
            name: opts.entityName,
            ...(opts.entityUrl ? { url: opts.entityUrl } : {}),
          },
        }
      : {}),
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

/** Organization JSON-LD for entity dossier pages — enriched with sector, country, and tags */
export function buildEntitySchema(opts: {
  name: string;
  pageUrl: string;
  description?: string | null;
  foundingDate?: number;
  website?: string | null;
  sameAs?: string | null;
  sector?: string | null;
  country?: string | null;
  tags?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.pageUrl,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.foundingDate && opts.foundingDate > 0
      ? { foundingDate: String(opts.foundingDate) }
      : {}),
    ...(opts.website ? { sameAs: opts.website } : {}),
    ...(opts.sector ? { knowsAbout: opts.sector } : {}),
    ...(opts.country
      ? { address: { '@type': 'PostalAddress', addressCountry: opts.country } }
      : {}),
    ...(opts.tags?.length ? { keywords: opts.tags.join(', ') } : {}),
  };
}

/** FAQPage JSON-LD for signal detail pages — enables AI engines to surface direct answers */
export function buildSignalFAQSchema(opts: {
  signalTitle: string;
  summary: string;
  whyItMatters?: string | null;
  implications?: string[] | null;
}) {
  const questions: { q: string; a: string }[] = [
    {
      q: `What is the "${opts.signalTitle}" signal?`,
      a: opts.summary,
    },
  ];

  if (opts.whyItMatters) {
    questions.push({
      q: `Why does "${opts.signalTitle}" matter for AI?`,
      a: opts.whyItMatters,
    });
  }

  if (opts.implications?.length) {
    questions.push({
      q: `What are the implications of "${opts.signalTitle}"?`,
      a: opts.implications.join(' '),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
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
