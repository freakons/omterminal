/**
 * Omterminal — Market Pulse
 *
 * Derives an overall market bias from a collection of directional signals.
 * Pure and stateless — accepts any array of objects that carry a `direction`
 * field, including the output of `rankOpportunities()`.
 */

import type { TrendDirection } from './signalScore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface PulseResult {
  bullish: number;
  bearish: number;
  neutral: number;
  bias:    MarketBias;
}

/** Minimum interface required — satisfied by SignalCandidate and RankedOpportunity. */
export interface DirectionalSignal {
  direction: TrendDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the overall market bias from an array of directional signals.
 *
 * Counting rules
 * ──────────────
 *  UP      → bullish
 *  DOWN    → bearish
 *  NEUTRAL → neutral
 *
 * Bias rules (strict majority wins)
 * ───────────────────────────────────
 *  bullish > bearish → BULLISH
 *  bearish > bullish → BEARISH
 *  otherwise         → NEUTRAL  (includes empty input and exact ties)
 *
 * Compatible with any ranked or unranked signal array from the signal layer —
 * pass `rankOpportunities()` output directly.
 *
 * @param signals  Any array of objects with a `direction` field.
 * @returns        Counts per direction and the derived bias label.
 *
 * @example
 * const pulse = computeMarketPulse(rankOpportunities(candidates));
 * // { bullish: 14, bearish: 4, neutral: 2, bias: "BULLISH" }
 */
export function computeMarketPulse(signals: DirectionalSignal[]): PulseResult {
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  for (const s of signals) {
    if      (s.direction === 'UP')      bullish++;
    else if (s.direction === 'DOWN')    bearish++;
    else                                neutral++;
  }

  const bias: MarketBias =
    bullish > bearish ? 'BULLISH' :
    bearish > bullish ? 'BEARISH' :
                        'NEUTRAL';

  return { bullish, bearish, neutral, bias };
}
