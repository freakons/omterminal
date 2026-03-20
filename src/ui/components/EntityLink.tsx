'use client';

import Link from 'next/link';

interface EntityLinkProps {
  name: string;
  slug: string;
}

/**
 * Clickable entity name that navigates to the entity page.
 * Stops event propagation so it works inside parent Link wrappers.
 */
export function EntityLink({ name, slug }: EntityLinkProps) {
  return (
    <Link
      href={`/entity/${slug}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        fontFamily: 'var(--fm)',
        fontSize: '10.5px',
        color: 'var(--indigo-l)',
        textDecoration: 'none',
        transition: 'color 0.15s',
      }}
    >
      {name}
    </Link>
  );
}
