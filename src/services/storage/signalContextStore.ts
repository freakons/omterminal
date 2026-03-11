/**
 * Omterminal — Signal Context Store
 *
 * Write-side persistence helpers for the signal_contexts table.
 * Called exclusively from the write-side pipeline — never from public pages.
 *
 * Pipeline position:
 *   signal store → signalContextStore (mark pending)
 *               → context generator
 *               → signalContextStore (upsert ready | record failed)
 *
 * Functions:
 *   markSignalContextPending  — create or reset a context row to 'pending'
 *   upsertReadySignalContext  — persist a successfully generated context
 *   recordFailedSignalContext — record a generation failure
 */

import { randomUUID } from 'crypto';
import { dbQuery } from '@/db/client';
import type { SignalContextEntity } from '@/types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** All generated context fields required to mark a row as ready. */
export interface ReadyContextData {
  summary:               string;
  whyItMatters:          string;
  affectedEntities:      SignalContextEntity[];
  implications:          string[];
  confidenceExplanation: string;
  sourceBasis:           string;
  modelProvider:         string;
  modelName:             string;
  promptVersion:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or reset a signal_contexts row to 'pending'.
 *
 * Behaviour by existing row state:
 *   - No row:                                INSERT with status='pending'.
 *   - Row status='pending' or 'failed':      UPDATE to 'pending', clear generation_error.
 *   - Row status='ready', same version:      No-op (leaves the ready context intact).
 *   - Row status='ready', different version: Reset to 'pending' so context is regenerated
 *                                            with the current prompt template.
 *
 * The version-aware reset ensures that incrementing CONTEXT_PROMPT_VERSION in
 * contextGenerator.ts automatically queues stale contexts for regeneration on
 * the next pipeline run that processes the owning signal.
 *
 * This is safe to call on every pipeline run.
 *
 * @returns true if the row was created or reset to pending; false if already ready at current version.
 */
export async function markSignalContextPending(
  signalId:      string,
  promptVersion: string,
): Promise<boolean> {
  const id = randomUUID();

  const rows = await dbQuery<{ signal_id: string }>`
    INSERT INTO signal_contexts (id, signal_id, status, prompt_version, generation_error, updated_at)
    VALUES (${id}, ${signalId}, 'pending', ${promptVersion}, NULL, NOW())
    ON CONFLICT (signal_id) DO UPDATE SET
      status           = 'pending',
      prompt_version   = ${promptVersion},
      generation_error = NULL,
      updated_at       = NOW()
    WHERE signal_contexts.status != 'ready'
       OR signal_contexts.prompt_version != ${promptVersion}
    RETURNING signal_id
  `;

  return rows.length > 0;
}

/**
 * Reset all 'ready' signal contexts whose prompt_version differs from
 * currentVersion back to 'pending' for regeneration.
 *
 * Use this as an admin/maintenance helper when you increment
 * CONTEXT_PROMPT_VERSION and want to force a full batch regeneration of all
 * previously-generated contexts — not just those that happen to flow through
 * the pipeline in the next run.
 *
 * Safe to call repeatedly — it is a no-op when all contexts are already at
 * the current version.
 *
 * @param currentVersion  The prompt version to preserve (e.g. CONTEXT_PROMPT_VERSION).
 * @returns               Number of context rows reset to 'pending'.
 */
export async function resetOutdatedContexts(currentVersion: string): Promise<number> {
  const rows = await dbQuery<{ signal_id: string }>`
    UPDATE signal_contexts
    SET status           = 'pending',
        generation_error = NULL,
        updated_at       = NOW()
    WHERE status = 'ready'
      AND prompt_version != ${currentVersion}
    RETURNING signal_id
  `;
  return rows.length;
}

/**
 * Upsert a fully-generated context row to 'ready'.
 *
 * Updates all content and model-metadata fields, sets status='ready', and
 * clears any previous generation_error.  Called on successful generation.
 */
export async function upsertReadySignalContext(
  signalId: string,
  data:     ReadyContextData,
): Promise<void> {
  const entitiesJson    = JSON.stringify(data.affectedEntities);
  const implicationsArr = data.implications.length > 0 ? data.implications : [];

  await dbQuery`
    UPDATE signal_contexts SET
      summary                = ${data.summary},
      why_it_matters         = ${data.whyItMatters},
      affected_entities      = ${entitiesJson},
      implications           = ${implicationsArr},
      confidence_explanation = ${data.confidenceExplanation},
      source_basis           = ${data.sourceBasis},
      model_provider         = ${data.modelProvider},
      model_name             = ${data.modelName},
      prompt_version         = ${data.promptVersion},
      status                 = 'ready',
      generation_error       = NULL,
      updated_at             = NOW()
    WHERE signal_id = ${signalId}
  `;
}

/**
 * Mark a signal context as 'failed' with an error message.
 *
 * Records the error and model metadata for operator review.  The parent
 * signal is unaffected — context failures are non-fatal.
 *
 * Error messages are capped at 2 000 chars to keep the row size bounded.
 */
export async function recordFailedSignalContext(
  signalId: string,
  error:    string,
  meta:     { modelProvider: string; modelName: string; promptVersion: string },
): Promise<void> {
  const errorMsg = error.slice(0, 2_000);

  await dbQuery`
    UPDATE signal_contexts SET
      status           = 'failed',
      generation_error = ${errorMsg},
      model_provider   = ${meta.modelProvider},
      model_name       = ${meta.modelName},
      prompt_version   = ${meta.promptVersion},
      updated_at       = NOW()
    WHERE signal_id = ${signalId}
  `;
}
