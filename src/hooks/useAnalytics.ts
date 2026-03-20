/**
 * Analytics Hook — Client-side product event tracking.
 *
 * Sends lightweight events to /api/analytics/track via fire-and-forget
 * beacon/fetch calls. Never blocks UI rendering.
 */

'use client';

import { useCallback, useRef } from 'react';

interface TrackPayload {
  eventType: string;
  entitySlug?: string;
  signalId?: string;
  alertId?: string;
  properties?: Record<string, unknown>;
}

function sendEvent(payload: TrackPayload): void {
  try {
    const body = JSON.stringify(payload);
    // Prefer sendBeacon for fire-and-forget (survives page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // analytics must never break UI
  }
}

export function useAnalytics() {
  // Deduplicate rapid page_view calls for the same path within 2s
  const lastPageView = useRef<{ path: string; ts: number } | null>(null);

  const trackEvent = useCallback((event: string, properties?: Record<string, unknown>) => {
    sendEvent({ eventType: event, properties });
  }, []);

  const trackPageView = useCallback((path: string) => {
    const now = Date.now();
    if (
      lastPageView.current &&
      lastPageView.current.path === path &&
      now - lastPageView.current.ts < 2000
    ) {
      return;
    }
    lastPageView.current = { path, ts: now };
    sendEvent({ eventType: 'page_view', properties: { path } });
  }, []);

  const trackFilterUsed = useCallback((filterName: string, filterValue: string) => {
    sendEvent({ eventType: 'filter_used', properties: { filterName, filterValue } });
  }, []);

  const trackQuickAction = useCallback((action: string) => {
    sendEvent({ eventType: 'quick_action_clicked', properties: { action } });
  }, []);

  const trackGraphInteraction = useCallback((action: string, properties?: Record<string, unknown>) => {
    sendEvent({ eventType: 'graph_interaction', properties: { action, ...properties } });
  }, []);

  const trackCompareUsed = useCallback((entities: string[]) => {
    sendEvent({ eventType: 'compare_used', properties: { entities } });
  }, []);

  const trackCopyInsight = useCallback((signalId?: string) => {
    sendEvent({ eventType: 'copy_insight', signalId, properties: { signalId } });
  }, []);

  const trackSignalOpened = useCallback((signalId: string) => {
    sendEvent({ eventType: 'signal_opened', signalId });
  }, []);

  const trackEntityTracked = useCallback((entitySlug: string) => {
    sendEvent({ eventType: 'entity_tracked', entitySlug });
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackFilterUsed,
    trackQuickAction,
    trackGraphInteraction,
    trackCompareUsed,
    trackCopyInsight,
    trackSignalOpened,
    trackEntityTracked,
  };
}
