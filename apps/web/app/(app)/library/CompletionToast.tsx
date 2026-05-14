'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from '../../styles/library.module.css';

const AUTO_DISMISS_MS = 6_000;

// Reads ?completed=<surahName> from the URL, surfaces a celebratory toast,
// then quietly strips the param so a refresh doesn't re-trigger it.
export function CompletionToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const completed = searchParams.get('completed');
  const [visible, setVisible] = useState(Boolean(completed));

  useEffect(() => {
    if (!completed) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [completed]);

  useEffect(() => {
    // Strip the param after the celebration so a back/forward or refresh
    // doesn't replay the toast.
    if (!visible && completed) {
      const next = new URLSearchParams(searchParams);
      next.delete('completed');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [visible, completed, pathname, router, searchParams]);

  if (!completed || !visible) return null;

  return (
    <div className={styles.completionToast} role="status" aria-live="polite">
      <span className={styles.completionToastIcon} aria-hidden="true">
        ✦
      </span>
      <div>
        <strong className={styles.completionToastTitle}>
          {decodeURIComponent(completed)} completed
        </strong>
        <p className={styles.completionToastBody}>
          Beautifully done — pick another surah whenever you&apos;re ready.
        </p>
      </div>
      <button
        type="button"
        className={styles.completionToastClose}
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
