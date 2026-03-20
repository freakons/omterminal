/**
 * TopEntitiesSection — Shows the most active entities in the last 24 hours.
 *
 * Derives entity activity from signals: counts signals per entity,
 * ranks by count, and displays the top 5 with category breakdown.
 *
 * Server component — no client JS.
 */

import Link from 'next/link';
import type { Signal, SignalCategory } from '@/data/mockSignals';

const CATEGORY_COLOR: Record<SignalCategory, string> = {
  models:     '#a78bfa',
  funding:    '#fbbf24',
  regulation: '#fb7185',
  research:   '#38bdf8',
  agents:     '#67e8f9',
  product:    '#34d399',
};

interface EntityActivity {
  name: string;
  slug: string;
  signalCount: number;
  categories: SignalCategory[];
  topSignalTitle: string;
}

function deriveTopEntities(signals: Signal[], limit = 5): EntityActivity[] {
  const entityMap = new Map<string, {
    count: number;
    categories: Set<SignalCategory>;
    topScore: number;
    topTitle: string;
  }>();

  for (const s of signals) {
    if (!s.entityName) continue;
    const key = s.entityName;
    const existing = entityMap.get(key);
    const score = s.significanceScore ?? s.confidence ?? 0;

    if (existing) {
      existing.count++;
      existing.categories.add(s.category);
      if (score > existing.topScore) {
        existing.topScore = score;
        existing.topTitle = s.title;
      }
    } else {
      entityMap.set(key, {
        count: 1,
        categories: new Set([s.category]),
        topScore: score,
        topTitle: s.title,
      });
    }
  }

  return Array.from(entityMap.entries())
    .map(([name, data]) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      signalCount: data.count,
      categories: Array.from(data.categories),
      topSignalTitle: data.topTitle,
    }))
    .sort((a, b) => b.signalCount - a.signalCount)
    .slice(0, limit);
}

interface TopEntitiesSectionProps {
  signals: Signal[];
}

export function TopEntitiesSection({ signals }: TopEntitiesSectionProps) {
  const entities = deriveTopEntities(signals);
  if (entities.length === 0) return null;

  return (
    <section className="daily-section" aria-label="Top Entities Today">
      <div className="daily-section-header">
        <span className="daily-section-label">Top Entities (24h)</span>
        <Link href="/signals" className="daily-section-link">View all</Link>
      </div>
      <div className="top-entities-grid">
        {entities.map((entity) => (
          <Link
            key={entity.name}
            href={`/entity/${entity.slug}`}
            className="top-entity-card"
          >
            <div className="top-entity-row">
              <span className="top-entity-name">{entity.name}</span>
              <span className="top-entity-count">
                {entity.signalCount} signal{entity.signalCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="top-entity-cats">
              {entity.categories.map((cat) => (
                <span
                  key={cat}
                  className="top-entity-dot"
                  title={cat}
                  style={{ background: CATEGORY_COLOR[cat] }}
                />
              ))}
            </div>
            <div className="top-entity-signal">{truncate(entity.topSignalTitle, 60)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}
