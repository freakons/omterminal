'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Signals',  href: '/dashboard/signals'  },
  { label: 'Trends',   href: '/dashboard/trends'   },
  { label: 'Insights', href: '/dashboard/insights' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="dash-tab-nav" aria-label="Dashboard sections">
      {TABS.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`dash-tab${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
