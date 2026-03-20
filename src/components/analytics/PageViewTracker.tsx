'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

/**
 * Drop-in client component that fires a page_view event on mount.
 * Renders nothing visible — intended to be included in server-rendered pages.
 */
export function PageViewTracker({ path }: { path: string }) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(path);
  }, [path, trackPageView]);

  return null;
}
