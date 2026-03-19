import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { PageHeader } from '@/components/ui/PageHeader';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'About OM Terminal — the AI Intelligence Terminal built for decision-makers.',
};

export const revalidate = 3600;

const GLASS_CARD: React.CSSProperties = {
  padding: '20px 24px', borderRadius: 'var(--r)',
  background: 'var(--glass)', border: '1px solid var(--border)',
};

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
  textTransform: 'uppercase' as const, color: 'var(--text3)', marginBottom: 12,
};

export default function AboutPage() {
  const { stats, features } = siteConfig;

  return (
    <>
      <PageHeader
        title="About"
        highlight={siteConfig.name}
        subtitle="The AI Intelligence Terminal — built for decision-makers, not doom-scrollers."
        gradient="var(--violet-l), var(--cyan-l)"
      />

      {/* Mission */}
      <div className="hero" style={{ padding: '32px 36px', marginBottom: 20 }}>
        <div className="hero-eyebrow">OUR MISSION</div>
        <h2 style={{
          fontFamily: 'var(--fd)', fontSize: 28, fontStyle: 'italic', color: 'var(--text)',
          letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.3,
        }}>
          Every signal that moves AI. One terminal.
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, maxWidth: 600, marginBottom: 16 }}>
          {siteConfig.name} is not a news site. It&apos;s not a blog. It&apos;s not a newsletter.
          It&apos;s a professional-grade AI intelligence terminal built for decision-makers who need
          structured, verified, and analyzed intelligence — not another feed to scroll.
        </p>
        <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, maxWidth: 600 }}>
          We track AI regulation, model releases, funding events, and global policy across{' '}
          <strong style={{ color: 'var(--text)' }}>{stats.markets} major markets</strong>,{' '}
          <strong style={{ color: 'var(--text)' }}>{stats.companies} companies</strong>, and{' '}
          <strong style={{ color: 'var(--text)' }}>{stats.sources} verified sources</strong>.
          Every signal is categorized, scored, and accompanied by &ldquo;So What For You&rdquo; editorial analysis.
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20,
      }}>
        {[
          { value: stats.signals, label: 'Signals tracked' },
          { value: stats.companies, label: 'Companies covered' },
          { value: stats.markets, label: 'Markets monitored' },
          { value: stats.sources, label: 'Verified sources' },
        ].map((s) => (
          <div key={s.label} style={{ ...GLASS_CARD, textAlign: 'center', padding: '20px 16px' }}>
            <div style={{
              fontFamily: 'var(--fd)', fontSize: 32, fontStyle: 'italic',
              color: 'var(--cyan-l)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6,
            }}>
              {s.value}
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* What's inside the terminal */}
      <div style={{ ...GLASS_CARD, marginBottom: 20 }}>
        <div style={LABEL}>What&apos;s inside the terminal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {features.map((feature, i) => (
            <div key={feature.title} style={{
              display: 'flex', gap: 16, padding: '16px 0', alignItems: 'flex-start',
              borderBottom: i < features.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--fm)', fontSize: 11, width: 140, flexShrink: 0,
                color: 'var(--text)', fontWeight: 600, paddingTop: 2,
              }}>
                {feature.title}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Built for */}
      <div className="hero" style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div style={LABEL}>Built for</div>
        <div className="feature-grid" style={{ maxWidth: 700, marginBottom: 0 }}>
          {[
            { title: 'AI Founders', body: 'Track competitors, regulation, and funding in your vertical.' },
            { title: 'Venture Capital', body: 'Structured deal flow intelligence and market signals.' },
            { title: 'Policy Analysts', body: 'Global regulatory tracking with impact analysis.' },
            { title: 'Enterprise Strategy', body: 'AI adoption intelligence for strategic planning.' },
          ].map((item) => (
            <div key={item.title} className="feat-card">
              <div className="feat-title" style={{ marginBottom: 6 }}>{item.title}</div>
              <div className="feat-body">{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA + Contact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 4 }}>
        <div style={{ ...GLASS_CARD }}>
          <div style={LABEL}>Start exploring</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>
            Browse today&apos;s intelligence feed or search for an entity to get a full dossier.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/intelligence" style={{
              fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--cyan-l)', textDecoration: 'none', padding: '6px 14px',
              border: '1px solid rgba(103,232,249,0.25)', borderRadius: 6,
              background: 'rgba(103,232,249,0.06)',
            }}>
              Intelligence Feed
            </Link>
            <Link href="/signals" style={{
              fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--text3)', textDecoration: 'none', padding: '6px 14px',
              border: '1px solid var(--border2)', borderRadius: 6,
            }}>
              Signals
            </Link>
          </div>
        </div>

        <div style={{ ...GLASS_CARD }}>
          <div style={LABEL}>Contact</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
            Partnerships, enterprise inquiries, or press:
          </p>
          <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--indigo-l)', marginBottom: 8 }}>
            {siteConfig.email}
          </p>
          <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)' }}>
            {siteConfig.domain}
          </p>
        </div>
      </div>
    </>
  );
}
