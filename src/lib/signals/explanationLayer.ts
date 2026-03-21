/**
 * Omterminal — Signal Explanation Layer
 *
 * Generates structured, analyst-grade explanations for signals and major
 * events.  Explanations are deterministic — derived entirely from existing
 * signal fields (significance, confidence, source support, entities, context)
 * with no LLM calls or external I/O.
 *
 * Design principles:
 *   • Pure functions — same inputs always produce the same output.
 *   • Grounded — every label and sentence is derived from concrete data.
 *   • Concise — analyst-grade brevity, not verbose prose.
 *   • Additive — consumers can attach explanation fields without breaking
 *     existing interfaces.
 *   • Reusable — works for signals, major events, and entity contexts.
 */

import type { Signal } from '@/data/mockSignals';
import type { MajorEvent } from './eventDetector';
import { getSignificanceTier } from './feedComposer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable importance label for quick scanning. */
export type ImportanceLabel =
  | 'Critical Development'
  | 'High Importance'
  | 'Notable'
  | 'Standard'
  | 'Early Signal';

/** Human-readable confidence/corroboration label. */
export type CorroborationLabel =
  | 'Widely Confirmed'
  | 'Multiple Sources Confirm'
  | 'Corroborated'
  | 'Single Source'
  | 'Unverified';

/** Human-readable confidence label derived from confidence score. */
export type ConfidenceLabel =
  | 'Very High Confidence'
  | 'High Confidence'
  | 'Moderate Confidence'
  | 'Low Confidence';

/** A single factor contributing to the explanation. */
export interface ExplanationFactor {
  /** Short label, e.g. "High significance" */
  label: string;
  /** Underlying value, e.g. "92/100" */
  value: string;
  /** Category of this factor for UI grouping. */
  type: 'significance' | 'corroboration' | 'confidence' | 'entity' | 'recency' | 'context';
}

/** Structured explanation output for a signal. */
export interface SignalExplanation {
  /** Why this signal matters — one or two sentences. */
  whyThisMatters: string;
  /** Corroboration summary — how well supported this signal is. */
  corroborationSummary: string;
  /** Entities affected by this signal. */
  affectedEntities: string[];
  /** Human-readable confidence label. */
  confidenceLabel: ConfidenceLabel;
  /** Human-readable importance label. */
  importanceLabel: ImportanceLabel;
  /** Individual factors contributing to the explanation. */
  explanationFactors: ExplanationFactor[];
  /** IDs of related/supporting signals, if any. */
  supportingSignals: string[];
}

