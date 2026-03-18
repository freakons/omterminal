'use client';

import { useState } from 'react';
import { SignalCard } from '@/components/cards/SignalCard';
import { NewsCard } from '@/components/cards/NewsCard';
import type { SignalWithRankMeta } from '@/lib/signals/feedComposer';
import type { Article } from '@/lib/data/news';

// ─────────────────────────────────────────────────────────────────────────────
// Filter categories — must match signal.category values from the DB
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',        label: 'All Signals' },
  { key: 'models',     label: 'Models' },
  { key: 'agents',     label: 'Agents' },
  { key: 'funding',    label: 'Funding' },
  { key: 'research',   label: 'Research' },
  { key: 'regulation', label: 'Regulation' },
  { key: 'product',    label: 'Products' },
] as const;

type FilterKey = (typeof CATEGORIES)[number]['key'];

/** Signals created within this many hours are considered "emerging". */
const EMERGING_WINDOW_HOURS = 72;

function isRecentSignal(signal: SignalWithRankMeta): boolean {
  const ageMs = Date.now() - new Date(signal.date).getTime();
  return ageMs <= EMERGING_WINDOW_HOURS * 60 * 60 * 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface IntelligenceFeedProps {
  signals: SignalWithRankMeta[];
  articles: Article[];
}

export function IntelligenceFeed({ signals, articles }: IntelligenceFeedProps) {
  const [active, setActive] = useState<FilterKey>('all');

  // Count signals per category for filter badges
  const counts = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  // Section partitioning — signals are pre-ranked by feedComposer
  // top 5 by rank score → Top Signals section
  // remaining recent (≤72h) → Emerging Signals section
  // rest → More Signals section
  const topSignals = signals.slice(0, 5);
  const afterTop = signals.slice(5);
  const emergingSignals = afterTop.filter(isRecentSignal);
  const remainingSignals = afterTop.filter((s) => !isRecentSignal(s));

  // Show sectioned layout only when viewing all signals
  const showSections = active === 'all' && signals.length > 0;

  // Filtered flat list for category views
  const filtered = active === 'all'
    ? signals
    : signals.filter((s) => s.category === active);

  return (
    <>
      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="filters" role="tablist" aria-label="Filter signals by category">
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={active === key}
            className={`fp${active === key ? ' on' : ''}`}
            onClick={() => setActive(key)}
          >
            {label}
            {key !== 'all' && counts[key] != null && counts[key] > 0 && (
              <span className="fp-count">{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Structured sections (All view) ────────────────────────────── */}
      {showSections && (
        <>
          {/* Top Signals — highest ranked by significance, confidence, novelty */}
          <div className="feed-section">
            <div className="feed-section-header">
              <span className="feed-section-accent feed-section-accent--top" />
              <span className="feed-section-label">Top Signals</span>
              <span className="feed-section-count">{topSignals.length}</span>
            </div>
            <div className="news-grid">
              {topSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          </div>

          {/* Emerging Signals — recent signals within the last 72 hours */}
          {emergingSignals.length > 0 && (
            <div className="feed-section">
              <div className="feed-section-header">
                <span className="feed-section-accent feed-section-accent--emerging" />
                <span className="feed-section-label">Emerging Signals</span>
                <span className="feed-section-count">{emergingSignals.length}</span>
              </div>
              <div className="news-grid">
                {emergingSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </div>
          )}

          {/* More Signals — remaining, sorted by rank score */}
          {remainingSignals.length > 0 && (
            <div className="feed-section">
              <div className="feed-section-header">
                <span className="feed-section-accent feed-section-accent--more" />
                <span className="feed-section-label">More Signals</span>
                <span className="feed-section-count">{remainingSignals.length}</span>
              </div>
              <div className="news-grid">
                {remainingSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Filtered flat list (category view) ───────────────────────── */}
      {!showSections && filtered.length > 0 && (
        <div className="news-grid">
          {filtered.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      {/* ── Empty filter state ────────────────────────────────────────── */}
      {filtered.length === 0 && signals.length > 0 && (
        <div className="feed-empty">
          <p className="feed-empty-title">No signals in this category</p>
          <p className="feed-empty-sub">
            Try selecting a different filter, or check back — new intelligence is ingested continuously.
          </p>
          <button
            className="fp on"
            style={{ marginTop: 12 }}
            onClick={() => setActive('all')}
          >
            Show all signals
          </button>
        </div>
      )}

      {/* ── Article fallback (when no signals at all) ─────────────────── */}
      {signals.length === 0 && articles.length > 0 && (
        <div className="news-grid">
          {articles.filter(a => !a.featured).map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* ── Empty state (no data) ─────────────────────────────────────── */}
      {signals.length === 0 && articles.length === 0 && (
        <div className="feed-empty">
          <p className="feed-empty-title">No intelligence data yet</p>
          <p className="feed-empty-sub">
            The intelligence feed will populate automatically as the pipeline ingests data.
          </p>
        </div>
      )}
    </>
  );
}
