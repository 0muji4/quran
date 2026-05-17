'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../../i18n/navigation';
import { Toast } from './Toast';

// Reads `?welcome-back=1` from the URL, shows a Welcome-back toast,
// and strips the param after the toast goes away so a refresh /
// back-forward doesn't replay it. Sister component to
// `CompletionToast` — both opt into the same accessible <Toast>
// primitive.
//
// Wrapped in `<Suspense>` by the caller because `useSearchParams`
// opts the surrounding component into client-side rendering;
// keeping that boundary at the toast call-site lets the rest of the
// AppShell stay server-rendered.
function WelcomeBackToastInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const welcomeBack = searchParams.get('welcome-back') === '1';
  const [visible, setVisible] = useState(welcomeBack);
  const t = useTranslations('auth.welcomeBack');

  useEffect(() => {
    setVisible(welcomeBack);
  }, [welcomeBack]);

  useEffect(() => {
    if (!visible && welcomeBack) {
      const next = new URLSearchParams(searchParams);
      next.delete('welcome-back');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [visible, welcomeBack, pathname, router, searchParams]);

  const onDismiss = useCallback(() => setVisible(false), []);

  if (!welcomeBack || !visible) return null;

  return (
    <Toast
      id="welcome-back"
      title={t('title')}
      body={t('body')}
      dismissLabel={t('dismiss')}
      onDismiss={onDismiss}
      tone="success"
    />
  );
}

export function WelcomeBackToast() {
  return (
    <Suspense fallback={null}>
      <WelcomeBackToastInner />
    </Suspense>
  );
}
