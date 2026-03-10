import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function getClient(): Redis | null {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export async function getEdgeSignals() {
  try {
    const client = getClient();
    if (!client) return null;
    return await client.get('signals');
  } catch (err) {
    console.warn('[edgeCache] getEdgeSignals failed (Redis likely not configured):', err);
    return null;
  }
}

export async function setEdgeSignals(signals: unknown) {
  try {
    const client = getClient();
    if (!client) return;
    await client.set('signals', signals, { ex: 5 });
  } catch (err) {
    console.warn('[edgeCache] setEdgeSignals failed (Redis likely not configured):', err);
  }
}
