/**
 * Omterminal — Snapshot Generator
 *
 * Synthesises intelligence signals into a structured IntelligenceSnapshot.
 * Sits at the end of the signals pipeline and produces a human-readable
 * brief with headline, summary, key entities, and curated signals.
 *
 * Pipeline position:
 *   signal store → snapshotGenerator → snapshot store
 *
 * Functions:
 *   generateSnapshotFromSignals — derive a snapshot from an array of Signals
 */

import { createHash } from 'crypto';
import type {
  Signal,
  SignalType,
  IntelligenceSnapshot,
  ISODateString,
} from '@/types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a deterministic snapshot ID from the sorted set of signal IDs.
 * Identical signal sets always produce the same snapshot ID, enabling
 * idempotent persistence.
 */
function deriveSnapshotId(signals: Signal[]): string {
  const sorted = signals.map((s) => s.id).sort();
  const hash = createHash('sha256').update(sorted.join('|')).digest('hex');
  return `snap_${hash.slice(0, 16)}`;
}

/**
 * Determine the period start/end from the earliest and latest signal
 * createdAt timestamps. Falls back to "now" if the array is empty.
 */
function derivePeriod(signals: Signal[]): {
  periodStart: ISODateString;
  periodEnd: ISODateString;
} {
  const now = new Date().toISOString();
  if (signals.length === 0) {
    return { periodStart: now, periodEnd: now };
  }
  const ts = signals.map((s) => new Date(s.createdAt).getTime());
  return {
    periodStart: new Date(Math.min(...ts)).toISOString(),
    periodEnd:   new Date(Math.max(...ts)).toISOString(),
  };
}

/** Format a month-year label for use in headlines, e.g. "March 2026" */
function monthLabel(isoDate: ISODateString): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  });
}

/**
 * Aggregate all unique entity names referenced across signals.
 * Returns up to 10 entities, deduplicated, preserving appearance order.
 */
function extractKeyEntities(signals: Signal[]): string[] {
  const seen = new Set<string>();
  for (const signal of signals) {
    for (const entity of signal.affectedEntities ?? []) {
      seen.add(entity);
    }
  }
  return Array.from(seen).slice(0, 10);
}

/**
 * Group signals by type for analysis.
 */
function groupByType(signals: Signal[]): Partial<Record<SignalType, Signal[]>> {
  const groups: Partial<Record<SignalType, Signal[]>> = {};
  for (const signal of signals) {
    if (!signal.type) continue;
    if (!groups[signal.type]) groups[signal.type] = [];
    groups[signal.type]!.push(signal);
  }
  return groups;
}

/**
 * Build a concise editorial headline for the snapshot period.
 * Priority is given to the most signal-rich combination of types.
 */
function buildHeadline(
  signals: Signal[],
  periodEnd: ISODateString,
): string {
  const label = monthLabel(periodEnd);
  const types = new Set(signals.map((s) => s.type).filter(Boolean));

  if (types.has('MODEL_RELEASE_WAVE') && types.has('CAPITAL_ACCELERATION')) {
    return `AI Intelligence Brief — ${label}`;
  }
  if (types.has('CAPITAL_ACCELERATION')) {
    return `Capital Intelligence Brief — ${label}`;
  }
  if (types.has('MODEL_RELEASE_WAVE')) {
    return `Model Release Intelligence Brief — ${label}`;
  }
  if (types.has('REGULATION_ACTIVITY')) {
    return `Regulatory Intelligence Brief — ${label}`;
  }
  if (types.has('RESEARCH_MOMENTUM')) {
    return `Research Intelligence Brief — ${label}`;
  }
  if (types.has('COMPANY_EXPANSION')) {
    return `Expansion Intelligence Brief — ${label}`;
  }
  return `Intelligence Brief — ${label}`;
}

/**
 * Build a natural-language paragraph summarising what the signals indicate.
 * Uses deterministic templates based on signal types and directions.
 */
function buildSummary(signals: Signal[], keyEntities: string[]): string {
  if (signals.length === 0) {
    return 'No significant signals detected in the current period.';
  }

  const groups = groupByType(signals);
  const parts: string[] = [];

  if (groups['CAPITAL_ACCELERATION']?.some((s) => s.direction === 'bullish')) {
    parts.push(
      'Recent signals indicate accelerating capital investment in frontier AI companies alongside increased model release activity.',
    );
  }

  if (groups['MODEL_RELEASE_WAVE']) {
    parts.push(
      'Increased model release activity signals heightened competitive momentum across leading AI labs.',
    );
  }

  if (groups['REGULATION_ACTIVITY']) {
    parts.push(
      'Regulatory activity is intensifying, with multiple policy developments emerging across key jurisdictions.',
    );
  }

  if (groups['RESEARCH_MOMENTUM']) {
    parts.push(
      'Research momentum is building, with clusters of significant breakthroughs being published.',
    );
  }

  if (groups['COMPANY_EXPANSION']) {
    parts.push(
      'Company expansion signals detected across partnerships, acquisitions, and product launches.',
    );
  }

  if (keyEntities.length > 0) {
    const listed = keyEntities.slice(0, 3).join(', ');
    parts.push(`Key entities in focus: ${listed}.`);
  }

  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate an IntelligenceSnapshot from a set of Signals.
 *
 * The snapshot:
 *  - Derives a deterministic ID from the signal set
 *  - Covers the period spanned by the signals' createdAt timestamps
 *  - Generates an editorial headline and natural-language summary
 *  - Surfaces high-confidence signals (≥ 0.60) sorted by confidence
 *  - Aggregates key entities from signal affectedEntities fields
 *
 * @param signals  Array of Signal objects to synthesise. Empty arrays are safe.
 * @returns        A fully-populated IntelligenceSnapshot ready for persistence.
 */
export function generateSnapshotFromSignals(
  signals: Signal[],
): IntelligenceSnapshot {
  const { periodStart, periodEnd } = derivePeriod(signals);
  const id          = deriveSnapshotId(signals);
  const keyEntities = extractKeyEntities(signals);
  const headline    = buildHeadline(signals, periodEnd);
  const summary     = buildSummary(signals, keyEntities);

  // Surface signals that meet the confidence threshold, highest first
  const keySignals = [...signals]
    .filter((s) => s.confidenceScore >= 0.6)
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  return {
    id,
    periodStart,
    periodEnd,
    generatedAt:      new Date().toISOString(),
    headline,
    summary,
    keySignals,
    // Model releases, funding rounds, and regulations are enriched downstream
    // by the pipeline; we initialise them as empty arrays here.
    topModelReleases: [],
    majorFunding:     [],
    newRegulations:   [],
  };
}
