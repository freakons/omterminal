/**
 * Data Service — Abstraction layer for data access.
 *
 * Strategy: DB-first with static seed fallback.
 *
 * Each function tries the live database first via src/db/queries.ts.
 * If the database returns an empty result, throws (e.g. missing DATABASE_URL
 * at build time), or has any other error, it falls back to the static arrays
 * in /lib/data — so all pages remain fully functional at all times.
 */

import { NEWS, type Article, getArticlesByCategory } from '@/lib/data/news';
import { REGULATIONS, type Regulation, getRegulationsByType } from '@/lib/data/regulations';
import { MODELS, type AIModel } from '@/lib/data/models';
import { FUNDING_ROUNDS, type FundingRound } from '@/lib/data/funding';
import { TICKERS, type TickerItem } from '@/lib/data/ticker';

import {
  getArticles as dbGetArticles,
  getFeaturedArticle as dbGetFeaturedArticle,
  getRegulations as dbGetRegulations,
  getModels as dbGetModels,
  getFundingRounds as dbGetFundingRounds,
} from '@/db/queries';

// Re-export types for consumers — unchanged so all imports keep working
export type { Article, Regulation, AIModel, FundingRound, TickerItem };

// ─────────────────────────────────────────────────────────────────────────────
// Articles
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchArticles(category?: string): Promise<Article[]> {
  try {
    const dbRows = await dbGetArticles(category, 100);
    if (dbRows.length > 0) return dbRows;
  } catch {
    // DB unavailable — fall through to static
  }
  return category && category !== 'all' ? getArticlesByCategory(category) : NEWS;
}

export async function fetchFeaturedArticle(): Promise<Article | undefined> {
  try {
    const dbArticle = await dbGetFeaturedArticle();
    if (dbArticle) return dbArticle;
  } catch {
    // DB unavailable — fall through to static
  }
  return NEWS.find(a => a.featured);
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulations
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRegulations(type?: string): Promise<Regulation[]> {
  try {
    const dbRows = await dbGetRegulations(type, 100);
    if (dbRows.length > 0) return dbRows;
  } catch {
    // DB unavailable — fall through to static
  }
  return type && type !== 'all' ? getRegulationsByType(type) : REGULATIONS;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Models
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchModels(): Promise<AIModel[]> {
  try {
    const dbRows = await dbGetModels(100);
    if (dbRows.length > 0) return dbRows;
  } catch {
    // DB unavailable — fall through to static
  }
  return MODELS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funding Rounds
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFundingRounds(): Promise<FundingRound[]> {
  try {
    const dbRows = await dbGetFundingRounds(100);
    if (dbRows.length > 0) return dbRows;
  } catch {
    // DB unavailable — fall through to static
  }
  return FUNDING_ROUNDS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticker items
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTickerItems(): Promise<TickerItem[]> {
  // Ticker items are derived from the latest articles/signals.
  // Currently served from static seed; replace with a DB query once a
  // `ticker_items` view or table is introduced.
  return TICKERS;
}
