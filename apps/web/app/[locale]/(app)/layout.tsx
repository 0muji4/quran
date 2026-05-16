import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { getCurrentSession } from '../../lib/session';

// The main app route group: everything that gets the persistent chrome
// (TopNav + skip-link + constrained <main>). The session fetch lives here
// rather than the root layout so the (auth) group can render full-bleed
// without the nav. Route groups do not affect URLs.
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  return <AppShell session={session}>{children}</AppShell>;
}
