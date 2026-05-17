'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../../../../i18n/navigation';
import { Toast } from '../../../components/Toast';

// Reads ?completed=<surahName> from the URL, surfaces a celebratory toast,
// then quietly strips the param so a refresh doesn't re-trigger it.
// Visual presentation lives in the shared <Toast> primitive; this
// component is the URL <-> visibility glue.
export function CompletionToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const completed = searchParams.get('completed');
  const [visible, setVisible] = useState(Boolean(completed));
  const t = useTranslations('library.completion');

  // Sync visibility back on whenever the query param re-arrives so a
  // user who completes another surah after dismissing the previous
  // toast sees the new one.
  useEffect(() => {
    setVisible(Boolean(completed));
  }, [completed]);

  // Strip the param once the toast is no longer visible so a
  // back/forward or refresh doesn't replay it.
  useEffect(() => {
    if (!visible && completed) {
      const next = new URLSearchParams(searchParams);
      next.delete('completed');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [visible, completed, pathname, router, searchParams]);

  const onDismiss = useCallback(() => setVisible(false), []);

  if (!completed || !visible) return null;

  return (
    <Toast
      id={completed}
      title={t('title', { surahName: decodeURIComponent(completed) })}
      body={t('body')}
      dismissLabel={t('dismiss')}
      onDismiss={onDismiss}
      tone="success"
    />
  );
}
