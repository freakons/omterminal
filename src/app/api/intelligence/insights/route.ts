export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/db/client';
import { Insight } from '@/insights/types';

interface InsightRow {
  title: string;
  summary: string;
  category: string;
  topics: string[] | null;
  confidence: number;
  created_at: string | null;
}

// Ranking model: Insights are a separate data type from signals, stored in
// their own table with their own confidence metric.  They intentionally use
// confidence-based ordering rather than signal significance_score because
// insights represent synthesized analysis, not raw intelligence events.
export async function GET(request: NextRequest) {
  console.log('[api] API request: insights');

  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);
  const cursor = Math.max(0, parseInt(searchParams.get('cursor') ?? '0', 10) || 0);

  try {
    const rows = await dbQuery<InsightRow>`
      SELECT title, summary, category, topics, confidence, created_at
      FROM insights
      ORDER BY confidence DESC
      LIMIT ${limit + 1}
      OFFSET ${cursor}
    `;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const insights: Insight[] = pageRows.map((row) => ({
      title:      row.title,
      summary:    row.summary,
      category:   row.category,
      topics:     Array.isArray(row.topics) ? row.topics : [],
      confidence: row.confidence,
      created_at: row.created_at ?? undefined,
    }));

    const source = insights.length > 0 ? 'db' : 'empty';
    return NextResponse.json(
      {
        ok: true,
        insights,
        count: insights.length,
        source,
        hasMore,
        nextCursor: hasMore ? cursor + limit : null,
      },
      { headers: { 'x-data-origin': source } },
    );
  } catch (err) {
    console.error('[api/intelligence/insights] DB error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch insights', insights: [], hasMore: false, nextCursor: null },
      { status: 503, headers: { 'x-data-origin': 'error' } },
    );
  }
}
