'use client';

import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AlertType = 'velocity_spike' | 'new_entity_cluster' | 'model_release_pattern';

interface Alert {
  type:   AlertType;
  entity: string;
  score:  number;
}

interface RadarResponse {
  timestamp: string;
  alerts:    Alert[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ALERT_LABELS: Record<AlertType, string> = {
  velocity_spike:        'velocity spike',
  new_entity_cluster:    'new entity cluster',
  model_release_pattern: 'model release pattern',
};

const ALERT_COLORS: Record<AlertType, string> = {
  velocity_spike:        'rgba(6,182,212,0.25)',
  new_entity_cluster:    'rgba(79,70,229,0.25)',
  model_release_pattern: 'rgba(217,119,6,0.25)',
};

const ALERT_TEXT: Record<AlertType, string> = {
  velocity_spike:        'var(--cyan-l)',
  new_entity_cluster:    'var(--indigo-l)',
  model_release_pattern: 'var(--amber-l)',
};

const POLL_INTERVAL_MS = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TrendRadar() {
  const [alerts,    setAlerts]    = useState<Alert[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);

  async function fetchRadar() {
    try {
      const res = await fetch('/api/radar');
      if (!res.ok) throw new Error('non-ok');
      const data: RadarResponse = await res.json();
      setAlerts(data.alerts);
      setUpdatedAt(data.timestamp);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRadar();
    const id = setInterval(fetchRadar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      padding: '20px 24px',
      borderRadius: 'var(--r)',
      background: 'var(--glass)',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text3)',
          }}>
            Trend Radar
          </span>
          {/* live pulse dot */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: error ? '#f87171' : 'var(--cyan-l)',
            display: 'inline-block',
            boxShadow: error ? 'none' : '0 0 6px var(--cyan-l)',
          }} />
        </div>
        {updatedAt && (
          <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--text3)' }}>
            {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* States */}
      {loading && (
        <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)' }}>Scanning…</p>
      )}

      {!loading && error && (
        <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: '#f87171' }}>Unable to reach radar — retrying.</p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p style={{ fontFamily: 'var(--fm)', fontSize: 12, color: 'var(--text3)' }}>No active alerts.</p>
      )}

      {!loading && !error && alerts.length > 0 && (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: '0 16px',
            padding: '0 0 8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
          }}>
            {['Entity', 'Alert type', 'Score'].map((h) => (
              <span key={h} style={{
                fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text3)',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Alert rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((alert, i) => (
              <div
                key={`${alert.entity}-${alert.type}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '0 16px',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {alert.entity}
                </span>

                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.06em',
                  padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap',
                  background: ALERT_COLORS[alert.type],
                  color: ALERT_TEXT[alert.type],
                  border: `1px solid ${ALERT_COLORS[alert.type]}`,
                }}>
                  {ALERT_LABELS[alert.type]}
                </span>

                <span style={{
                  fontFamily: 'var(--fm)', fontSize: 13, fontWeight: 600,
                  color: alert.score >= 80 ? 'var(--cyan-l)' : 'var(--text2)',
                  textAlign: 'right', minWidth: 32,
                }}>
                  {Math.round(alert.score)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
