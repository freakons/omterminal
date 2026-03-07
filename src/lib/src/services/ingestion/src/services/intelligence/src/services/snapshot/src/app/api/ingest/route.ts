import { NextRequest, NextResponse } from 'next/server';
import { ingestGNews } from '@/services/ingestion/gnewsFetcher';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret') || '';
    const querySecret = new URL(req.url).searchParams.get('secret') || '';
      const expected = process.env.CRON_SECRET || '';

        if (expected && cronSecret !== expected && querySecret !== expected) {
            return new NextResponse('Unauthorized', { status: 401 });
              }

                try {
                    const result = await ingestGNews();

                        // Fire-and-forget snapshot rebuild after ingestion
                            const baseUrl = req.headers.get('x-forwarded-host')
                                  ? `https://${req.headers.get('x-forwarded-host')}`
                                        : 'https://www.omterminal.com';

                                            fetch(`${baseUrl}/api/snapshot?secret=${expected}`, { method: 'GET' })
                                                  .catch((err) => console.error('[ingest] snapshot trigger failed:', err));

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

                                                                                                        export const POST = GET;