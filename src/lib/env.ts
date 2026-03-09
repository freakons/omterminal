/**
 * Omterminal — Environment Validation
 *
 * Validates that critical environment variables are present before API routes
 * execute.  In production every missing variable throws immediately so the
 * deployment fails loudly rather than silently serving stale mock data.
 * In development the check is skipped to preserve the local workflow.
 *
 * Usage
 * ─────
 *   import { validateEnvironment } from '@/lib/env';
 *
 *   // At the top of a route handler:
 *   validateEnvironment(['DATABASE_URL', 'CRON_SECRET']);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export const CRITICAL_VARS = [
  'DATABASE_URL',
  'CRON_SECRET',
  'ADMIN_SECRET',
  'GNEWS_API_KEY',
] as const;

export type CriticalVar = (typeof CRITICAL_VARS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert that the specified environment variables are set.
 *
 * - **Production** (`NODE_ENV === 'production'`): throws an `Error` listing
 *   every missing variable so the request fails with a clear 500 rather than
 *   silently falling back to mock data.
 * - **Development / test**: no-op — allows local work without a full env file.
 *
 * @param required  Subset of critical variable names to check.
 *                  Defaults to all four critical variables when omitted.
 *
 * @example
 * // Check only what this route actually needs:
 * validateEnvironment(['DATABASE_URL', 'CRON_SECRET']);
 *
 * @throws {Error} In production when one or more variables are missing.
 */
export function validateEnvironment(required: CriticalVar[] = [...CRITICAL_VARS]): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ` +
        missing.join(', ') +
        '. Configure these in your deployment environment before going live.'
    );
  }
}
