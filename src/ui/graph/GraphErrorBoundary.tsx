'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches runtime crashes from ForceGraph2D / D3
 * and renders a safe fallback instead of crashing the entire page.
 */
export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GraphErrorBoundary] caught error:', error);
    console.error('[GraphErrorBoundary] component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            gap: 16,
            padding: 32,
            color: 'rgba(238,238,248,0.55)',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            !
          </div>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontWeight: 500, color: 'rgba(238,238,248,0.75)', marginBottom: 6 }}>
              Graph failed to render
            </div>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
              The ecosystem graph encountered an error. Try refreshing the page.
            </div>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{
              marginTop: 8,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 6,
              color: '#93c5fd',
              fontSize: '0.78rem',
              padding: '6px 16px',
              cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
