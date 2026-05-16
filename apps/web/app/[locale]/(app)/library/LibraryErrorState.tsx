'use client';

import { useTransition } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { WarningTriangleIcon } from '../../../components/icons/ArrowRightIcon';
import { css } from '../../../../styled-system/css';
import { button } from '../../../../styled-system/recipes';

const wrapperClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3',
  paddingBlock: '12',
  paddingInline: '4',
  textAlign: 'center'
});

const iconClass = css({
  color: 'red'
});

const titleClass = css({
  fontSize: '[17px]',
  fontWeight: 600,
  color: 'ink.strong'
});

const recoveryClass = css({
  fontSize: '[14px]',
  color: 'ink.muted',
  maxWidth: '[420px]',
  lineHeight: '[1.5]'
});

// Mirrors iOS `LibraryView.ErrorState` (LibraryView.swift:L144-L173): the
// Library is unusable without a surah list, so we surface the failure
// explicitly instead of degrading to an empty grid that's
// indistinguishable from "your filter matched nothing".
export function LibraryErrorState() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onRetry = (): void => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className={wrapperClass} role="alert">
      <WarningTriangleIcon className={iconClass} />
      <p className={titleClass}>Couldn&apos;t load the surah list</p>
      <p className={recoveryClass}>
        Check your connection and try again. If the problem persists, the service may be temporarily
        unavailable.
      </p>
      <button
        type="button"
        className={button({ tone: 'teal', size: 'lg' })}
        onClick={onRetry}
        disabled={pending}
      >
        {pending ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
