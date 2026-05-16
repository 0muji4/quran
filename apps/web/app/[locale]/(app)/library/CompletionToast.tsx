'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '../../../../i18n/navigation';
import { css } from '../../../../styled-system/css';

const AUTO_DISMISS_MS = 6_000;
const TOAST_MOBILE_MQ = '@media (max-width: 600px)';

const toastClass = css({
  position: 'fixed',
  bottom: '6',
  right: '6',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'flex-start',
  gap: '3',
  backgroundColor: 'teal',
  color: 'bg.paper',
  paddingBlock: '4',
  paddingInline: '5',
  borderRadius: 'md',
  boxShadow: '[0 12px 40px rgba(0, 0, 0, 0.18)]',
  maxWidth: '[360px]',
  zIndex: '[100]',
  animation: '[completionToastIn 220ms ease-out]',
  '@media (prefers-reduced-motion: reduce)': { animation: '[none]' },
  [TOAST_MOBILE_MQ]: {
    left: '4',
    right: '4',
    bottom: '4',
    maxWidth: '[none]'
  }
});

const iconClass = css({
  fontFamily: 'serif',
  fontSize: '[22px]',
  lineHeight: '[1]',
  color: 'tan',
  marginTop: '[2px]'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[16px]',
  display: 'block'
});

const bodyClass = css({
  fontSize: '[13px]',
  marginTop: '[4px]',
  marginBottom: '[0]',
  color: '[rgba(255, 255, 255, 0.85)]',
  lineHeight: '[1.5]'
});

const closeClass = css({
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  color: '[rgba(255, 255, 255, 0.7)]',
  fontSize: '[22px]',
  lineHeight: '[1]',
  cursor: 'pointer',
  paddingBlock: '[0]',
  paddingInline: '[4px]',
  _hover: { color: 'bg.paper' }
});

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
    <div className={toastClass} role="status" aria-live="polite">
      <span className={iconClass} aria-hidden="true">
        ✦
      </span>
      <div>
        <strong className={titleClass}>{decodeURIComponent(completed)} completed</strong>
        <p className={bodyClass}>
          Beautifully done — pick another surah whenever you&apos;re ready.
        </p>
      </div>
      <button
        type="button"
        className={closeClass}
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
