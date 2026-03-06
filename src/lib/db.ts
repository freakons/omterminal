/**
 *  * Neon Serverless Postgres connection.
  * Uses @neondatabase/serverless for Edge Runtime compatibility.
   * DATABASE_URL must be set in Vercel environment variables.
   *  */
   import { neon } from '@neondatabase/serverless';

   if (!process.env.DATABASE_URL) {
     console.warn('[db] DATABASE_URL not set — database features will be unavailable.');
     }

     /**
      * Tagged-template SQL client. Works on both Node.js and Edge runtimes.
       * Usage: await sql`SELECT * FROM intelligence_events WHERE id = ${id}`
        */
        export const sql = process.env.DATABASE_URL
          ? neon(process.env.DATABASE_URL)
            : null;

            /**
             * Execute a raw SQL query safely.
              * Returns empty array if database is not configured.
               */
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               export async function query<T = Record<string, unknown>>(
                 strings: TemplateStringsArray,
                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     ...values: any[]
                     ): Promise<T[]> {
                       if (!sql) return [];
                         try {
                             // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                 const result = await (sql as any)(strings, ...values);
                                     return result as T[];
                                       } catch (err) {
                                           console.error('[db] query error:', err);
                                               return [];
                                                 }
                                                 }
 */