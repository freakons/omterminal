'use client';

import { useState } from 'react';

interface ThreadPreviewProps {
  platform: 'twitter' | 'linkedin';
  label: string;
  items: string[];
  stats: Record<string, number>;
}

export function ThreadPreview({ platform, label, items, stats }: ThreadPreviewProps) {
  const [copied, setCopied] = useState(false);

  const fullText = items.join(platform === 'twitter' ? '\n\n---\n\n' : '\n');

  function handleCopy() {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="thread-preview">
      <div className="thread-preview-header">
        <h2 className="thread-preview-label">{label}</h2>
        <div className="thread-preview-stats">
          {Object.entries(stats).map(([key, val]) => (
            <span key={key} className="thread-stat">
              {val} {key}
            </span>
          ))}
        </div>
        <button className="thread-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="thread-preview-body">
        {items.map((item, i) => (
          <div key={i} className="thread-item">
            {platform === 'twitter' && items.length > 1 && (
              <span className="thread-item-num">{i + 1}/{items.length}</span>
            )}
            <pre className="thread-item-text">{item}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
