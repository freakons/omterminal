import Link from 'next/link';
import { slugify } from '@/utils/sanitize';

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

const ENTITY_CARD: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderRadius: 10,
  border: '1px solid var(--border2)', background: 'var(--glass2)',
  textDecoration: 'none', transition: 'border-color 0.15s',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EntityItem {
  name: string;
  type?: string;
  role?: string;
}

interface KeyEntitiesProps {
  /** The primary entity for this signal */
  primaryEntity: string | null;
  /** Additional affected entities from context */
  affectedEntities: EntityItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * KeyEntities — displays the key companies, models, and organizations
 * involved in a signal with links to their entity pages.
 */
export function KeyEntities({ primaryEntity, affectedEntities }: KeyEntitiesProps) {
  // Build deduplicated entity list, primary first
  const entityMap = new Map<string, EntityItem>();

  if (primaryEntity) {
    entityMap.set(primaryEntity.toLowerCase(), {
      name: primaryEntity,
      type: undefined,
      role: 'Primary entity',
    });
  }

  for (const entity of affectedEntities) {
    const key = entity.name.toLowerCase();
    if (!entityMap.has(key)) {
      entityMap.set(key, entity);
    }
  }

  const entities = Array.from(entityMap.values());

  if (entities.length === 0) {
    return null;
  }

  return (
    <div style={GLASS_CARD}>
      <h2 style={{ ...SECTION_HEADER, margin: 0, marginBottom: 16 }}>Key Entities</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {entities.map((entity) => (
          <Link
            key={entity.name}
            href={`/entity/${slugify(entity.name)}`}
            style={ENTITY_CARD}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: 'var(--fm)', fontSize: 13, color: 'var(--indigo-l)', fontWeight: 500 }}>
                {entity.name}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {entity.type && (
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--text3)',
                  }}>
                    {entity.type}
                  </span>
                )}
                {entity.role && (
                  <span style={{
                    fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--text3)', opacity: 0.7,
                  }}>
                    {entity.role}
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--text3)' }}>
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
