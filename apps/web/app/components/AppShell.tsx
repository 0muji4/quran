import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <TopNav />
      <main className="page-content" role="main">
        {children}
      </main>
    </div>
  );
}
