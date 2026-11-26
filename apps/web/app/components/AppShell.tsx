import type { ReactNode } from 'react';
import type { Session } from '../lib/session';
import { css } from '../../styled-system/css';
import { AppNavigation } from './AppNavigation';
import { StorageSessionBridge } from './StorageSessionBridge';
import { WelcomeBackToast } from './WelcomeBackToast';

interface Props {
  children: ReactNode;
  session: Session | null;
  // Translated label for the skip link. Passed in by the async layout
  // owner via `getTranslations` so AppShell stays a sync component and
  // can still be unit-tested with @testing-library.
  skipLinkLabel: string;
}

const shellClass = css({ minHeight: '[100vh]', display: 'flex', flexDirection: 'column' });

// Shown only while focused, so keyboard users can skip the navigation.
const skipLinkClass = css({
  position: 'absolute',
  top: '[-100px]',
  insetInlineStart: '4',
  zIndex: 1000,
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '[40px]',
  paddingInline: '6',
  borderRadius: 'full',
  background: 'inverseSurface',
  color: 'inverseOnSurface',
  textStyle: 'labelLarge',
  textDecoration: 'none',
  _focus: { top: '4' }
});

// The navigation and the page side by side: the bar below the page in a
// compact window, the rail at the start edge from the medium window size class.
const frameClass = css({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  medium: { flexDirection: 'row' }
});

// Each page lays itself out edge to edge.
const mainClass = css({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  _focus: { outline: 'none' }
});

const contentClass = css({
  flex: '1',
  minWidth: '[0]',
  display: 'flex',
  flexDirection: 'column'
});

export function AppShell({ children, session, skipLinkLabel }: Props) {
  return (
    <div className={shellClass}>
      {/* Renders before any storage-consuming descendant so the cache
       * gate is set before its first read. */}
      <StorageSessionBridge signedIn={session !== null} />
      {/* Skip link is the first focusable element on every page so keyboard
       * users can bypass the nav and jump straight to the route content. The
       * main landmark is given tabIndex={-1} so that focus actually lands on
       * it after activation rather than scrolling past silently. */}
      <a href="#main-content" className={skipLinkClass}>
        {skipLinkLabel}
      </a>
      <div className={frameClass}>
        <AppNavigation />
        <div className={contentClass}>
          <main id="main-content" tabIndex={-1} className={mainClass} role="main">
            {children}
          </main>
        </div>
      </div>
      {/* Read `?welcome-back=1` and surface the ADR-0024 §4
       * reactivation toast. Mounted at the shell rather than per-page
       * so a user who lands on any route after sign-in sees it. */}
      <WelcomeBackToast />
    </div>
  );
}
