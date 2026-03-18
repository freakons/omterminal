/**
 * Omterminal — Daily AI Intelligence Thread Generator
 *
 * Converts top signals into social-ready content:
 *   • Twitter/X threads (multi-tweet, analytical tone)
 *   • LinkedIn posts (single long-form, professional tone)
 *
 * Design principles:
 *   • Analytical, not hype — grounded in signal data and confidence scores.
 *   • Every signal includes "why this matters" for decision-makers.
 *   • Deterministic — same signals always produce the same output.
 *   • Reusable — template-based format for daily automation.
 */

import type { Signal } from '@/data/mockSignals';
import {
  deriveImportanceLabel,
  deriveConfidenceLabel,
  deriveCorroborationLabel,
} from '@/lib/signals/explanationLayer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TwitterThread {
  /** Individual tweets in order — first tweet is the hook. */
  tweets: string[];
  /** Total character count across all tweets. */
  totalChars: number;
  /** Number of signals covered. */
  signalCount: number;
  /** ISO date this thread covers. */
  date: string;
}

export interface LinkedInPost {
  /** Full post body text. */
  body: string;
  /** Total character count. */
  charCount: number;
  /** Number of signals covered. */
  signalCount: number;
  /** ISO date this post covers. */
  date: string;
}

export interface DailyThreadOutput {
  twitter: TwitterThread;
  linkedin: LinkedInPost;
  /** ISO date the thread was generated. */
  generatedAt: string;
  /** Signals used to produce the thread. */
  sourceSignals: Signal[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TWITTER_CHAR_LIMIT = 280;
const LINKEDIN_CHAR_LIMIT = 3000;
const MAX_SIGNALS_PER_THREAD = 5;
const THREAD_SOURCE = 'omterminal.com';

// ─────────────────────────────────────────────────────────────────────────────
// Category labels
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  models: '[MODELS]',
  funding: '[FUNDING]',
  regulation: '[REGULATION]',
  research: '[RESEARCH]',
  agents: '[AGENTS]',
  product: '[PRODUCT]',
};

const CATEGORY_LABEL: Record<string, string> = {
  models: 'Model Release',
  funding: 'Funding & Capital',
  regulation: 'Regulation & Policy',
  research: 'Research',
  agents: 'AI Agents',
  product: 'Product',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Select and rank top signals for thread inclusion.
 * Prefers high significance, then high confidence, then recency.
 */
export function selectTopSignals(signals: Signal[], max: number = MAX_SIGNALS_PER_THREAD): Signal[] {
  return [...signals]
    .sort((a, b) => {
      // Primary: significance score (descending)
      const sigDiff = (b.significanceScore ?? 0) - (a.significanceScore ?? 0);
      if (sigDiff !== 0) return sigDiff;
      // Secondary: confidence (descending)
      const confDiff = b.confidence - a.confidence;
      if (confDiff !== 0) return confDiff;
      // Tertiary: recency (descending)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, max);
}

/**
 * Build a "why this matters" line for a signal.
 * Uses pre-computed fields when available, falls back to deterministic generation.
 */
function buildWhyItMatters(signal: Signal): string {
  // Use pre-generated context if available
  if (signal.whyThisMatters) return signal.whyThisMatters;
  if (signal.context?.whyItMatters) return signal.context.whyItMatters;

  const importance = deriveImportanceLabel(signal.significanceScore);
  const confidence = deriveConfidenceLabel(signal.confidence);
  const corroboration = deriveCorroborationLabel(signal.sourceSupportCount);

  const parts: string[] = [];

  if (importance === 'Critical Development') {
    parts.push('This reshapes competitive dynamics');
  } else if (importance === 'High Importance') {
    parts.push('A strategic shift for the sector');
  } else {
    parts.push('Worth tracking');
  }

  if (corroboration === 'Widely Confirmed' || corroboration === 'Multiple Sources Confirm') {
    parts.push(`${confidence.toLowerCase()} across ${signal.sourceSupportCount} sources`);
  }

  return parts.join(' — ') + '.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter Thread Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the opening hook tweet.
 */
function buildHookTweet(signals: Signal[], date: string): string {
  const topCategory = signals[0]?.category ?? 'models';
  const categoryCount = new Set(signals.map(s => s.category)).size;

  const lines = [
    `AI Intelligence Brief — ${formatDateShort(date)}`,
    '',
    `${signals.length} signals across ${categoryCount} categories today.`,
    '',
    `Here's what decision-makers need to know:`,
    '',
    `A thread.`,
  ];

  return lines.join('\n');
}

/**
 * Build a single signal tweet within the thread.
 */
function buildSignalTweet(signal: Signal, index: number, total: number): string {
  const tag = CATEGORY_EMOJI[signal.category] ?? '[SIGNAL]';
  const conf = `${signal.confidence}% confidence`;
  const sig = signal.significanceScore != null
    ? ` | Significance: ${signal.significanceScore}/100`
    : '';

  const lines = [
    `${index + 1}/${total} ${tag} ${signal.entityName}`,
    '',
    signal.title,
    '',
    signal.summary,
    '',
    `${conf}${sig}`,
  ];

  return lines.join('\n');
}

/**
 * Build a "why this matters" follow-up tweet for a signal.
 */
function buildWhyTweet(signal: Signal, index: number, total: number): string {
  const why = buildWhyItMatters(signal);
  const lines = [
    `Why ${index + 1}/${total} matters:`,
    '',
    why,
  ];

  if (signal.strategicImpact) {
    lines.push('', signal.strategicImpact);
  }

  return lines.join('\n');
}

/**
 * Build the closing tweet with CTA.
 */
function buildClosingTweet(date: string): string {
  return [
    `That's today's AI intelligence brief.`,
    '',
    `These signals are scored by confidence and strategic significance — not engagement.`,
    '',
    `Full analysis at ${THREAD_SOURCE}`,
    '',
    `Follow for daily AI intelligence.`,
  ].join('\n');
}

/**
 * Generate a complete Twitter/X thread from ranked signals.
 */
export function generateTwitterThread(signals: Signal[], date: string): TwitterThread {
  const top = selectTopSignals(signals);
  const tweets: string[] = [];

  // 1. Hook tweet
  tweets.push(buildHookTweet(top, date));

  // 2. Signal + why-it-matters tweet pairs
  for (let i = 0; i < top.length; i++) {
    const signalTweet = buildSignalTweet(top[i], i, top.length);
    tweets.push(signalTweet);

    // Only add why-tweet if it fits and adds value
    const whyTweet = buildWhyTweet(top[i], i, top.length);
    if (whyTweet.length <= TWITTER_CHAR_LIMIT) {
      tweets.push(whyTweet);
    }
  }

  // 3. Closing tweet
  tweets.push(buildClosingTweet(date));

  return {
    tweets,
    totalChars: tweets.reduce((sum, t) => sum + t.length, 0),
    signalCount: top.length,
    date,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn Post Generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a LinkedIn post from ranked signals.
 * Single long-form post, professional tone, structured sections.
 */
export function generateLinkedInPost(signals: Signal[], date: string): LinkedInPost {
  const top = selectTopSignals(signals);
  const sections: string[] = [];

  // Header
  sections.push(`AI Intelligence Brief — ${formatDate(date)}`);
  sections.push('');
  sections.push(
    `${top.length} high-significance signals from the AI ecosystem today. ` +
    `Ranked by strategic impact, not headlines.`
  );

  // Signal sections
  for (let i = 0; i < top.length; i++) {
    const s = top[i];
    const tag = CATEGORY_LABEL[s.category] ?? 'Signal';
    const conf = `Confidence: ${s.confidence}%`;
    const sig = s.significanceScore != null
      ? ` | Significance: ${s.significanceScore}/100`
      : '';

    sections.push('');
    sections.push(`---`);
    sections.push('');
    sections.push(`${i + 1}. ${tag}: ${s.entityName}`);
    sections.push(s.title);
    sections.push('');
    sections.push(s.summary);
    sections.push('');
    sections.push(`${conf}${sig}`);

    // Why this matters
    const why = buildWhyItMatters(s);
    sections.push('');
    sections.push(`Why this matters: ${why}`);

    // Strategic impact if available
    if (s.strategicImpact) {
      sections.push(`Strategic impact: ${s.strategicImpact}`);
    }
  }

  // Footer
  sections.push('');
  sections.push(`---`);
  sections.push('');
  sections.push(
    `These signals are scored by confidence and strategic significance — ` +
    `not engagement bait. The goal is analytical clarity for decision-makers.`
  );
  sections.push('');
  sections.push(`Full analysis: ${THREAD_SOURCE}`);
  sections.push('');
  sections.push(`#AIIntelligence #AIStrategy #ArtificialIntelligence`);

  const body = sections.join('\n');

  return {
    body: body.slice(0, LINKEDIN_CHAR_LIMIT),
    charCount: Math.min(body.length, LINKEDIN_CHAR_LIMIT),
    signalCount: top.length,
    date,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate both Twitter thread and LinkedIn post from signals.
 *
 * This is the primary entry point for daily thread generation.
 *
 * @param signals - Array of signals to convert (will be ranked and filtered)
 * @param date    - ISO date string for the thread (defaults to today)
 */
export function generateDailyThreads(
  signals: Signal[],
  date?: string,
): DailyThreadOutput {
  const threadDate = date ?? new Date().toISOString().slice(0, 10);
  const top = selectTopSignals(signals);

  return {
    twitter: generateTwitterThread(signals, threadDate),
    linkedin: generateLinkedInPost(signals, threadDate),
    generatedAt: new Date().toISOString(),
    sourceSignals: top,
  };
}
