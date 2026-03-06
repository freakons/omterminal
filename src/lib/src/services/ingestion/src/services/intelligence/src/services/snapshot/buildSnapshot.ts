/**
 *  * Bloomberg-Style Intelligence Snapshot Builder
 *  *
  * THE ARCHITECTURE TRICK:
   * Instead of: 1M users → database queries (does not scale)
    * We use:     1 snapshot build → 1 static JSON file → 1M cached reads
     *
      * Flow:
       *   GNews API → Ingestion → Neon Postgres → Snapshot Builder
        *   → public/data/intelligence.json → Edge CDN → Users
         *
          * The database is write-only. The UI reads static snapshot files.
           * This is why Bloomberg terminals can support massive traffic at low cost.
            *
             * Snapshot is rebuilt every 10 minutes via cron.
              */

              import { sql } from '@/lib/db';
              import { writeFile, mkdir } from 'fs/promises';
              import { join } from 'path';

              export interface SnapshotEvent {
                id: string;
                  title: string;
                    summary: string;
                      source_url: string;
                        source_name: string;
                          category: string;
                            organization: string | null;
                              impact_level: string | null;
                                published_at: string;
                                  created_at: string;
                                  }

                                  export interface IntelligenceSnapshot {
                                    generated_at: string;
                                      total: number;
                                        events: SnapshotEvent[];
                                          by_category: Record<string, SnapshotEvent[]>;
                                          }

                                          /**
                                           * Fetch latest events from database and write to public/data/intelligence.json
                                            * Returns the snapshot data for immediate use.
                                             */
                                             export async function buildSnapshot(): Promise<IntelligenceSnapshot> {
                                               // Fallback snapshot when database is not configured
                                                 if (!sql) {
                                                     const fallback: IntelligenceSnapshot = {
                                                           generated_at: new Date().toISOString(),
                                                                 total: 0,
                                                                       events: [],
                                                                             by_category: {},
                                                                                 };
                                                                                     await writeSnapshot(fallback);
                                                                                         return fallback;
                                                                                           }

                                                                                             try {
                                                                                                 const rows = await sql`
                                                                                                       SELECT
                                                                                                               id::text,
                                                                                                                       title,
                                                                                                                               summary,
                                                                                                                                       source_url,
                                                                                                                                               source_name,
                                                                                                                                                       category,
                                                                                                                                                               organization,
                                                                                                                                                                       impact_level,
                                                                                                                                                                               published_at::text,
                                                                                                                                                                                       created_at::text
                                                                                                                                                                                             FROM intelligence_events
                                                                                                                                                                                                   ORDER BY published_at DESC
                                                                                                                                                                                                         LIMIT 200
                                                                                                                                                                                                             ` as SnapshotEvent[];

                                                                                                                                                                                                                 // Group events by category for the terminal UI
                                                                                                                                                                                                                     const by_category: Record<string, SnapshotEvent[]> = {};
                                                                                                                                                                                                                         for (const event of rows) {
                                                                                                                                                                                                                               const cat = event.category || 'COMPANY_MOVE';
                                                                                                                                                                                                                                     if (!by_category[cat]) by_category[cat] = [];
                                                                                                                                                                                                                                           by_category[cat].push(event);
                                                                                                                                                                                                                                               }

                                                                                                                                                                                                                                                   const snapshot: IntelligenceSnapshot = {
                                                                                                                                                                                                                                                         generated_at: new Date().toISOString(),
                                                                                                                                                                                                                                                               total: rows.length,
                                                                                                                                                                                                                                                                     events: rows,
                                                                                                                                                                                                                                                                           by_category,
                                                                                                                                                                                                                                                                               };

                                                                                                                                                                                                                                                                                   await writeSnapshot(snapshot);
                                                                                                                                                                                                                                                                                       console.log(`[snapshot] Built snapshot: ${rows.length} events across ${Object.keys(by_category).length} categories`);
                                                                                                                                                                                                                                                                                           return snapshot;

                                                                                                                                                                                                                                                                                             } catch (err) {
                                                                                                                                                                                                                                                                                                 console.error('[snapshot] Failed to build snapshot:', err);
                                                                                                                                                                                                                                                                                                     // Return last known state (don't crash)
                                                                                                                                                                                                                                                                                                         const fallback: IntelligenceSnapshot = {
                                                                                                                                                                                                                                                                                                               generated_at: new Date().toISOString(),
                                                                                                                                                                                                                                                                                                                     total: 0,
                                                                                                                                                                                                                                                                                                                           events: [],
                                                                                                                                                                                                                                                                                                                                 by_category: {},
                                                                                                                                                                                                                                                                                                                                     };
                                                                                                                                                                                                                                                                                                                                         return fallback;
                                                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                                                           }

                                                                                                                                                                                                                                                                                                                                           /**
                                                                                                                                                                                                                                                                                                                                            * Write snapshot to public/data/intelligence.json
                                                                                                                                                                                                                                                                                                                                             * Creates directory if it doesn't exist.
                                                                                                                                                                                                                                                                                                                                              */
                                                                                                                                                                                                                                                                                                                                              async function writeSnapshot(snapshot: IntelligenceSnapshot): Promise<void> {
                                                                                                                                                                                                                                                                                                                                                try {
                                                                                                                                                                                                                                                                                                                                                    const dir = join(process.cwd(), 'public', 'data');
                                                                                                                                                                                                                                                                                                                                                        await mkdir(dir, { recursive: true });
                                                                                                                                                                                                                                                                                                                                                            const file = join(dir, 'intelligence.json');
                                                                                                                                                                                                                                                                                                                                                                await writeFile(file, JSON.stringify(snapshot, null, 2), 'utf-8');
                                                                                                                                                                                                                                                                                                                                                                  } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                      console.error('[snapshot] Failed to write snapshot file:', err);
                                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                                        }
 */