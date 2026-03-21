import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <div className="footer-bar">
      <span className="fb-brand">{siteConfig.name}</span>
      <span className="footer-links">
        <Link href="/intelligence">Intelligence</Link>
        <Link href="/signals">Signals</Link>
        <Link href="/graph">Graph</Link>
        <Link href="/briefing">Briefing</Link>
        <Link href="/about">About</Link>
      </span>
      <span>&copy; {new Date().getFullYear()} {siteConfig.name} &middot; AI Intelligence Terminal</span>
    </div>
  );
}
