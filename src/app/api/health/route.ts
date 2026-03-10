export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { dbQuery } from '@/db/client';
import { pingRedis } from '@/lib/cache/redis';
import { getProvider, getActiveProviderName } from '@/lib/ai';

export async function GET() {
  // DB connectivity check
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    const rows = await dbQuery<{ now: string }>`SELECT NOW() AS now`;
    dbStatus = rows.length > 0 ? 'connected' : 'disconnected';
  } catch {
    dbStatus = 'disconnected';
  }

  // Redis connectivity check
  const redisStatus = await pingRedis();

  // LLM provider resolution — must call getProvider() to trigger resolution;
  // getActiveProviderName() only returns a value after the provider is initialised.
  let llmProviderError: string | undefined;
  try {
    await getProvider();
  } catch (err) {
    llmProviderError = err instanceof Error ? err.message : String(err);
  }

  const allOk = dbStatus === 'connected';

  const health = {
    ok: allOk,
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    version: '1.0.0',
    db: dbStatus,
    db_provider: process.env.DB_PROVIDER || 'neon',
    redis: redisStatus,
    llmProvider: getActiveProviderName() ?? 'not_resolved',
    llmDiagnostics: {
      aiProviderEnv: process.env.AI_PROVIDER ?? '(unset)',
      hasGroqKey: Boolean(process.env.GROQ_API_KEY),
      hasGrokKey: Boolean(process.env.GROK_API_KEY),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      ...(llmProviderError ? { error: llmProviderError } : {}),
    },
  };

  return NextResponse.json(health, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
