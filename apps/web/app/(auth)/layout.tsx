import type { ReactNode } from 'react';
import { css } from '../../styled-system/css';

const AUTH_MOBILE_MQ = '@media (max-width: 720px)';

const viewportClass = css({
  minHeight: '[100vh]',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  backgroundColor: 'bg.page',
  [AUTH_MOBILE_MQ]: { gridTemplateColumns: '1fr' }
});

// The auth route group renders full-bleed with no TopNav — the two-panel
// sign-in / sign-up design owns the whole viewport. This layout still
// provides the <main> landmark that the root layout no longer supplies.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={viewportClass}>
      {children}
    </main>
  );
}
