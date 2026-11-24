'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../../i18n/navigation';
import { css } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

const panelClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  padding: '4',
  borderRadius: 'medium',
  background: 'errorContainer',
  color: 'onErrorContainer'
});

const bodyClass = css({ display: 'flex', alignItems: 'flex-start', gap: '3' });

const iconClass = css({ flexShrink: 0, marginTop: '[2px]' });

const textClass = css({ display: 'flex', flexDirection: 'column', gap: '1' });

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'titleMedium' });

const recoveryClass = css({ margin: '0', textStyle: 'bodyMedium' });

const actionsClass = css({ display: 'flex', justifyContent: 'flex-end' });

// The Library is unusable without a surah list, so we surface the failure
// explicitly instead of degrading to an empty grid that's
// indistinguishable from "your filter matched nothing".
export function LibraryErrorState() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations('library.error');

  const onRetry = (): void => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <section className={panelClass} role="alert">
      <div className={bodyClass}>
        <svg
          className={iconClass}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
        <div className={textClass}>
          <h2 className={titleClass}>{t('title')}</h2>
          <p className={recoveryClass}>{t('recovery')}</p>
        </div>
      </div>
      <div className={actionsClass}>
        <button
          type="button"
          className={appButton({ variant: 'filled' })}
          onClick={onRetry}
          disabled={pending}
        >
          {pending ? t('retrying') : t('retry')}
        </button>
      </div>
    </section>
  );
}
