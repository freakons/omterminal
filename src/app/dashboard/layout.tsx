import type { Metadata } from 'next';
import { DashboardNav } from './DashboardNav';

export const metadata: Metadata = {
  title: 'Omterminal Intelligence',
  description: 'Intelligence dashboard — signals, trends, and insights.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-enter" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 className="dash-heading">Intelligence Dashboard</h1>
      <p className="dash-heading-sub">Signals · Trends · Insights</p>

      <DashboardNav />

      <main>{children}</main>
    </div>
  );
}
