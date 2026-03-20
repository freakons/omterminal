/**
 * Omterminal — Entity Insight Generator
 *
 * Generates structured intelligence insights for entities based on their
 * signal activity, category distribution, and ecosystem position.
 *
 * Design principles:
 *   - Pure functions — deterministic, no LLM calls or external I/O.
 *   - Grounded — every insight is derived from concrete signal data.
 *   - Concise — analyst-grade brevity.
 */

import type { Signal, SignalCategory } from '@/data/mockSignals';
import type { RelatedEntity } from '@/db/queries';
import { getSignificanceTier } from '@/lib/signals/feedComposer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityInsight {
  /** Why this entity matters in the current AI landscape. */
  whyThisMatters: string;
  /** The entity's role in the ecosystem. */
  ecosystemRole: string;
  /** Key activity areas derived from signal categories. */
  activityAreas: string[];
  /** Risk/opportunity assessment label. */
  assessment: 'critical-watch' | 'high-activity' | 'moderate' | 'emerging' | 'quiet';
  /** One-line status. */
  statusLine: string;
}

export interface EntityInsightInput {
  entityName: string;
  sector: string | null;
  country: string | null;
  signals: Signal[];
  relatedEntities: RelatedEntity[];
  metrics: {
    signalsTotal: number;
    signals7d: number;
    signals30d: number;
    avgConfidence: number;
    lastActivity: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  models: 'AI model development',
  funding: 'investment activity',
  regulation: 'regulatory developments',
  research: 'research breakthroughs',
  agents: 'AI agent deployment',
  product: 'product launches',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ');
}

function getCategoryDistribution(signals: Signal[]): { category: SignalCategory; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of signals) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category: category as SignalCategory, count }))
    .sort((a, b) => b.count - a.count);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured intelligence insight for an entity.
 * Pure function — deterministic output from input data.
 */
export function generateEntityInsight(input: EntityInsightInput): EntityInsight {
  const { entityName, sector, country, signals, relatedEntities, metrics } = input;

  const categories = getCategoryDistribution(signals);
  const topCategories = categories.slice(0, 3);
  const activityAreas = topCategories.map((c) => categoryLabel(c.category));

  // Count critical/high signals
  const criticalCount = signals.filter(
    (s) => getSignificanceTier(s.significanceScore) === 'critical',
  ).length;
  const highCount = signals.filter(
    (s) => getSignificanceTier(s.significanceScore) === 'high',
  ).length;

  // Determine assessment
  let assessment: EntityInsight['assessment'];
  if (criticalCount >= 2 || (criticalCount >= 1 && metrics.signals7d >= 5)) {
    assessment = 'critical-watch';
  } else if (highCount >= 3 || metrics.signals7d >= 4) {
    assessment = 'high-activity';
  } else if (metrics.signals30d >= 5 || highCount >= 1) {
    assessment = 'moderate';
  } else if (metrics.signalsTotal > 0) {
    assessment = 'emerging';
  } else {
    assessment = 'quiet';
  }

  // Build "why this matters"
  const whyThisMatters = buildWhyThisMatters(
    entityName, sector, signals, categories, criticalCount, highCount, metrics, relatedEntities,
  );

  // Build ecosystem role
  const ecosystemRole = buildEcosystemRole(
    entityName, sector, country, relatedEntities, categories,
  );

  // Build status line
  const statusLine = buildStatusLine(entityName, assessment, metrics);

  return {
    whyThisMatters,
    ecosystemRole,
    activityAreas,
    assessment,
    statusLine,
  };
}

function buildWhyThisMatters(
  name: string,
  sector: string | null,
  signals: Signal[],
  categories: { category: SignalCategory; count: number }[],
  criticalCount: number,
  highCount: number,
  metrics: EntityInsightInput['metrics'],
  relatedEntities: RelatedEntity[],
): string {
  if (signals.length === 0) {
    return `${name} is tracked on Omterminal${sector ? ` as a ${sector} entity` : ''} but has no recent intelligence signals. Activity may emerge as new data is ingested.`;
  }

  const parts: string[] = [];
  const topCats = categories.slice(0, 2).map((c) => categoryLabel(c.category));
  const catStr = topCats.join(' and ');

  if (criticalCount > 0) {
    parts.push(
      `${name} is generating ${criticalCount} critical intelligence signal${criticalCount !== 1 ? 's' : ''}, primarily in ${catStr}.`,
    );
  } else if (highCount > 0) {
    parts.push(
      `${name} shows elevated activity across ${catStr} with ${highCount} high-priority signal${highCount !== 1 ? 's' : ''}.`,
    );
  } else {
    parts.push(
      `${name} has ${metrics.signalsTotal} tracked signal${metrics.signalsTotal !== 1 ? 's' : ''} across ${catStr}.`,
    );
  }

  // Add acceleration context
  if (metrics.signals7d > 0 && metrics.signals30d > 0) {
    const weeklyShare = metrics.signals7d / metrics.signals30d;
    if (weeklyShare > 0.5) {
      parts.push('Activity is accelerating — most signals arrived in the past week.');
    }
  }

  // Add ecosystem context
  if (relatedEntities.length > 0) {
    const topRelated = relatedEntities.slice(0, 3).map((e) => e.name);
    parts.push(
      `Connected to ${topRelated.join(', ')} across shared intelligence signals.`,
    );
  }

  return parts.join(' ');
}

function buildEcosystemRole(
  name: string,
  sector: string | null,
  country: string | null,
  relatedEntities: RelatedEntity[],
  categories: { category: SignalCategory; count: number }[],
): string {
  const parts: string[] = [];

  if (sector) {
    parts.push(`${name} operates in the ${sector} sector`);
  } else {
    parts.push(`${name} is an entity tracked in the AI ecosystem`);
  }

  if (country) {
    parts[parts.length - 1] += ` (${country})`;
  }

  if (categories.length > 0) {
    const primary = categoryLabel(categories[0].category);
    parts[parts.length - 1] += `, with primary activity in ${primary}`;
  }

  parts[parts.length - 1] += '.';

  if (relatedEntities.length >= 3) {
    const types = new Set(relatedEntities.map((e) => e.type).filter(Boolean));
    if (types.size > 0) {
      parts.push(
        `Its ecosystem spans ${relatedEntities.length} connected entities across ${Array.from(types).slice(0, 3).join(', ')} categories.`,
      );
    } else {
      parts.push(
        `Its ecosystem includes ${relatedEntities.length} connected entities.`,
      );
    }
  }

  return parts.join(' ');
}

function buildStatusLine(
  name: string,
  assessment: EntityInsight['assessment'],
  metrics: EntityInsightInput['metrics'],
): string {
  const lastActive = metrics.lastActivity ? timeAgo(metrics.lastActivity) : null;
  const suffix = lastActive ? ` — last active ${lastActive}` : '';

  switch (assessment) {
    case 'critical-watch':
      return `${name} requires close monitoring with critical signals detected${suffix}.`;
    case 'high-activity':
      return `${name} is showing elevated intelligence activity${suffix}.`;
    case 'moderate':
      return `${name} has moderate ongoing activity${suffix}.`;
    case 'emerging':
      return `${name} is an emerging entity with limited signal data${suffix}.`;
    case 'quiet':
      return `${name} has no recent activity detected.`;
  }
}
