import { NextResponse } from 'next/server';
import { getSignals } from '@/db/queries';

export async function GET() {
  console.log('[api] API request: signals');

  const signals = await getSignals(50);

  return NextResponse.json({ signals });
}
