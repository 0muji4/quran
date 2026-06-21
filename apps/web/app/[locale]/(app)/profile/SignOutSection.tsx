'use client';

import { useTransition } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { signOutAction } from '../../../actions';
import { clearLocalCache } from '../../../lib/storage';
import { DeleteAccountButton } from './DeleteAccountButton';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

const cardClass = css({
  padding: '6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '4',
  flexWrap: 'wrap'
});

const copyClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  flex: '1',
  minWidth: '[260px]'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[20px]',
  color: 'ink.strong'
});

const helperClass = css({
  fontSize: '[13px]',
  color: 'ink.muted'
});

const actionsClass = css({
  display: 'flex',
  gap: '3',
  flexWrap: 'wrap'
});

const signOutButtonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '[0]',
  backgroundColor: 'tan',
  color: 'ink.strong',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

export function SignOutSection() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSignOut = (): void => {
    startTransition(async () => {
      await signOutAction();
      // Local cache holds attempts / best scores keyed on the now-gone
      // session; drop it so the signed-out shell doesn't render data
      // from the previous user.
      clearLocalCache();
      router.replace('/');
      router.refresh();
    });
  };

  return (
    <section className={cx(panel({ surface: 'paper' }).root, cardClass)} aria-label="Sign out">
      <div className={copyClass}>
        <span className={titleClass}>Sign out</span>
        <span className={helperClass}>You can sign back in any time — your progress is saved.</span>
      </div>
      <div className={actionsClass}>
        <DeleteAccountButton />
        <button type="button" className={signOutButtonClass} onClick={onSignOut} disabled={pending}>
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}
