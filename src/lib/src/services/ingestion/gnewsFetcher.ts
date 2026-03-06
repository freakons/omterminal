/**
 *  * GNews Ingestion Worker
  * Fetches AI intelligence articles from GNews API and stores them in Neon Postgres.
   * Runs every 6 hours via Vercel cron: 0 */6 * * *
    */
    import { sql } from '@/lib/db';
    import { classifyArticle } from '@/services/intelligence/classifier';

    interface GNewsArticle {
      title: string;
        description: string;
          content: string;
            url: string;
              source: { name: string; url: string };
                publishedAt: string;
                  image: string | null;
                  }

                  interface GNewsResponse {
                    articles: GNewsArticle[];
                      totalArticles: number;
                      }

                      /**
                       * Ingest AI intelligence articles from GNews into the database.
                        * Uses ON CONFLICT DO NOTHING to avoid duplicates (keyed by source_url).
                         */
                         export async function ingestGNews(): Promise<{ ingested: number; skipped: number }> {
                           if (!sql) {
                               console.warn('[ingest] Database not configured — skipping ingestion.');
                                   return { ingested: 0, skipped: 0 };
                                     }

                                       const key = process.env.GNEWS_KEY;
                                         if (!key) {
                                             console.warn('[ingest] GNEWS_KEY not set — skipping ingestion.');
                                                 return { ingested: 0, skipped: 0 };
                                                   }

                                                     const queries = [
                                                         'artificial intelligence regulation',
                                                             'AI model release GPT Claude Gemini',
                                                                 'AI startup funding investment',
                                                                     'AI company acquisition merger',
                                                                         'AI research paper benchmark',
                                                                           ];

                                                                             let ingested = 0;
                                                                               let skipped = 0;

                                                                                 for (const query of queries) {
                                                                                     try {
                                                                                           const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&sortby=publishedAt&max=10&apikey=${key}`;
                                                                                                 const res = await fetch(url);
                                                                                                       if (!res.ok) {
                                                                                                               console.error(`[ingest] GNews error for query "${query}":`, res.status);
                                                                                                                       continue;
                                                                                                                             }

                                                                                                                                   const data = (await res.json()) as GNewsResponse;
                                                                                                                                         const articles = data.articles || [];

                                                                                                                                               for (const article of articles) {
                                                                                                                                                       const category = classifyArticle(article.title + ' ' + (article.description || ''));

                                                                                                                                                               try {
                                                                                                                                                                         await sql`
                                                                                                                                                                                     INSERT INTO intelligence_events (
                                                                                                                                                                                                   title, summary, source_url, source_name,
                                                                                                                                                                                                                 category, published_at
                                                                                                                                                                                                                             ) VALUES (
                                                                                                                                                                                                                                           ${article.title},
                                                                                                                                                                                                                                                         ${article.description || ''},
                                                                                                                                                                                                                                                                       ${article.url},
                                                                                                                                                                                                                                                                                     ${article.source.name},
                                                                                                                                                                                                                                                                                                   ${category},
                                                                                                                                                                                                                                                                                                                 ${article.publishedAt}
                                                                                                                                                                                                                                                                                                                             )
                                                                                                                                                                                                                                                                                                                                         ON CONFLICT (source_url) DO NOTHING
                                                                                                                                                                                                                                                                                                                                                   `;
                                                                                                                                                                                                                                                                                                                                                             ingested++;
                                                                                                                                                                                                                                                                                                                                                                     } catch {
                                                                                                                                                                                                                                                                                                                                                                               skipped++;
                                                                                                                                                                                                                                                                                                                                                                                       }
                                                                                                                                                                                                                                                                                                                                                                                             }
                                                                                                                                                                                                                                                                                                                                                                                                 } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                       console.error(`[ingest] Failed for query "${query}":`, err);
                                                                                                                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                                                                                                                             }

                                                                                                                                                                                                                                                                                                                                                                                                               console.log(`[ingest] Done: ${ingested} ingested, ${skipped} skipped`);
                                                                                                                                                                                                                                                                                                                                                                                                                 return { ingested, skipped };
                                                                                                                                                                                                                                                                                                                                                                                                                 }
 */