import { NextResponse } from 'next/server';
import { dbQuery } from '@/db/client';
import { TrendResult } from '@/trends/types';

interface TrendRow {
  topic: string;
  category: string;
  signal_count: number;
  entities: string[] | null;
  summary: string;
  confidence: number;
}

export async function GET() {
  console.log('[api] API request: trends');

  const rows = await dbQuery<TrendRow>`
    SELECT topic, category, signal_count, entities, summary, confidence
    FROM trends
    ORDER BY confidence DESC
    LIMIT 20
  `;

  const trends: TrendResult[] = rows.map((row) => ({
    topic:        row.topic,
    category:     row.category,
    signal_count: row.signal_count,
    entities:     Array.isArray(row.entities) ? row.entities : [],
    summary:      row.summary,
    confidence:   row.confidence,
  }));

  return NextResponse.json({ trends });
}
