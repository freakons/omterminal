'use client';

import { useState } from 'react';

const CATEGORIES = [
  { key: 'All',        label: 'All Signals' },
  { key: 'Models',     label: 'Models' },
  { key: 'Agents',     label: 'Agents' },
  { key: 'Funding',    label: 'Funding' },
  { key: 'Research',   label: 'Research' },
  { key: 'Regulation', label: 'Regulation' },
  { key: 'Products',   label: 'Products' },
];

export function IntelligenceFilters() {
  const [active, setActive] = useState('All');

  return (
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
        </button>
      ))}
    </div>
  );
}
