/**
 * Omterminal — In-Memory Run-Scoped Deduplicator
 *
 * Provides lightweight, multi-layer duplicate detection within a single
 * harvester run. State is reset at the start of each run via resetDeduplicator().
 *
 * Deduplication layers (checked in order, cheapest first):
 *   1. Exact URL match         — same canonical URL from any source
 *   2. Exact normalized title  — same title after stripping punctuation/case
 *   3. Fuzzy title similarity  — Jaccard ≥ FUZZY_TITLE_THRESHOLD word overlap
 *   4. Content fingerprint     — hash of title + leading description text
 *
 * This layer runs BEFORE the AI processing step in runner.ts, so it also
 * avoids wasting AI calls on duplicate signals.
 *
 * Note: This is a per-run memory cache only. Across-run deduplication is
 * handled by the DB UNIQUE constraint on articles.url and by the
 * title_fingerprint + 48h window check in articleStore.ts.
 */

import { NormalizedSignal } from '@/harvester/types';
import {
  normalizeTitle,
  titleSimilarity,
  generateContentFingerprint,
} from '@/services/normalization/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Jaccard similarity threshold for fuzzy title matching.
 * Titles sharing ≥80% of their meaningful word tokens are treated as
 * near-duplicates. Lower values increase recall (catch more near-dups) at the
 * risk of false positives; higher values are more conservative.
 */
const FUZZY_TITLE_THRESHOLD = 0.8;

// ─────────────────────────────────────────────────────────────────────────────
// Per-run state (reset via resetDeduplicator())
// ─────────────────────────────────────────────────────────────────────────────

let seenUrls = new Set<string>();
let seenNormalizedTitles = new Set<string>();
/** Ordered list for O(n) fuzzy scan — acceptable for typical run sizes (<500). */
let seenNormalizedTitlesArray: string[] = [];
let seenContentFingerprints = new Set<string>();

// Per-run duplicate counters (reported via getDeduplicatorStats())
let exactUrlDups = 0;
let exactTitleDups = 0;
let fuzzyTitleDups = 0;
let contentFingerprintDups = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resets all per-run deduplication state.
 * Must be called at the start of each harvester run so stale fingerprints
 * from previous runs do not incorrectly filter new signals.
 */
export function resetDeduplicator(): void {
  seenUrls = new Set();
  seenNormalizedTitles = new Set();
  seenNormalizedTitlesArray = [];
  seenContentFingerprints = new Set();
  exactUrlDups = 0;
  exactTitleDups = 0;
  fuzzyTitleDups = 0;
  contentFingerprintDups = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

export interface DeduplicatorStats {
  exactUrl: number;
  exactTitle: number;
  fuzzyTitle: number;
  contentFingerprint: number;
  total: number;
}

/**
 * Returns a snapshot of duplicate-detection counts for the current run.
 * Call after the run completes to include in summary logging.
 */
export function getDeduplicatorStats(): DeduplicatorStats {
  return {
    exactUrl: exactUrlDups,
    exactTitle: exactTitleDups,
    fuzzyTitle: fuzzyTitleDups,
    contentFingerprint: contentFingerprintDups,
    total: exactUrlDups + exactTitleDups + fuzzyTitleDups + contentFingerprintDups,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a normalized signal is a duplicate of one seen earlier in
 * this run. Records the signal in the appropriate seen-sets on first encounter.
 *
 * Returns true (is duplicate) if any layer fires; false otherwise.
 *
 * Layers are checked cheapest-first:
 *   1. Exact URL match (O(1) Set lookup)
 *   2. Exact normalized title match (O(1) Set lookup, source-agnostic)
 *   3. Fuzzy Jaccard title similarity (O(n) scan, n = distinct titles seen)
 *   4. Content fingerprint (O(1) Set lookup)
 */
export async function isDuplicate(signal: NormalizedSignal): Promise<boolean> {
  // ── Layer 1: Exact URL match ─────────────────────────────────────────────
  if (signal.url) {
    if (seenUrls.has(signal.url)) {
      exactUrlDups++;
      return true;
    }
    seenUrls.add(signal.url);
  }

  // ── Layer 2: Exact normalized title match (source-agnostic) ──────────────
  const normTitle = normalizeTitle(signal.title);
  if (normTitle) {
    if (seenNormalizedTitles.has(normTitle)) {
      exactTitleDups++;
      return true;
    }

    // ── Layer 3: Fuzzy title similarity ─────────────────────────────────────
    for (const seen of seenNormalizedTitlesArray) {
      if (titleSimilarity(normTitle, seen) >= FUZZY_TITLE_THRESHOLD) {
        fuzzyTitleDups++;
        return true;
      }
    }

    seenNormalizedTitles.add(normTitle);
    seenNormalizedTitlesArray.push(normTitle);
  }

  // ── Layer 4: Content fingerprint (title + leading description) ───────────
  const contentFp = generateContentFingerprint(signal.title, signal.description);
  if (contentFp) {
    if (seenContentFingerprints.has(contentFp)) {
      contentFingerprintDups++;
      return true;
    }
    seenContentFingerprints.add(contentFp);
  }

  return false;
}
