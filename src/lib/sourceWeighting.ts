/**
 * Omterminal — Source Weighting
 *
 * Maps source tiers to numeric weights used by downstream systems
 * (signal scoring, significance computation, etc.).
 *
 * Tier derivation:
 *   Tier 1 — reliability 9–10  (model labs, primary official sources)
 *   Tier 2 — reliability 7–8   (major media, established company blogs)
 *   Tier 3 — reliability ≤ 6   (community, aggregators, social)
 *
 * Weight mapping:
 *   Tier 1 → 1.0
 *   Tier 2 → 0.7
 *   Tier 3 → 0.4
 *
 * These weights are infrastructure — they are attached to articles at
 * ingestion time and persist in the DB for use by any downstream system.
 * No ranking or feed changes are made here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SourceTier = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// Tier → weight mapping
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_WEIGHTS: Record<SourceTier, number> = {
  1: 1.0,
  2: 0.7,
  3: 0.4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Reliability → tier derivation
//
// Uses the existing reliability score (1–10) from SourceDefinition.
// Thresholds align with the reliability guide in src/types/sources.ts:
//   10   — first-party model lab / direct source
//    9   — major research institution, government body
//    8   — established news outlet, official company tech blog
//    7   — reputable VC firm or industry publication
//    6   — industry blogs, newsletters, analyst commentary
//   ≤5   — social media or community sources
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the source tier from a reliability score (1–10).
 *
 * @param reliability  Integer 1–10 from SourceDefinition.reliability
 * @returns            1, 2, or 3
 */
export function getTierFromReliability(reliability: number): SourceTier {
  if (reliability >= 9) return 1;
  if (reliability >= 7) return 2;
  return 3;
}

/**
 * Return the numeric weight for a given tier.
 *
 * @param tier  1 | 2 | 3
 * @returns     1.0 | 0.7 | 0.4
 */
export function getWeightForTier(tier: SourceTier): number {
  return TIER_WEIGHTS[tier];
}

/**
 * Convenience: derive tier and weight in one call.
 *
 * @param reliability  Integer 1–10 from SourceDefinition.reliability
 * @returns            { sourceTier, sourceWeight }
 */
export function getSourceTierAndWeight(reliability: number): {
  sourceTier: SourceTier;
  sourceWeight: number;
} {
  const sourceTier = getTierFromReliability(reliability);
  const sourceWeight = getWeightForTier(sourceTier);
  return { sourceTier, sourceWeight };
}
