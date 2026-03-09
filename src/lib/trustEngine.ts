/**
 * Omterminal — Signal Trust Engine
 *
 * Pure, stateless function that derives a publishing status and trust score
 * from a signal's confidence level.  No database access — safe to call
 * anywhere (server, edge, client).
 */

export type TrustStatus = 'auto' | 'published' | 'review' | 'internal';

export interface TrustInput {
  confidence: number;
  source?: string;
  ai_model?: string;
}

export interface TrustResult {
  status: TrustStatus;
  trust_score: number;
}

/**
 * Evaluate the publishing trust level for a signal.
 *
 * @param signal  Object with at minimum a `confidence` value (0–100).
 * @returns       `{ status, trust_score }` derived from the confidence tier.
 */
export function evaluateSignalTrust(signal: TrustInput): TrustResult {
  const { confidence } = signal;

  if (confidence >= 90) {
    return { status: 'auto',      trust_score: 95 };
  }
  if (confidence >= 75) {
    return { status: 'published', trust_score: 85 };
  }
  if (confidence >= 60) {
    return { status: 'review',    trust_score: 70 };
  }
  return   { status: 'internal',  trust_score: 50 };
}
