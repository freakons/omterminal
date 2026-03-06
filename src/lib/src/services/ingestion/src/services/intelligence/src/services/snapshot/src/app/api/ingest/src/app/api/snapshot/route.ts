/**
 *  * Intelligence Snapshot API Route
  * GET /api/snapshot
   *
    * Rebuilds the Bloomberg-style static intelligence snapshot.
     * Reads from Neon DB → writes to public/data/intelligence.json
      *
       * Protected by CRON_SECRET.
        * Scheduled: every 10 minutes via Vercel cron (*\/10 * * * *)
         *
          * NOTE: This uses Node.js runtime (not Edge) because it writes to filesystem.
           */
           import { NextRequest, NextResponse } from 'next/server';
           import { buildSnapshot } from '@/services/snapshot/buildSnapshot';

           export const runtime = 'nodejs'; // Needs fs module for file writes
           export const maxDuration = 30;

           export async function GET(req: NextRequest) {
             // Protect endpoint with CRON_SECRET
               const cronSecret = req.headers.get('x-vercel-cron-secret') || '';
                 const querySecret = new URL(req.url).searchParams.get('secret') || '';
                   const expected = process.env.CRON_SECRET || '';

                     if (expected && cronSecret !== expected && querySecret !== expected) {
                         return new NextResponse('Unauthorized', { status: 401 });
                           }

                             try {
                                 const snapshot = await buildSnapshot();

                                     return NextResponse.json({
                                           ok: true,
                                                 total: snapshot.total,
                                                       categories: Object.keys(snapshot.by_category),
                                                             generated_at: snapshot.generated_at,
                                                                 });
                                                                   } catch (err) {
                                                                       console.error('[snapshot] route error:', err);
                                                                           return NextResponse.json(
                                                                                 { error: String(err) },
                                                                                       { status: 500 }
                                                                                           );
                                                                                             }
                                                                                             }
 */