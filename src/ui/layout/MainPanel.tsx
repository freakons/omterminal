import { ReactNode } from 'react';

interface MainPanelProps {
  children: ReactNode;
}

/**
 * MainPanel — primary content area of the three-panel intelligence layout.
 * Renders page content passed as children within the center column.
 */
export function MainPanel({ children }: MainPanelProps) {
  return (
    <main className="il-main">
      {children}
    </main>
  );
}
