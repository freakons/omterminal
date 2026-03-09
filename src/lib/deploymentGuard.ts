/**
 * Omterminal — Deployment Guard
 *
 * Validates runtime configuration before the application starts or builds.
 * In production, missing required variables cause the guard to throw so the
 * build fails loudly rather than deploying a broken instance.
 *
 * This module is also available as a standalone prebuild script:
 *   scripts/deployment-check.js
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'CRON_SECRET',
  'ADMIN_SECRET',
  'GNEWS_API_KEY',
] as const;

const OPTIONAL_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'GROK_API_KEY',
  'OPENAI_API_KEY',
] as const;

export interface GuardResult {
  ok: boolean;
  missingRequired: string[];
  missingOptional: string[];
  nodeVersion: string;
}

/**
 * Run the deployment configuration guard.
 *
 * - Logs a clear summary of environment readiness.
 * - Returns a result object for programmatic use.
 * - When `exitOnFailure` is true (default), calls `process.exit(1)` if
 *   required variables are missing.  Set to false when calling from
 *   application code where you want to handle the result yourself.
 */
export function runDeploymentGuard(exitOnFailure = true): GuardResult {
  const missingRequired = REQUIRED_VARS.filter((v) => !process.env[v]);
  const missingOptional = OPTIONAL_VARS.filter((v) => !process.env[v]);
  const nodeVersion = process.version;

  console.log('\n========================================');
  console.log('  OMTERMINAL DEPLOYMENT CHECK');
  console.log('========================================\n');

  // Required variables
  if (missingRequired.length > 0) {
    console.error(`  Required variables MISSING: ${missingRequired.join(', ')}`);
  } else {
    console.log('  Required variables OK');
  }

  // Optional variables
  if (missingOptional.length > 0) {
    console.warn(`  Optional variables missing: ${missingOptional.join(', ')}`);
  } else {
    console.log('  Optional variables OK');
  }

  // Node runtime
  console.log(`  Node runtime: ${nodeVersion}`);

  // Verdict
  if (missingRequired.length > 0) {
    console.error('\n  Deployment BLOCKED — fix required variables before deploying.\n');
    if (exitOnFailure) {
      process.exit(1);
    }
    return { ok: false, missingRequired, missingOptional, nodeVersion };
  }

  console.log('\n  Deployment safe\n');
  return { ok: true, missingRequired: [], missingOptional, nodeVersion };
}
