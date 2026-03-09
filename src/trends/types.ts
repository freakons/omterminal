export interface TrendSignal {
  title: string;
  category: string;
  source: string;
  entities: { type: string; name: string }[];
  published_at?: string;
  /** Processed intelligence quality score (0–100); defaults to 50 when absent */
  intelligence_score?: number;
  /** Trust/confidence score (0–100); defaults to 50 when absent */
  trust_score?: number;
}

export interface TrendResult {
  topic: string;
  category: string;
  signal_count: number;
  score: number;
  entities: string[];
  summary: string;
  confidence: number;
  /** Sum of importance_score across all contributing signals */
  importance_score: number;
  /** Average velocity_score across all contributing signals */
  velocity_score: number;
}
