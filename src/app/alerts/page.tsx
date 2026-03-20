'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { EmailDigestCard } from '@/components/alerts/EmailDigestCard';
import { AlertPreferencesCard } from '@/components/alerts/AlertPreferencesCard';
import { useAnalytics } from '@/hooks/useAnalytics';

const BREADCRUMB: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  textDecoration: 'none',
};

export default function AlertsPage() {
  const { trackPageView } = useAnalytics();
  useEffect(() => { trackPageView('/alerts'); }, [trackPageView]);

  return (
    <div className="page-enter">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <Link href="/" style={BREADCRUMB}>← Home</Link>
        <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
        <span style={{ ...BREADCRUMB, color: 'var(--text)' }}>Alerts</span>
      </div>

      {/* Header */}
      <div className="ph" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="ph-title">
            Your <span className="ph-hi">Alerts</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, maxWidth: 560, marginTop: 10 }}>
            High-impact signals, rising momentum, and emerging trends — curated
            for your watched entities. Grouped by entity, latest first.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <AlertsPanel />
        <AlertPreferencesCard />
        <EmailDigestCard />
      </div>
    </div>
  );
}
