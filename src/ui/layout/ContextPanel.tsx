import { GlassCard } from '../components/GlassCard';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';

const SIGNAL_SUMMARY: Array<{
  category: 'signals' | 'models' | 'funding' | 'regulation';
  label: string;
  state: 'live' | 'pending' | 'passed';
}> = [
  { category: 'signals',    label: 'Signals',    state: 'live'    },
  { category: 'models',     label: 'Models',     state: 'pending' },
  { category: 'funding',    label: 'Funding',    state: 'passed'  },
  { category: 'regulation', label: 'Regulation', state: 'live'    },
];

/**
 * ContextPanel — right-side panel displaying contextual intelligence.
 * Shows context relevant to the current view, with signal summary cards.
 */
export function ContextPanel() {
  return (
    <aside className="il-ctx">
      <div className="il-ctx-hd">
        <div className="il-ctx-hd-dot" />
        Context Intelligence Panel
      </div>

      <GlassCard>
        <div style={{ padding: '4px' }}>
          <div style={{
            fontFamily: 'var(--fm)',
            fontSize: '8.5px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--text3)',
            marginBottom: '10px',
          }}>
            Active Context
          </div>
          <div style={{
            fontFamily: 'var(--fd)',
            fontSize: '15px',
            fontStyle: 'italic',
            color: 'var(--text)',
            marginBottom: '8px',
            lineHeight: '1.3',
          }}>
            Context Intelligence Panel
          </div>
          <p style={{
            fontFamily: 'var(--f)',
            fontSize: '12px',
            color: 'var(--text2)',
            lineHeight: '1.6',
          }}>
            Contextual information and related signals will appear here based on your current view.
          </p>
        </div>
      </GlassCard>

      <GlassCard>
        <div style={{ padding: '4px' }}>
          <div style={{
            fontFamily: 'var(--fm)',
            fontSize: '8.5px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--text3)',
            marginBottom: '12px',
          }}>
            Signal Summary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SIGNAL_SUMMARY.map(({ category, label, state }) => (
              <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge category={category} label={label} />
                <StatusIndicator state={state} />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </aside>
  );
}
