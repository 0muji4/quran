import type { ReactNode } from 'react';
import type { Session } from '../lib/session';
import { initialFor } from '../lib/session';
import { StorageSessionBridge } from './StorageSessionBridge';
import { TopNav } from './TopNav';

type Props = {
  children: ReactNode;
  session: Session | null;
  // Translated label for the skip link. Passed in by the async layout
  // owner via `getTranslations` so AppShell stays a sync component and
  // can still be unit-tested with @testing-library.
  skipLinkLabel: string;
};

export function AppShell({ children, session, skipLinkLabel }: Props) {
  const sessionView = session
    ? { initial: initialFor(session), label: session.displayName ?? session.email }
    : null;

  return (
    <div className="page-shell">
      {/* Renders before any storage-consuming descendant so the cache
       * gate is set before its first read. */}
      <StorageSessionBridge signedIn={session !== null} />
      {/* Skip link is the first focusable element on every page so keyboard
       * users can bypass the nav and jump straight to the route content. The
       * main landmark is given tabIndex={-1} so that focus actually lands on
       * it after activation rather than scrolling past silently. */}
      <a href="#main-content" className="skip-link">
        {skipLinkLabel}
      </a>
      <TopNav session={sessionView} />
      <main id="main-content" tabIndex={-1} className="page-content" role="main">
        {children}
      </main>
    </div>
  );
}
