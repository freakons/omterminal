'use client';

import Link from 'next/link';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { EmailDigestCard } from '@/components/alerts/EmailDigestCard';
import { AlertPreferencesCard } from '@/components/alerts/AlertPreferencesCard';

const BREADCRUMB: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  textDecoration: 'none',
};

export default function AlertsPage() {
  return (
    <div className="page-enter">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <Link href="/" style={BREADCRUMB}>← Home</Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <span style={{ ...BREADCRUMB, color: 'var(--text)' }}>Alerts</span>
      </div>

      {/* Header */}
      <div className="ph" style={{ marginBottom: 24 }}>
        <h1 className="ph-title">
          Your <span className="ph-hi">Alerts</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 560 }}>
          High-impact signals, rising momentum, and emerging trends — curated
          for your watched entities. Grouped by entity, latest first.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AlertsPanel />
        <AlertPreferencesCard />
        <EmailDigestCard />
      </div>
    </div>
  );
}
