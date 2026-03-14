/**
 * Slug utilities for URL-safe entity and model routing.
 *
 * Converts display names to durable, URL-friendly slugs and provides
 * matching helpers for resolving slugs back to entity records.
 */

/**
 * Convert a display name to a URL-safe slug.
 *
 * - Lowercases the input
 * - Replaces non-alphanumeric characters (except hyphens) with hyphens
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens
 *
 * @example toSlug('OpenAI')          → 'openai'
 * @example toSlug('AI Agents')       → 'ai-agents'
 * @example toSlug('DeepSeek V3')     → 'deepseek-v3'
 * @example toSlug('Google DeepMind') → 'google-deepmind'
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check whether a slug matches a given display name.
 * Useful for resolving a URL slug to the correct entity record
 * without requiring a slug column in the database.
 */
export function slugMatches(slug: string, name: string): boolean {
  return toSlug(name) === slug;
}
