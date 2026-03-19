import Link from 'next/link';
import type { AiEvent } from '@/data/mockEvents';
import type { Signal } from '@/data/mockSignals';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
};

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

const TIMELINE_DOT: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%',
  border: '2px solid var(--indigo-l)',
  background: 'var(--bg)', flexShrink: 0, zIndex: 1,
};

const TIMELINE_LINE: React.CSSProperties = {
  position: 'absolute', left: 3, top: 8, bottom: 0,
  width: 1, background: 'var(--border2)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  type: 'signal' | 'event';
  category?: string;
  href?: string;
}

function buildTimelineItems(
  signal: Signal,
  events: AiEvent[],
  relatedSignals: Signal[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Add the current signal
  items.push({
    id: signal.id,
    date: signal.date,
    title: signal.title,
    type: 'signal',
    category: signal.category,
  });

  // Add supporting events
  for (const evt of events) {
    items.push({
      id: evt.id,
      date: evt.date,
      title: evt.title,
      type: 'event',
      category: evt.type,
    });
  }

  // Add related signals
  for (const rel of relatedSignals) {
    items.push({
      id: rel.id,
      date: rel.date,
      title: rel.title,
      type: 'signal',
      category: rel.category,
      href: `/signals/${rel.id}`,
    });
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Sort chronologically (newest first)
  deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit to 10 items
  return deduped.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface SignalTimelineProps {
  signal: Signal;
  events: AiEvent[];
  relatedSignals: Signal[];
}

/**
 * SignalTimeline — lightweight chronological view of related events and signals.
 *
 * Simple vertical list with timeline dots. No heavy visualization.
 */
export function SignalTimeline({ signal, events, relatedSignals }: SignalTimelineProps) {
  const items = buildTimelineItems(signal, events, relatedSignals);

  if (items.length <= 1) {
    return null;
  }

  return (
    <div style={GLASS_CARD}>
      <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>Timeline</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => {
          const isCurrent = item.id === signal.id;
          const isLast = i === items.length - 1;

          const content = (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
              {/* Timeline track */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  ...TIMELINE_DOT,
                  ...(isCurrent ? { background: 'var(--indigo-l)', border: '2px solid var(--indigo-l)' } : {}),
                  ...(item.type === 'event' ? { border: '2px solid var(--text3)', width: 6, height: 6 } : {}),
                }} />
                {!isLast && <div style={{ ...TIMELINE_LINE, top: isCurrent ? 10 : 8 }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)',
                  }}>
                    {formatDate(item.date)}
                  </span>
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 7, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '1px 6px', borderRadius: 8,
                    border: '1px solid var(--border2)',
                    color: item.type === 'signal' ? 'var(--indigo-l)' : 'var(--text3)',
                  }}>
                    {item.type}
                  </span>
                  {item.category && (
                    <span style={{
                      fontFamily: 'var(--fm)', fontSize: 7, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'var(--text3)',
                    }}>
                      {item.category}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 12, lineHeight: 1.5,
                  color: isCurrent ? 'var(--text)' : 'var(--text2)',
                  fontWeight: isCurrent ? 500 : 400,
                }}>
                  {item.title}
                  {isCurrent && (
                    <span style={{
                      fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--indigo-l)',
                      marginLeft: 8,
                    }}>
                      Current
                    </span>
                  )}
                </span>
              </div>
            </div>
          );

          if (item.href && !isCurrent) {
            return (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
