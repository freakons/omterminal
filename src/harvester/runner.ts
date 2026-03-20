import { normalizeSignal } from './normalizer';
import { sendSignal } from './sender';
import { processSignal } from '@/intelligence/processor';
import { scoreSignal } from '@/intelligence/scoring';
import { isDuplicate, resetDeduplicator, getDeduplicatorStats } from '@/intelligence/deduplicator';
import { getSources } from './sources/registry';
import { getProvider, getActiveProviderName } from '@/lib/ai';

const MIN_SCORE = 40;

// ── Orchestration ─────────────────────────────────────────────────────────────
export async function runHarvester(): Promise<void> {
  const sources = getSources();
  console.log(`[harvester/runner] Harvester running with ${sources.length} sources`);

  // Reset per-run dedup state so stale fingerprints from previous invocations
  // do not incorrectly filter signals in this run.
  resetDeduplicator();

  // Resolve the active AI provider once per run; log which one is in use.
  let aiProviderName = 'none';
  try {
    await getProvider();
    aiProviderName = getActiveProviderName() ?? 'none';
    console.log(`[ai] active provider: ${aiProviderName}`);
  } catch (err) {
    console.warn('[harvester/runner] No AI provider available — pipeline will use rule-based fallback:', err instanceof Error ? err.message : err);
  }

  let totalFetched = 0;
  let totalProcessed = 0;
  // exactDuplicatesSkipped: same URL or same normalized title within this run
  let exactDuplicatesSkipped = 0;
  // nearDuplicatesSkipped: fuzzy title match or content fingerprint match within this run
  let nearDuplicatesSkipped = 0;
  let lowScoreSkipped = 0;
  let totalSent = 0;

  for (const source of sources) {
    console.log(`[harvester/runner] fetching from: ${source.name || 'unknown'}`);

    let rawSignals;
    try {
      rawSignals = await source.fetchSignals();
    } catch (err) {
      console.error(`[harvester/runner] failed to fetch from ${source.name}:`, err);
      continue;
    }

    console.log(`[harvester/runner] signals fetched: ${rawSignals.length} from ${source.name}`);
    totalFetched += rawSignals.length;

    for (const raw of rawSignals) {
      const normalized = normalizeSignal(raw, aiProviderName);

      // ── Dedup check (BEFORE AI processing to avoid wasted calls) ───────────
      if (await isDuplicate(normalized)) {
        const stats = getDeduplicatorStats();
        // Determine if the most recent drop was exact or near-dup for per-source logging
        const isNear = stats.fuzzyTitle + stats.contentFingerprint >
          (nearDuplicatesSkipped);
        if (isNear) {
          console.log(`[harvester/runner] near-duplicate skipped: "${normalized.title}"`);
          nearDuplicatesSkipped++;
        } else {
          console.log(`[harvester/runner] exact duplicate skipped: "${normalized.title}"`);
          exactDuplicatesSkipped++;
        }
        continue;
      }

      let intelligence;
      try {
        intelligence = await processSignal(normalized);
        totalProcessed++;
      } catch (err) {
        console.error(`[harvester/runner] processing failed for "${normalized.title}":`, err);
        continue;
      }

      const score = scoreSignal(normalized, intelligence);

      if (score < MIN_SCORE) {
        console.log(`[harvester/runner] low score skipped: "${normalized.title}" (score: ${score})`);
        lowScoreSkipped++;
        continue;
      }

      console.log(`[harvester/runner] processed: "${normalized.title}" → ${intelligence.category} (score: ${score})`);

      try {
        await sendSignal(normalized, intelligence);
        totalSent++;
      } catch {
        // error already logged in sendSignal — continue processing remaining signals
      }
    }
  }

  const dedupStats = getDeduplicatorStats();

  console.log(
    `[harvester/runner] done — ` +
    `fetched: ${totalFetched} | ` +
    `processed: ${totalProcessed} | ` +
    `exact duplicates dropped: ${dedupStats.exactUrl + dedupStats.exactTitle} ` +
      `(url=${dedupStats.exactUrl} title=${dedupStats.exactTitle}) | ` +
    `near duplicates dropped: ${dedupStats.fuzzyTitle + dedupStats.contentFingerprint} ` +
      `(fuzzy=${dedupStats.fuzzyTitle} content=${dedupStats.contentFingerprint}) | ` +
    `low score skipped: ${lowScoreSkipped} | ` +
    `sent: ${totalSent}`,
  );
}
