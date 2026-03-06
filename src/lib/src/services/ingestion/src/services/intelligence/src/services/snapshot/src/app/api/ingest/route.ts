/**
 *  * Intelligence Ingestion API Route
  * POST/GET /api/ingest
   *
    * Triggers GNews ingestion into the Neon database.
     * Protected by CRON_SECRET.
      * Scheduled: every 6 hours via Vercel cron (0 *\/6 * * *)
       *
        * After ingestion, automatically triggers snapshot rebuild.
         */
         import { NextRequest, NextResponse } from 'next/server';
         import { ingestGNews } from '@/services/ingestion/gnewsFetcher';

         export const maxDuration = 60; // Allow up to 60 seconds for ingestion

         export async function GET(req: NextRequest) {
           // Protect endpoint with CRON_SECRET
             const cronSecret = req.headers.get('x-vercel-cron-secret') || '';
               const querySecret = new URL(req.url).searchParams.get('secret') || '';
                 const expected = process.env.CRON_SECRET || '';

                   if (expected && cronSecret !== expected && querySecret !== expected) {
                       return new NextResponse('Unauthorized', { status: 401 });
                         }

                           try {
                               const result = await ingestGNews();

                                   // After successful ingestion, trigger snapshot rebuild
                                       // Fire and forget — don't wait for it to complete
                                           const baseUrl = req.headers.get('x-forwarded-host')
                                                 ? `https://${req.headers.get('x-forwarded-host')}`
                                                       : 'https://www.omterminal.com';

                                                           fetch(`${baseUrl}/api/snapshot?secret=${expected}`, { method: 'GET' })
                                                                 .catch(err => console.error('[ingest] snapshot trigger failed:', err));

                                                                     return NextResponse.json({
                                                                           ok: true,
                                                                                 ...result,
                                                                                       timestamp: new Date().toISOString(),
                                                                                           });
                                                                                             } catch (err) {
                                                                                                 console.error('[ingest] route error:', err);
                                                                                                     return NextResponse.json(
                                                                                                           { error: String(err) },
                                                                                                                 { status: 500 }
                                                                                                                     );
                                                                                                                       }
                                                                                                                       }

                                                                                                                       // Also handle POST (for manual triggers)
                                                                                                                       export const POST = GET;
 */