/** Structured explanation output for a major event. */
export interface EventExplanation {
  /** Why this event matters — one or two sentences. */
  whyThisMatters: string;
  /** Corroboration summary for the event. */
  corroborationSummary: string;
  /** Entities involved in this event. */
  affectedEntities: string[];
  /** Human-readable confidence label. */
  confidenceLabel: ConfidenceLabel;
  /** Human-readable importance label. */
  importanceLabel: ImportanceLabel;
  /** Individual factors contributing to the explanation. */
  explanationFactors: ExplanationFactor[];
  /** Number of member signals. */
  signalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label generators — deterministic, data-grounded
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive an importance label from significance score.
 */
export function deriveImportanceLabel(significanceScore: number | null | undefined): ImportanceLabel {
  if (significanceScore == null) return 'Standard';
  if (significanceScore >= 85) return 'Critical Development';
  if (significanceScore >= 70) return 'High Importance';
  if (significanceScore >= 55) return 'Notable';
  if (significanceScore >= 35) return 'Standard';
  return 'Early Signal';
}

/**
 * Derive a corroboration label from source support count.
 */
export function deriveCorroborationLabel(sourceSupportCount: number | null | undefined): CorroborationLabel {
  if (sourceSupportCount == null || sourceSupportCount <= 0) return 'Unverified';
  if (sourceSupportCount >= 6) return 'Widely Confirmed';
  if (sourceSupportCount >= 4) return 'Multiple Sources Confirm';
  if (sourceSupportCount >= 2) return 'Corroborated';
  return 'Single Source';
}

/**
 * Derive a confidence label from confidence score (0–100).
 */
export function deriveConfidenceLabel(confidence: number | null | undefined): ConfidenceLabel {
  if (confidence == null) return 'Moderate Confidence';
  if (confidence >= 90) return 'Very High Confidence';
  if (confidence >= 75) return 'High Confidence';
  if (confidence >= 50) return 'Moderate Confidence';
  return 'Low Confidence';
}

/**
 * Generate an "Affects X, Y, Z" label from entity names.
 */
export function deriveAffectedLabel(entities: string[]): string {
  if (entities.length === 0) return '';
  if (entities.length === 1) return `Affects ${entities[0]}`;
  if (entities.length === 2) return `Affects ${entities[0]} and ${entities[1]}`;
  return `Affects ${entities[0]}, ${entities[1]} +${entities.length - 2} more`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation builders — signals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build explanation factors from a signal's underlying data.
 */
function buildSignalFactors(signal: Signal): ExplanationFactor[] {
  const factors: ExplanationFactor[] = [];

  // Significance
  if (signal.significanceScore != null) {
    const tier = getSignificanceTier(signal.significanceScore);
    factors.push({
      label: `${tier.charAt(0).toUpperCase() + tier.slice(1)} significance`,
      value: `${signal.significanceScore}/100`,
      type: 'significance',
    });
  }

  // Corroboration
  if (signal.sourceSupportCount != null && signal.sourceSupportCount > 0) {
    factors.push({
      label: signal.sourceSupportCount >= 4
        ? 'Strong source corroboration'
        : signal.sourceSupportCount >= 2
          ? 'Multiple source corroboration'
          : 'Single source report',
      value: `${signal.sourceSupportCount} source${signal.sourceSupportCount !== 1 ? 's' : ''}`,
      type: 'corroboration',
    });
  }

  // Confidence
  if (signal.confidence != null) {
    factors.push({
      label: deriveConfidenceLabel(signal.confidence),
      value: `${signal.confidence}%`,
      type: 'confidence',
    });
  }

  // Entity
  if (signal.entityName) {
    factors.push({
      label: `Primary entity: ${signal.entityName}`,
      value: signal.entityName,
      type: 'entity',
    });
  }

  // Context — if pre-generated context exists
  if (signal.context?.whyItMatters) {
    factors.push({
      label: 'Analyst context available',
      value: 'Pre-generated',
      type: 'context',
    });
  }

  return factors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence-grade "why this matters" — the core insight generator
//
// Design principles:
//   • 1–3 sentences max — analyst brevity, not essay prose.
//   • Answers three questions: why it matters, who is affected, what happens next.
//   • No generic labels ("significant development") — every sentence must carry
//     concrete, signal-specific information.
//   • Cascading source priority:
//       1. LLM-generated context.whyItMatters (highest quality, when available)
//       2. Write-side whyThisMatters from signalEngine (type-specific, deterministic)
//       3. Category-aware deterministic generation (this layer's fallback)
//   • Weak signals (low significance or poor corroboration) get minimal
//     explanations — we don't manufacture insight where evidence is thin.
// ─────────────────────────────────────────────────────────────────────────────

/** Thresholds for explanation depth — signals below these get minimal treatment. */
const INSIGHT_THRESHOLDS = {
  /** Minimum significance to generate a full insight explanation. */
  minSignificance: 40,
  /** Minimum source support to generate a full insight explanation. */
  minCorroboration: 2,
} as const;

/**
 * Generate a concise, analyst-grade "why this matters" explanation.
 *
 * Prioritises pre-existing intelligence (LLM context, engine-generated insight)
 * and falls back to category-aware deterministic generation. Only produces rich
 * explanations for signals that meet significance and corroboration thresholds.
 */
function buildWhyThisMatters(signal: Signal): string {
  // ── Priority 1: LLM-generated context (highest quality) ────────────────
  if (signal.context?.whyItMatters) {
    return signal.context.whyItMatters;
  }

  // ── Priority 2: Write-side engine insight (type-specific, deterministic) ─
  if (signal.whyThisMatters && signal.whyThisMatters.length > 30) {
    return signal.whyThisMatters;
  }

  // ── Weak signal gate: minimal explanation for low-quality signals ───────
  const sig = signal.significanceScore ?? 0;
  const sources = signal.sourceSupportCount ?? 0;
  if (sig < INSIGHT_THRESHOLDS.minSignificance && sources < INSIGHT_THRESHOLDS.minCorroboration) {
    return buildMinimalExplanation(signal);
  }

  // ── Priority 3: Category-aware deterministic generation ────────────────
  return buildCategoryInsight(signal);
}

/**
 * Minimal explanation for weak signals — honest about evidence quality,
 * avoids manufacturing insight where data is thin.
 */
function buildMinimalExplanation(signal: Signal): string {
  const entity = signal.entityName ?? 'this sector';
  const category = signal.category?.replace(/_/g, ' ') ?? 'AI';
  if ((signal.sourceSupportCount ?? 0) <= 1) {
    return `Early ${category} signal around ${entity} — single-source, pending independent confirmation before actionable.`;
  }
  return `Emerging ${category} activity around ${entity}. Evidence is accumulating but not yet strong enough to shift strategic assumptions.`;
}

/**
 * Category-aware insight generator for signals that meet quality thresholds
 * but lack pre-generated intelligence from the engine or LLM layers.
 *
 * Each category branch answers: why it matters, who is affected, what may happen next.
 */
function buildCategoryInsight(signal: Signal): string {
  const entity = signal.entityName ?? 'key players';
  const sig = signal.significanceScore ?? 50;
  const sources = signal.sourceSupportCount ?? 0;
  const category = signal.category ?? '';
  const isHighSig = sig >= 70;
  const isWellCorroborated = sources >= 4;

  // Build affected-parties clause from context entities when available
  const contextEntities = signal.context?.affectedEntities
    ?.map(e => e.name)
    .filter((n): n is string => !!n && n !== entity)
    .slice(0, 2) ?? [];
  const affectedClause = contextEntities.length > 0
    ? ` ${contextEntities.join(' and ')} face direct knock-on effects.`
    : '';

  switch (category) {
    case 'models': {
      const urgency = isHighSig
        ? `Teams building on current capabilities face a compressed evaluation window — integration decisions made now lock in for months.`
        : `Downstream builders should benchmark against new baselines before committing to current integrations.`;
      return `Model capability shifts around ${entity} alter the competitive baseline for every team in the stack.${affectedClause} ${urgency}`;
    }

    case 'funding': {
      const scale = isWellCorroborated
        ? `Confirmed across ${sources} sources, this funding pattern signals conviction-level capital deployment.`
        : `If sustained, this capital trajectory could reshape competitive positioning within 6–12 months.`;
      const impact = isHighSig
        ? `${entity}'s resource advantage widens — competitors face rising talent and compute costs.`
        : `Capital flows at this velocity shift hiring dynamics and partnership leverage across the sector.`;
      return `${impact}${affectedClause} ${scale}`;
    }

    case 'regulation': {
      const scope = isHighSig
        ? `Rules targeting ${entity} typically become compliance templates across the industry — teams not named should still assess exposure.`
        : `Regulatory clustering around ${entity} suggests governance is moving from discussion to enforcement.`;
      return `${scope}${affectedClause} Product, legal, and go-to-market timelines may need revision.`;
    }

    case 'research': {
      const timeline = isHighSig ? '3–6 months' : '6–12 months';
      return `Research breakthroughs around ${entity} are a leading indicator of production capability shifts within ${timeline}.${affectedClause} R&D and product roadmaps in adjacent areas should be stress-tested against these advances.`;
    }

    case 'agents': {
      return `Agent capability developments around ${entity} signal a shift in how AI systems interact with external tools and workflows.${affectedClause} ${isHighSig ? 'Enterprise automation strategies may need near-term reassessment.' : 'Worth monitoring for integration and competitive implications.'}`;
    }

    case 'product': {
      return `Product moves by ${entity} reshape user expectations and competitive positioning.${affectedClause} ${isHighSig ? 'Market timing pressure is building — delayed responses risk ceding adoption ground.' : 'Adjacent players should assess whether their roadmaps account for this shift.'}`;
    }

    default: {
      // Generic but still insight-driven — avoids empty labels
      const strength = isWellCorroborated
        ? `Corroborated by ${sources} independent sources, giving this pattern higher confidence than typical signals.`
        : '';
      return `Activity around ${entity} suggests a shift in AI ecosystem dynamics that may affect competitive positioning and strategic planning.${affectedClause} ${strength}`.trim();
    }
  }
}

/**
 * Build a corroboration summary sentence.
 */
function buildCorroborationSummary(signal: Signal): string {
  const count = signal.sourceSupportCount ?? 0;
  const confidence = signal.confidence;

  if (count >= 6) {
    return `Widely corroborated across ${count} independent sources with ${confidence}% confidence.`;
  }
  if (count >= 4) {
    return `Confirmed by ${count} sources. ${confidence >= 90 ? 'High confidence.' : 'Confidence: ' + confidence + '%.'}`;
  }
  if (count >= 2) {
    return `Supported by ${count} sources. ${confidence >= 80 ? 'Confident assessment.' : 'Moderate confidence.'}`;
  }
  if (count === 1) {
    return `Based on a single source. ${confidence >= 90 ? 'Source appears highly reliable.' : 'Awaiting independent confirmation.'}`;
  }
  return 'Source coverage unknown.';
}

/**
 * Generate a complete structured explanation for a signal.
 *
 * This is the primary entry point for signal explanations. Pure, deterministic,
 * and safe to call from any context.
 */
export function explainSignal(signal: Signal): SignalExplanation {
  const entities = signal.entityName ? [signal.entityName] : [];

  // Extend with context entities if available
  if (signal.context?.affectedEntities) {
    for (const entity of signal.context.affectedEntities) {
      if (entity.name && !entities.includes(entity.name)) {
        entities.push(entity.name);
      }
    }
  }

  return {
    whyThisMatters: buildWhyThisMatters(signal),
    corroborationSummary: buildCorroborationSummary(signal),
    affectedEntities: entities,
    confidenceLabel: deriveConfidenceLabel(signal.confidence),
    importanceLabel: deriveImportanceLabel(signal.significanceScore),
    explanationFactors: buildSignalFactors(signal),
    supportingSignals: signal.relatedIds ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation builders — major events
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a complete structured explanation for a major event.
 *
 * Leverages the event's scoring breakdown, entity list, and corroboration
 * metrics to produce an analyst-grade summary.
 */
export function explainMajorEvent(event: MajorEvent): EventExplanation {
  const factors: ExplanationFactor[] = [];

  // Importance score
  factors.push({
    label: event.importanceScore >= 70 ? 'High importance score' : 'Moderate importance score',
    value: `${event.importanceScore}/100`,
    type: 'significance',
  });

  // Corroboration
  factors.push({
    label: `${event.signalCount} corroborating signals`,
    value: `${event.corroboration}% corroboration`,
    type: 'corroboration',
  });

  // Source quality
  if (event.scoreBreakdown.sourceQuality > 0) {
    factors.push({
      label: event.scoreBreakdown.sourceQuality >= 60 ? 'Strong source quality' : 'Moderate source quality',
      value: `${event.scoreBreakdown.sourceQuality}/100`,
      type: 'confidence',
    });
  }

  // Entities
  for (const entity of event.entities.slice(0, 3)) {
    factors.push({
      label: `Involves ${entity}`,
      value: entity,
      type: 'entity',
    });
  }

  // Recency
  if (event.scoreBreakdown.recency >= 70) {
    factors.push({
      label: 'Recent development',
      value: `Recency: ${event.scoreBreakdown.recency}/100`,
      type: 'recency',
    });
  }

  // Build whyThisMatters for event
  const categoryLabel = event.category.replace(/_/g, ' ');
  const entityStr = event.entities.length > 0
    ? ` involving ${event.entities.slice(0, 2).join(' and ')}`
    : '';
  const importanceLabel = deriveImportanceLabel(event.importanceScore);

  let whyThisMatters: string;
  if (event.importanceScore >= 70) {
    whyThisMatters = `A major ${categoryLabel} event${entityStr}, corroborated by ${event.signalCount} related signals with ${event.corroboration}% confidence.`;
  } else {
    whyThisMatters = `A ${categoryLabel} event${entityStr} detected from ${event.signalCount} related signals.`;
  }

  // Corroboration summary for event
  const corroborationSummary = event.signalCount >= 4
    ? `Strongly corroborated: ${event.signalCount} signals cluster around this event with ${event.scoreBreakdown.cohesion}% cohesion.`
    : `Based on ${event.signalCount} related signals with ${event.scoreBreakdown.cohesion}% cluster cohesion.`;

  // Confidence from corroboration + source quality
  const avgConfidence = Math.round((event.corroboration + event.scoreBreakdown.sourceQuality) / 2);

  return {
    whyThisMatters,
    corroborationSummary,
    affectedEntities: event.entities,
    confidenceLabel: deriveConfidenceLabel(avgConfidence),
    importanceLabel,
    explanationFactors: factors,
    signalCount: event.signalCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attach explanation fields to an array of signals.
 * Returns a new array — does not mutate inputs.
 */
export function attachSignalExplanations<T extends Signal>(
  signals: T[],
): (T & { explanation: SignalExplanation })[] {
  return signals.map(signal => ({
    ...signal,
    explanation: explainSignal(signal),
  }));
}

/**
 * Attach explanation fields to an array of major events.
 * Returns a new array — does not mutate inputs.
 */
export function attachEventExplanations<T extends MajorEvent>(
  events: T[],
): (T & { explanation: EventExplanation })[] {
  return events.map(event => ({
    ...event,
    explanation: explainMajorEvent(event),
  }));
}
