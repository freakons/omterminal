import { SourceAdapter } from './sourceAdapter';
import { RawSignal } from '../types';

const ARXIV_API = 'https://export.arxiv.org/api/query';

/** Extracts the text content of the first matching XML tag. */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

/** Returns every <entry>…</entry> block from the Atom feed. */
function extractEntries(xml: string): string[] {
  const entries: string[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    entries.push(m[1]);
  }
  return entries;
}

export class ArxivSource implements SourceAdapter {
  name: string;
  private query: string;

  constructor(query: string) {
    this.query = query;
    this.name = `arxiv:${query}`;
  }

  async fetchSignals(): Promise<RawSignal[]> {
    const params = new URLSearchParams({
      search_query: `all:${this.query.replace(/\s+/g, '+')}`,
      start: '0',
      max_results: '20',
      sortBy: 'submittedDate',
      sortOrder: 'descending',
    });

    const res = await fetch(`${ARXIV_API}?${params}`);

    if (!res.ok) {
      throw new Error(`arXiv API error ${res.status} for query "${this.query}"`);
    }

    const xml = await res.text();
    const entries = extractEntries(xml);

    console.log(`[arxivSource] arXiv papers fetched for "${this.query}"`);

    return entries.map((entry) => ({
      title: extractTag(entry, 'title').replace(/\s+/g, ' '),
      content: extractTag(entry, 'summary').replace(/\s+/g, ' '),
      url: extractTag(entry, 'id') || undefined,
      source: 'arxiv',
      published_at: extractTag(entry, 'published') || undefined,
    }));
  }
}
