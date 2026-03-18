'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { EntityProfile } from '@/data/mockEntities';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14,
};

// ─────────────────────────────────────────────────────────────────────────────
// WatchlistDiscovery
//
// Shows a searchable list of known entities the user is not yet watching.
// Lets them add directly without navigating to the entity dossier page.
// ─────────────────────────────────────────────────────────────────────────────

interface WatchlistDiscoveryProps {
  /** When true the panel renders inline (e.g. inside the empty state). */
  inline?: boolean;
}

export function WatchlistDiscovery({ inline = false }: WatchlistDiscoveryProps) {
  const { isWatched, add } = useWatchlist();
  const [entities, setEntities] = useState<EntityProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/entities?limit=80', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.entities)) setEntities(data.entities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return entities.filter((e) => {
      if (isWatched(e.id)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.sector.toLowerCase().includes(q) ||
        (e.country ?? '').toLowerCase().includes(q)
      );
    });
  }, [entities, query, isWatched]);

  if (loading) {
    return (
      <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
        Loading entities…
      </p>
    );
  }

  if (entities.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
        No entities available yet. Check back after the pipeline runs.
      </p>
    );
  }

  return (
    <div>
      {!inline && <div style={SECTION_HEADER}>Discover Entities</div>}

      {/* Search */}
      <input
        type="text"
        placeholder="Search entities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border2)',
          background: 'var(--glass2)',
          color: 'var(--text)',
          fontFamily: 'var(--fm)',
          fontSize: 12,
          outline: 'none',
          marginBottom: 12,
        }}
      />

      {visible.length === 0 ? (
        <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)' }}>
          {query ? 'No matching entities.' : 'You\'re watching all available entities.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {visible.map((entity) => (
            <DiscoveryRow key={entity.id} entity={entity} onAdd={add} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DiscoveryRow
// ─────────────────────────────────────────────────────────────────────────────

function DiscoveryRow({
  entity,
  onAdd,
}: {
  entity: EntityProfile;
  onAdd: (e: { slug: string; name: string; sector?: string; country?: string }) => void;
}) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd({ slug: entity.id, name: entity.name, sector: entity.sector, country: entity.country });
    setAdded(true);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 0 11px 12px',
        borderBottom: '1px solid var(--border)',
        gap: 12,
        opacity: added ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Entity info */}
      <Link
        href={`/entity/${entity.id}`}
        style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
      >
        <div style={{
          fontFamily: 'var(--fd)', fontSize: 15, fontStyle: 'italic',
          color: 'var(--text)', letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {entity.name}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
          {entity.sector && (
            <span style={{
              fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text3)',
              padding: '2px 6px', borderRadius: 8,
              border: '1px solid var(--border2)',
            }}>
              {entity.sector}
            </span>
          )}
          {entity.country && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
              {entity.country}
            </span>
          )}
          {entity.signalCount > 0 && (
            <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
              {entity.signalCount} signal{entity.signalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </Link>

      {/* Add button */}
      <button
        onClick={handleAdd}
        disabled={added}
        title={added ? 'Added to watchlist' : `Watch ${entity.name}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 12px',
          borderRadius: 8,
          border: added ? '1px solid rgba(79,70,229,0.4)' : '1px solid var(--border2)',
          background: added ? 'rgba(79,70,229,0.12)' : 'var(--glass2)',
          color: added ? 'var(--indigo-l)' : 'var(--text2)',
          fontFamily: 'var(--fm)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: added ? 'default' : 'pointer',
          transition: 'all 0.18s ease',
          flexShrink: 0,
        }}
      >
        {added ? (
          <>
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Watching
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Watch
          </>
        )}
      </button>
    </div>
  );
}
