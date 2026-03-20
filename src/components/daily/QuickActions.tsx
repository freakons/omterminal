/**
 * QuickActions — Shortcut bar for daily intelligence actions.
 *
 * Provides one-click access to:
 *   - Latest briefing
 *   - Top entity today
 *   - Most significant signal
 *
 * Server component — derives links from signal data.
 */

import Link from 'next/link';
import type { Signal } from '@/data/mockSignals';

interface QuickActionsProps {
  signals: Signal[];
}

export function QuickActions({ signals }: QuickActionsProps) {
  if (!signals || signals.length === 0) return null;

  // Most significant signal
  const topSignal = [...signals].sort((a, b) => {
    const sa = a.significanceScore ?? a.confidence ?? 0;
    const sb = b.significanceScore ?? b.confidence ?? 0;
    return sb - sa;
  })[0];

  // Top entity by signal count
  const entityCounts = new Map<string, { count: number; slug: string }>();
  for (const s of signals) {
    if (!s.entityName) continue;
    const existing = entityCounts.get(s.entityName);
    if (existing) {
      existing.count++;
    } else {
      entityCounts.set(s.entityName, {
        count: 1,
        slug: s.entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
    }
  }
  const topEntity = entityCounts.size > 0
    ? Array.from(entityCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0]
    : null;

  const actions = [
    {
      label: 'Latest Briefing',
      href: '/briefing',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      detail: 'Daily briefing',
    },
    topEntity ? {
      label: topEntity[0],
      href: `/entity/${topEntity[1].slug}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
      ),
      detail: `${topEntity[1].count} signals today`,
    } : null,
    topSignal ? {
      label: truncate(topSignal.title, 30),
      href: `/signals/${topSignal.id}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      detail: `Score: ${topSignal.significanceScore ?? topSignal.confidence ?? '—'}`,
    } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ReactNode; detail: string }>;

  return (
    <section className="daily-section" aria-label="Quick Actions">
      <div className="daily-section-header">
        <span className="daily-section-label">Quick Actions</span>
      </div>
      <div className="quick-actions-row">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="quick-action-card"
          >
            <div className="quick-action-icon">{action.icon}</div>
            <div className="quick-action-text">
              <span className="quick-action-label">{action.label}</span>
              <span className="quick-action-detail">{action.detail}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}
