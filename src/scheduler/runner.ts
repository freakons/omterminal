import { runHarvester } from '@/harvester/runner';
import { runTrendAnalysis } from '@/trends/runner';
import { runInsightGeneration } from '@/insights/runner';

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function runCycle(): Promise<void> {
  console.log('[scheduler] Scheduler cycle started');

  await runHarvester();
  console.log('[scheduler] Harvester complete');

  await runTrendAnalysis();
  console.log('[scheduler] Trend analysis complete');

  await runInsightGeneration();
  console.log('[scheduler] Insight generation complete');

  console.log('[scheduler] Scheduler cycle finished');
}

export function startScheduler(): void {
  // Run immediately on start, then repeat on interval
  runCycle().catch((err) => console.error('[scheduler] Cycle error:', err));

  setInterval(() => {
    runCycle().catch((err) => console.error('[scheduler] Cycle error:', err));
  }, INTERVAL_MS);
}
