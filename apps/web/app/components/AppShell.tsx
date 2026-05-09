import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      {/* Skip link is the first focusable element on every page so keyboard
       * users can bypass the nav and jump straight to the route content. The
       * main landmark is given tabIndex={-1} so that focus actually lands on
       * it after activation rather than scrolling past silently. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="page-content" role="main">
        {children}
      </main>
    </div>
  );
}
