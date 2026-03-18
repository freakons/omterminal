import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { getEntities, getSignals } from '@/db/queries';
import { MODELS } from '@/lib/data/models';
import { FUNDING_ROUNDS } from '@/lib/data/funding';
import { REGULATIONS } from '@/lib/data/regulations';
import { slugify } from '@/utils/sanitize';

/** Regenerate the sitemap at most once per hour */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/signals`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/intelligence`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/models`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/funding`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/regulation`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/graph`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Static data: models, funding, regulations (from local data files)
  const modelPages: MetadataRoute.Sitemap = MODELS.map((m) => ({
    url: `${base}/models/${m.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const fundingPages: MetadataRoute.Sitemap = FUNDING_ROUNDS.map((f) => ({
    url: `${base}/funding/${f.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const regulationPages: MetadataRoute.Sitemap = REGULATIONS.map((r) => ({
    url: `${base}/regulation/${r.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic entity pages from DB
  let entityPages: MetadataRoute.Sitemap = [];
  try {
    const entities = await getEntities(200);
    entityPages = entities.map((e) => ({
      url: `${base}/entity/${slugify(e.name)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — entity pages omitted from this build
  }

  // Dynamic signal pages from DB
  let signalPages: MetadataRoute.Sitemap = [];
  try {
    const signals = await getSignals(500);
    signalPages = signals.map((s) => ({
      url: `${base}/signals/${s.id}`,
      lastModified: s.date ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable — signal pages omitted from this build
  }

  return [
    ...staticPages,
    ...modelPages,
    ...fundingPages,
    ...regulationPages,
    ...entityPages,
    ...signalPages,
  ];
}
