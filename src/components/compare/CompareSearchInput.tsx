'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface EntityOption {
  name: string;
  slug: string;
  sector?: string;
}

const MIN_ENTITIES = 2;
const MAX_ENTITIES = 5;

/**
 * Client-side entity selector for the Compare page.
 * Fetches entities from /api/entities and lets users pick 2–5 to compare.
 */
export function CompareSearchInput({ initialSlugs = [] }: { initialSlugs?: string[] }) {
  const router = useRouter();
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [selected, setSelected] = useState<string[]>(initialSlugs);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch entity list once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/entities?limit=100');
        const data = await res.json();
        if (!cancelled && data.entities) {
          const slugify = (t: string) =>
            t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
          setEntities(
            data.entities.map((e: { name: string; sector?: string }) => ({
              name: e.name,
              slug: slugify(e.name),
              sector: e.sector,
            })),
          );
        }
      } catch {
        // silently fail — user can still use URL
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = entities.filter(
    (e) =>
      !selected.includes(e.slug) &&
      (e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.slug.includes(query.toLowerCase())),
  );

  const addEntity = useCallback((slug: string) => {
    if (selected.length >= MAX_ENTITIES) return;
    setSelected((prev) => [...prev, slug]);
    setQuery('');
    setOpen(false);
  }, [selected.length]);

  const removeEntity = useCallback((slug: string) => {
    setSelected((prev) => prev.filter((s) => s !== slug));
  }, []);

  const canCompare = selected.length >= MIN_ENTITIES;

  const handleCompare = () => {
    if (!canCompare) return;
    router.push(`/compare?entities=${selected.join(',')}`);
  };

  const getName = (slug: string) => entities.find((e) => e.slug === slug)?.name ?? slug;

  return (
    <div style={{
      padding: '24px 28px', borderRadius: 'var(--r)',
      background: 'var(--glass2)', border: '1px solid var(--border)',
    }}>
      {/* Label */}
      <div style={{
        fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Select entities to compare</span>
        <span style={{ color: selected.length >= MIN_ENTITIES ? 'var(--emerald-l)' : 'var(--text3)' }}>
          {selected.length} / {MAX_ENTITIES}
        </span>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {selected.map((slug) => (
            <span
              key={slug}
              style={{
                fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.04em',
                color: 'var(--text)', padding: '5px 10px 5px 12px', borderRadius: 7,
                background: 'var(--glass3)', border: '1px solid var(--border2)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {getName(slug)}
              <button
                onClick={() => removeEntity(slug)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 13, lineHeight: 1, padding: 0,
                }}
                aria-label={`Remove ${getName(slug)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      {selected.length < MAX_ENTITIES && (
        <div ref={wrapRef} style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={loading ? 'Loading entities…' : `Search entities… (${MIN_ENTITIES}–${MAX_ENTITIES} required)`}
            disabled={loading}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: 'var(--glass)', border: '1px solid var(--border2)',
              color: 'var(--text)', fontFamily: 'var(--f)', fontSize: 13,
              outline: 'none',
            }}
          />
          {open && filtered.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              marginTop: 4, maxHeight: 220, overflowY: 'auto',
              background: 'var(--ink2)', border: '1px solid var(--border2)',
              borderRadius: 8, boxShadow: 'var(--shadow-card)',
            }}>
              {filtered.slice(0, 12).map((e) => (
                <button
                  key={e.slug}
                  onClick={() => addEntity(e.slug)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 14px', border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text)', fontFamily: 'var(--f)', fontSize: 13,
                  }}
                  onMouseEnter={(ev) => { (ev.target as HTMLElement).style.background = 'var(--glass2)'; }}
                  onMouseLeave={(ev) => { (ev.target as HTMLElement).style.background = 'transparent'; }}
                >
                  <span>{e.name}</span>
                  {e.sector && (
                    <span style={{
                      fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--text3)',
                    }}>
                      {e.sector}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validation message */}
      {selected.length > 0 && selected.length < MIN_ENTITIES && (
        <p style={{
          fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--amber-l)',
          marginBottom: 12,
        }}>
          Add at least {MIN_ENTITIES - selected.length} more {selected.length === 1 ? 'entity' : 'entities'} to compare.
        </p>
      )}

      {/* Compare button */}
      <button
        onClick={handleCompare}
        disabled={!canCompare}
        style={{
          fontFamily: 'var(--fm)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '11px 28px', borderRadius: 8, cursor: canCompare ? 'pointer' : 'default',
          background: canCompare
            ? 'linear-gradient(135deg, var(--indigo), var(--cyan))'
            : 'var(--glass2)',
          color: canCompare ? '#fff' : 'var(--text3)',
          border: canCompare ? 'none' : '1px solid var(--border)',
          boxShadow: canCompare ? '0 8px 24px rgba(79,70,229,0.35)' : 'none',
          transition: 'all 0.2s',
          width: '100%',
        }}
      >
        {canCompare ? `Compare ${selected.length} Entities` : `Select ${MIN_ENTITIES}–${MAX_ENTITIES} Entities`}
      </button>
    </div>
  );
}
