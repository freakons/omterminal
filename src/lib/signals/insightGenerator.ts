/**
 * Omterminal — Heuristic Signal Insight Generator
 *
 * Generates structured intelligence insights for signal detail pages using
 * heuristic rules based on category, entities, confidence, and significance.
 *
 * Used as a fallback when LLM-generated context is not available.
 * Pure function — no I/O, no side effects.
 */

import type { Signal, SignalCategory } from '@/data/mockSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SignalInsightData {
  /** 2–4 sentence explanation of why the signal matters */
  whyThisMatters: string;
  /** 3–5 categorized implications */
  implications: ImplicationItem[];
}

export interface ImplicationItem {
  label: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Templates
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_INSIGHT_TEMPLATES: Record<SignalCategory, {
  whyPrefix: string;
  defaultImplications: ImplicationItem[];
}> = {
  models: {
    whyPrefix: 'New model developments reshape the competitive landscape for AI capabilities.',
    defaultImplications: [
      { label: 'Competition', text: 'May force competing labs to accelerate their own model releases or pivot strategy.' },
      { label: 'Technology', text: 'Could shift the frontier of what AI systems can accomplish in production environments.' },
      { label: 'Market Impact', text: 'Downstream products and services built on this model class may see capability upgrades.' },
      { label: 'Risk', text: 'Rapid capability gains may outpace safety evaluation frameworks.' },
    ],
  },
  funding: {
    whyPrefix: 'Capital allocation signals where the market sees the highest-value opportunities in AI.',
    defaultImplications: [
      { label: 'Market Impact', text: 'Capital inflows suggest growing investor conviction in this segment of the AI market.' },
      { label: 'Competition', text: 'Funded companies gain runway to outpace competitors on talent and compute.' },
      { label: 'Opportunity', text: 'Adjacent startups and tooling providers may benefit from ecosystem expansion.' },
      { label: 'Risk', text: 'Concentrated capital can create winner-take-all dynamics with fragile supply chains.' },
    ],
  },
  regulation: {
    whyPrefix: 'Regulatory actions define the operating boundaries for AI development and deployment.',
    defaultImplications: [
      { label: 'Compliance', text: 'Organizations operating in affected jurisdictions will need to adapt practices.' },
      { label: 'Market Impact', text: 'Regulatory clarity can unlock investment or create compliance costs that reshape margins.' },
      { label: 'Competition', text: 'Companies with proactive governance may gain competitive advantages.' },
      { label: 'Risk', text: 'Regulatory fragmentation across jurisdictions creates operational complexity.' },
    ],
  },
  agents: {
    whyPrefix: 'Autonomous agent capabilities represent the next frontier of AI system deployment.',
    defaultImplications: [
      { label: 'Technology', text: 'Agent architectures may redefine how software is built and deployed.' },
      { label: 'Market Impact', text: 'Enterprise workflows face potential disruption from autonomous task completion.' },
      { label: 'Opportunity', text: 'New markets for agent tooling, orchestration, and monitoring are emerging.' },
      { label: 'Risk', text: 'Autonomous systems introduce new failure modes and accountability challenges.' },
    ],
  },
  research: {
    whyPrefix: 'Research breakthroughs signal future capability shifts before they reach production.',
    defaultImplications: [
      { label: 'Technology', text: 'Novel techniques may unlock capabilities previously thought years away.' },
      { label: 'Competition', text: 'Research leads translate into product advantages within 6–18 months.' },
      { label: 'Opportunity', text: 'Early adopters of new research directions can establish defensible positions.' },
      { label: 'Risk', text: 'Theoretical advances may not translate cleanly into scalable production systems.' },
    ],
  },
  product: {
    whyPrefix: 'Product launches reveal how AI capabilities are being packaged and delivered to users.',
    defaultImplications: [
      { label: 'Market Impact', text: 'New products reshape user expectations and competitive benchmarks.' },
      { label: 'Competition', text: 'First-mover products in new categories often define the market standard.' },
      { label: 'Opportunity', text: 'Platform launches create ecosystem opportunities for integrators and developers.' },
      { label: 'Risk', text: 'Rapid product cycles can lead to quality gaps and user trust erosion.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a heuristic "Why This Matters" insight for a signal.
 *
 * Priority:
 *   1. Use LLM-generated fields (whyThisMatters, context.whyItMatters)
 *   2. Fall back to heuristic generation based on category + metadata
 */
export function generateSignalInsightData(signal: Signal): SignalInsightData {
  const template = CATEGORY_INSIGHT_TEMPLATES[signal.category] ?? CATEGORY_INSIGHT_TEMPLATES.models;

  // ── Why This Matters ────────────────────────────────────────────────────
  const whyThisMatters = buildWhyThisMatters(signal, template.whyPrefix);

  // ── Implications ────────────────────────────────────────────────────────
  const implications = buildImplications(signal, template.defaultImplications);

  return { whyThisMatters, implications };
}

function buildWhyThisMatters(
  signal: Signal,
  categoryPrefix: string,
): string {
  // Prefer existing LLM-generated content
  if (signal.whyThisMatters) return signal.whyThisMatters;
  if (signal.context?.whyItMatters) return signal.context.whyItMatters;

  // Heuristic construction
  const parts: string[] = [categoryPrefix];

  // Add entity-specific context
  if (signal.entityName) {
    parts.push(
      `${signal.entityName}'s involvement makes this particularly significant given their position in the ecosystem.`,
    );
  }

  // Add confidence qualifier
  if (signal.confidence >= 90) {
    parts.push('High-confidence corroboration from multiple sources increases the reliability of this assessment.');
  } else if (signal.confidence >= 70) {
    parts.push('Moderate-to-high confidence based on available source coverage.');
  }

  // Add significance qualifier
  if (signal.significanceScore != null && signal.significanceScore >= 80) {
    parts.push('This signal ranks among the most significant developments in its category this period.');
  }

  return parts.join(' ');
}

function buildImplications(
  signal: Signal,
  defaults: ImplicationItem[],
): ImplicationItem[] {
  // Prefer existing LLM-generated implications
  if (signal.context?.implications && signal.context.implications.length > 0) {
    return signal.context.implications.map((text, i) => ({
      label: inferImplicationLabel(text, i),
      text,
    }));
  }

  // Customize default implications based on signal data
  const result = [...defaults];

  // Add entity-specific implication if not already covered
  if (signal.entityName && signal.context?.affectedEntities && signal.context.affectedEntities.length > 1) {
    const entityNames = signal.context.affectedEntities
      .map((e) => (typeof e === 'string' ? e : e.name))
      .slice(0, 3)
      .join(', ');
    result.push({
      label: 'Ecosystem',
      text: `Multiple entities involved (${entityNames}) suggest broader ecosystem-level implications.`,
    });
  }

  // Cap at 5
  return result.slice(0, 5);
}

/** Infer a label for an existing implication string based on keywords. */
function inferImplicationLabel(text: string, index: number): string {
  const lower = text.toLowerCase();
  if (lower.includes('market') || lower.includes('valuation') || lower.includes('revenue')) return 'Market Impact';
  if (lower.includes('compet') || lower.includes('rival') || lower.includes('race')) return 'Competition';
  if (lower.includes('technolog') || lower.includes('capability') || lower.includes('model')) return 'Technology';
  if (lower.includes('risk') || lower.includes('danger') || lower.includes('concern')) return 'Risk';
  if (lower.includes('opportunit') || lower.includes('benefit') || lower.includes('advantage')) return 'Opportunity';
  if (lower.includes('regulat') || lower.includes('policy') || lower.includes('compliance')) return 'Regulation';
  // Fallback rotation
  const fallbacks = ['Market Impact', 'Competition', 'Technology', 'Risk', 'Opportunity'];
  return fallbacks[index % fallbacks.length];
}
