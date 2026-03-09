/**
 * Omterminal — Signal State Tracker
 *
 * Tracks lifecycle transitions for market signals across real-time updates.
 * Pure in-memory, no I/O — safe to call on every tick.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SignalLifecycleState = 'NEW' | 'STRENGTHENING' | 'WEAKENING' | 'EXPIRED';

export interface SignalStateResult {
  symbol:    string;
  score:     number;
  state:     SignalLifecycleState;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CHANGE_THRESHOLD = 5;   // points delta to trigger STRENGTHENING / WEAKENING
const EXPIRE_BELOW     = 60;  // score below this → EXPIRED

// ─────────────────────────────────────────────────────────────────────────────
// State store
//
// Simple Map<symbol, lastScore> — no wrappers, no classes.
// Kept module-local so consumers cannot mutate it directly.
// ─────────────────────────────────────────────────────────────────────────────

const scoreHistory = new Map<string, number>();

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the tracked state for a signal and return its lifecycle descriptor.
 *
 * Transition rules (evaluated in priority order):
 *  1. score < EXPIRE_BELOW                    → EXPIRED
 *  2. symbol not previously seen              → NEW
 *  3. score increased by more than threshold  → STRENGTHENING
 *  4. score decreased by more than threshold  → WEAKENING
 *  5. delta within ±threshold, delta >= 0     → STRENGTHENING (holding / micro-gain)
 *  6. delta within ±threshold, delta <  0     → WEAKENING     (micro-loss)
 *
 * The map entry is always updated to the latest score so the next call
 * computes deltas relative to the most recent observation.
 *
 * @param symbol  Market symbol (e.g. "BTCUSDT").
 * @param score   Current signal score (0–100).
 */
export function updateSignalState(symbol: string, score: number): SignalStateResult {
  const timestamp = Date.now();
  const last      = scoreHistory.get(symbol);

  let state: SignalLifecycleState;

  if (score < EXPIRE_BELOW) {
    // EXPIRED takes precedence over everything else.
    state = 'EXPIRED';
  } else if (last === undefined) {
    state = 'NEW';
  } else {
    const delta = score - last;
    if (delta > CHANGE_THRESHOLD) {
      state = 'STRENGTHENING';
    } else if (delta < -CHANGE_THRESHOLD) {
      state = 'WEAKENING';
    } else {
      // Delta within ±threshold — resolve by sign so every call returns a
      // meaningful state (spec defines no STABLE state).
      state = delta >= 0 ? 'STRENGTHENING' : 'WEAKENING';
    }
  }

  scoreHistory.set(symbol, score);

  return { symbol, score, state, timestamp };
}

/**
 * Remove a symbol from the tracker, freeing its memory.
 *
 * Call this when a symbol is permanently delisted or no longer tracked
 * to prevent unbounded map growth in long-running processes.
 */
export function removeSignal(symbol: string): void {
  scoreHistory.delete(symbol);
}

/**
 * Return the number of symbols currently being tracked.
 * Useful for monitoring memory footprint.
 */
export function trackedCount(): number {
  return scoreHistory.size;
}
