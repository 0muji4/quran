import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AppShell } from '../../components/AppShell';
import { getCurrentSession } from '../../lib/session';

// Every page gets the navigation, the skip link and the <main> landmark. The
// session fetch lives here rather than in the root layout, which stays thin.
// Route groups do not affect URLs.
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const [session, t] = await Promise.all([getCurrentSession(), getTranslations('nav')]);
  return (
    <AppShell session={session} skipLinkLabel={t('skipToContent')}>
      {children}
    </AppShell>
  );
}
