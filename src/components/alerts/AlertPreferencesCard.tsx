'use client';

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Prefs {
  digestEnabled: boolean;
  highImpactOnly: boolean;
  includeTrendAlerts: boolean;
}

type CardState =
  | { phase: 'loading' }
  | { phase: 'ready'; prefs: Prefs; saving: string | null; error: string | null };

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  padding: '20px 24px',
  borderRadius: 'var(--r)',
  background: 'var(--glass)',
  border: '1px solid var(--border)',
};

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 14,
};

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  paddingBottom: 14,
  borderBottom: '1px solid var(--border)',
  marginBottom: 14,
};

const ROW_LAST: React.CSSProperties = {
  ...ROW,
  paddingBottom: 0,
  borderBottom: 'none',
  marginBottom: 0,
};

const ROW_TEXT: React.CSSProperties = {
  flex: 1,
};

const ROW_TITLE: React.CSSProperties = {
  fontFamily: 'var(--fm)',
  fontSize: 12,
  color: 'var(--text)',
  marginBottom: 2,
};

const ROW_DESC: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text3)',
  lineHeight: 1.6,
  margin: 0,
};

// Toggle button — pill-shaped switch
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        flexShrink: 0,
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--indigo, #6366f1)' : 'var(--border2, #2a2a3a)',
        position: 'relative',
        transition: 'background 0.18s ease',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.18s ease',
        }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AlertPreferencesCard() {
  const [state, setState] = useState<CardState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/alerts/preferences');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setState({
          phase: 'ready',
          prefs: data.preferences,
          saving: null,
          error: null,
        });
      } catch {
        if (!cancelled) {
          // Fall back to defaults
          setState({
            phase: 'ready',
            prefs: { digestEnabled: true, highImpactOnly: true, includeTrendAlerts: false },
            saving: null,
            error: null,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async (field: keyof Prefs, value: boolean) => {
    if (state.phase !== 'ready') return;

    // Optimistic update
    setState((s) =>
      s.phase === 'ready'
        ? { ...s, prefs: { ...s.prefs, [field]: value }, saving: field, error: null }
        : s,
    );

    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setState((s) =>
          s.phase === 'ready'
            ? { ...s, prefs: data.preferences, saving: null, error: null }
            : s,
        );
      } else {
        // Rollback
        setState((s) =>
          s.phase === 'ready'
            ? { ...s, prefs: { ...s.prefs, [field]: !value }, saving: null, error: 'Could not save. Try again.' }
            : s,
        );
      }
    } catch {
      setState((s) =>
        s.phase === 'ready'
          ? { ...s, prefs: { ...s.prefs, [field]: !value }, saving: null, error: 'Network error. Try again.' }
          : s,
      );
    }
  }, [state]);

  if (state.phase === 'loading') {
    return (
      <div style={CARD}>
        <div style={LABEL}>Alert Preferences</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Loading...</p>
      </div>
    );
  }

  const { prefs, saving, error } = state;

  const rows: Array<{
    field: keyof Prefs;
    title: string;
    description: string;
    last?: boolean;
  }> = [
    {
      field: 'digestEnabled',
      title: 'Daily digest',
      description: 'Receive a daily email briefing of key alerts for your watched entities.',
    },
    {
      field: 'highImpactOnly',
      title: 'High-impact alerts only',
      description: 'Only generate personal alerts for signals with high significance (priority 2). Filters out medium-priority noise.',
    },
    {
      field: 'includeTrendAlerts',
      title: 'Include trend & rising alerts',
      description: 'Also alert on emerging trend activity and rising momentum for watched entities.',
      last: true,
    },
  ];

  return (
    <div style={CARD}>
      <div style={LABEL}>Alert Preferences</div>

      {rows.map(({ field, title, description, last }) => (
        <div key={field} style={last ? ROW_LAST : ROW}>
          <div style={ROW_TEXT}>
            <div style={ROW_TITLE}>{title}</div>
            <p style={ROW_DESC}>{description}</p>
          </div>
          <Toggle
            checked={prefs[field]}
            onChange={(val) => toggle(field, val)}
            disabled={saving === field}
          />
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 11, color: 'var(--rose, #fb7185)', marginTop: 12, marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
