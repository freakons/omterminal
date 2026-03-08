'use client';

import { useState } from 'react';

export default function RequestAccessButton() {
  const [state, setState] = useState<'idle' | 'open' | 'loading' | 'done' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState('done');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Something went wrong.');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <button className="cta-primary" onClick={() => setState('open')}>
        Request Access &rarr;
      </button>
    );
  }

  if (state === 'done') {
    return (
      <div className="cta-primary" style={{ cursor: 'default', opacity: 0.85 }}>
        ✓ You&apos;re on the list
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          required
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'loading'}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            color: 'inherit',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button type="submit" className="cta-primary" disabled={state === 'loading'}>
          {state === 'loading' ? '...' : 'Join →'}
        </button>
      </div>
      {state === 'error' && (
        <div style={{ fontSize: 12, color: '#f87171' }}>{errorMsg}</div>
      )}
    </form>
  );
}
