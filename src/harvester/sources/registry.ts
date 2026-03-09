import { SourceAdapter } from './sourceAdapter';
import { RssSource } from './rssSource';
import { GitHubReleaseSource } from './githubSource';
import { ArxivSource } from './arxivSource';

const RSS_FEEDS: string[] = [
  'https://news.ycombinator.com/rss',
  'https://www.theverge.com/rss/ai',
  'https://techcrunch.com/tag/artificial-intelligence/feed/',
  'https://venturebeat.com/category/ai/feed/',
];

const GITHUB_REPOS: [string, string][] = [
  ['huggingface', 'transformers'],
  ['langchain-ai', 'langchain'],
  ['openai', 'openai-cookbook'],
];

const ARXIV_QUERIES: string[] = [
  'large language model',
  'transformer architecture',
  'generative ai',
];

export function getSources(): SourceAdapter[] {
  const rssSources = RSS_FEEDS.map((url) => new RssSource(url));
  const githubSources = GITHUB_REPOS.map(([owner, repo]) => new GitHubReleaseSource(owner, repo));
  const arxivSources = ARXIV_QUERIES.map((query) => new ArxivSource(query));
  return [...rssSources, ...githubSources, ...arxivSources];
}
