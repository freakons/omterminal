'use client';

import { useState } from 'react';

interface CopyInsightButtonProps {
  text: string;
}

export function CopyInsightButton({ text }: CopyInsightButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy insight to clipboard'}
      style={{
        background: 'none',
        border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
        borderRadius: 6,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        fontFamily: 'var(--fm)',
        fontSize: 9,
        letterSpacing: '0.08em',
        color: copied ? 'var(--emerald-l, #34d399)' : 'var(--text3)',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}
