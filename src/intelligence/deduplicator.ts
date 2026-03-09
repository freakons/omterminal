import { NormalizedSignal } from '@/harvester/types';

const seenSignals = new Set<string>();

function fingerprint(signal: NormalizedSignal): string {
  return `${signal.title}${signal.source}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function isDuplicate(signal: NormalizedSignal): Promise<boolean> {
  const fp = fingerprint(signal);
  if (seenSignals.has(fp)) return true;
  seenSignals.add(fp);
  return false;
}
