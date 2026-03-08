import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/db/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let email = '';
  try {
    const body = await req.json();
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  await dbQuery`
    INSERT INTO access_requests (email)
    VALUES (${email})
    ON CONFLICT (email) DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
