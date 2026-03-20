/**
 * Omterminal — Intelligence Briefing Generator
 *
 * Pure function that transforms recent signals into a structured intelligence
 * briefing. Reuses existing ranking, significance, and insight logic.
 *
 * No I/O — operates on pre-fetched Signal[] data.
 */

import type { Signal, SignalCategory } from '@/data/mockSignals';
import { composeFeed, getSignificanceTier, type SignalWithRankMeta } from '@/lib/signals/feedComposer';
import { clusterSignals, type SignalCluster } from '@/lib/signals/clusterSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BriefingSignal {
  id: string;
  title: string;
  entityName: string;
  category: SignalCategory;
  significance: number;
  tier: 'critical' | 'high' | 'standard' | 'low';
  summary: string;
  date: string;
}

export interface BriefingEntity {
  name: string;
  signalCount: number;
  categories: SignalCategory[];
  topSignificance: number;
}

export interface CategoryBreakdown {
  category: SignalCategory;
  label: string;
  count: number;
  avgSignificance: number;
}

export interface IntelligenceBriefing {
  /** Briefing title, e.g. "Intelligence Briefing — Mar 14–20, 2026" */
  title: string;
  /** Period covered */
  period: { from: string; to: string };
  /** 2–4 sentence executive summary */
  summary: string;
  /** Top 5 signals by significance */
  topSignals: BriefingSignal[];
  /** Top entities by activity */
  topEntities: BriefingEntity[];
  /** Category breakdown */
  categories: CategoryBreakdown[];
  /** "Why this period matters" analysis */
  whyThisPeriodMatters: string;
  /** Emerging trend clusters */
  trends: { title: string; summary: string; momentum: string; signalCount: number }[];
  /** Total signal count in period */
  totalSignals: number;
  /** Generated timestamp */
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category labels
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<SignalCategory, string> = {
  models: 'Models',
  funding: 'Funding',
  regulation: 'Regulation',
  agents: 'Agents',
  research: 'Research',
  product: 'Product',
};

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function filterByPeriod(signals: Signal[], days: number, now?: Date): Signal[] {
  const reference = now ?? new Date();
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - days);
  return signals.filter((s) => new Date(s.date) >= cutoff);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractTopEntities(signals: Signal[], limit = 5): BriefingEntity[] {
  const entityMap = new Map<string, { signals: Signal[] }>();

  for (const signal of signals) {
    const name = signal.entityName;
    if (!name) continue;
    if (!entityMap.has(name)) entityMap.set(name, { signals: [] });
    entityMap.get(name)!.signals.push(signal);
  }

  return Array.from(entityMap.entries())
    .map(([name, data]) => {
      const categories = [...new Set(data.signals.map((s) => s.category))];
      const topSignificance = Math.max(
        ...data.signals.map((s) => s.significanceScore ?? s.confidence ?? 0),
      );
      return {
        name,
        signalCount: data.signals.length,
        categories,
        topSignificance,
      };
    })
    .sort((a, b) => {
      // Sort by signal count first, then by top significance
      if (b.signalCount !== a.signalCount) return b.signalCount - a.signalCount;
      return b.topSignificance - a.topSignificance;
    })
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Category breakdown
// ─────────────────────────────────────────────────────────────────────────────

function buildCategoryBreakdown(signals: Signal[]): CategoryBreakdown[] {
  const catMap = new Map<SignalCategory, { count: number; sigSum: number }>();

  for (const signal of signals) {
    const cat = signal.category;
    if (!catMap.has(cat)) catMap.set(cat, { count: 0, sigSum: 0 });
    const entry = catMap.get(cat)!;
    entry.count++;
    entry.sigSum += signal.significanceScore ?? signal.confidence ?? 50;
  }

  return Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      count: data.count,
      avgSignificance: Math.round(data.sigSum / data.count),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary generation
// ─────────────────────────────────────────────────────────────────────────────

function generateSummary(
  topSignals: BriefingSignal[],
  categories: CategoryBreakdown[],
  entities: BriefingEntity[],
  totalCount: number,
): string {
  const parts: string[] = [];

  // Lead with volume
  const topCat = categories[0];
  parts.push(
    `${totalCount} intelligence signals detected this period${topCat ? `, led by ${topCat.label.toLowerCase()} activity (${topCat.count} signals)` : ''}.`,
  );

  // Highlight top signal
  if (topSignals.length > 0) {
    const top = topSignals[0];
    parts.push(
      `The highest-significance development: ${top.entityName}'s ${top.title.toLowerCase().slice(0, 80)}.`,
    );
  }

  // Entity breadth
  if (entities.length >= 3) {
    const names = entities.slice(0, 3).map((e) => e.name).join(', ');
    parts.push(`Key entities active: ${names}.`);
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// "Why this period matters"
// ─────────────────────────────────────────────────────────────────────────────

function generateWhyThisPeriodMatters(
  topSignals: BriefingSignal[],
  categories: CategoryBreakdown[],
  trends: SignalCluster[],
  totalCount: number,
): string {
  const parts: string[] = [];

  // Critical signals
  const criticalCount = topSignals.filter((s) => s.tier === 'critical').length;
  const highCount = topSignals.filter((s) => s.tier === 'high').length;

  if (criticalCount > 0) {
    parts.push(
      `${criticalCount} critical-tier signal${criticalCount > 1 ? 's' : ''} emerged, indicating major shifts that warrant immediate attention.`,
    );
  } else if (highCount > 0) {
    parts.push(
      `${highCount} high-significance signal${highCount > 1 ? 's' : ''} point to meaningful developments across the AI ecosystem.`,
    );
  }

  // Multi-category activity
  if (categories.length >= 3) {
    parts.push(
      `Activity spans ${categories.length} categories, suggesting broad ecosystem movement rather than isolated events.`,
    );
  }

  // Rising trends
  const risingTrends = trends.filter((t) => t.momentum === 'rising');
  if (risingTrends.length > 0) {
    parts.push(
      `${risingTrends.length} emerging trend${risingTrends.length > 1 ? 's' : ''} show${risingTrends.length === 1 ? 's' : ''} accelerating momentum: ${risingTrends.map((t) => t.title).join(', ')}.`,
    );
  }

  // Fallback
  if (parts.length === 0) {
    parts.push(
      `${totalCount} signals were detected this period. Monitoring continues for developments that cross significance thresholds.`,
    );
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured intelligence briefing from recent signals.
 *
 * @param signals  All available signals (will be filtered to the period)
 * @param days     Lookback period in days (default: 7)
 * @param now      Override current time for deterministic output
 */
export function generateBriefing(
  signals: Signal[],
  days = 7,
  now?: Date,
): IntelligenceBriefing {
  const reference = now ?? new Date();
  const periodStart = new Date(reference);
  periodStart.setDate(periodStart.getDate() - days);

  // Filter to period
  const periodSignals = filterByPeriod(signals, days, reference);

  // Rank and compose using existing feed logic
  const composed: SignalWithRankMeta[] = composeFeed(periodSignals, {
    minSignificance: 0,
    attachRankMetadata: true,
  });

  // Top 5 signals
  const topSignals: BriefingSignal[] = composed.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    entityName: s.entityName,
    category: s.category,
    significance: s.significanceScore ?? s.confidence ?? 0,
    tier: getSignificanceTier(s.significanceScore),
    summary: s.context?.summary ?? s.whyThisMatters ?? s.summary,
    date: s.date,
  }));

  // Entity analysis
  const topEntities = extractTopEntities(periodSignals);

  // Category breakdown
  const categories = buildCategoryBreakdown(periodSignals);

  // Trend clusters (reuse existing clustering)
  const clusters = clusterSignals(periodSignals, reference);
  const trends = clusters.slice(0, 3).map((c) => ({
    title: c.title,
    summary: c.summary,
    momentum: c.momentum,
    signalCount: c.signalCount,
  }));

  // Generate narrative sections
  const summary = generateSummary(topSignals, categories, topEntities, periodSignals.length);
  const whyThisPeriodMatters = generateWhyThisPeriodMatters(
    topSignals,
    categories,
    clusters,
    periodSignals.length,
  );

  // Title
  const title = `Intelligence Briefing — ${formatDate(periodStart)} – ${formatDate(reference)}`;

  return {
    title,
    period: { from: periodStart.toISOString(), to: reference.toISOString() },
    summary,
    topSignals,
    topEntities,
    categories,
    whyThisPeriodMatters,
    trends,
    totalSignals: periodSignals.length,
    generatedAt: reference.toISOString(),
  };
}
