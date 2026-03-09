import { NormalizedSignal } from '@/harvester/types';
import { IntelligenceResult } from './types';

const CATEGORY_BONUS: Partial<Record<IntelligenceResult['category'], number>> = {
  funding: 10,
  ai_model_release: 10,
  tool_launch: 5,
};

export function scoreSignal(signal: NormalizedSignal, intelligence: IntelligenceResult): number {
  let score = intelligence.confidence;
  score += CATEGORY_BONUS[intelligence.category] ?? 0;
  score += Math.min(intelligence.entities.length, 10);
  return Math.min(score, 100);
}
