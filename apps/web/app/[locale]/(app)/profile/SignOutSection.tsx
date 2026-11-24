'use client';

import { useTransition } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { signOutAction } from '../../../actions';
import { clearLocalCache } from '../../../lib/storage';
import { DeleteAccountButton } from './DeleteAccountButton';
import { css } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

const sectionClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: '4',
  rowGap: '3'
});

const copyClass = css({
  flex: '[1 1 260px]',
  margin: '0',
  textStyle: 'bodyMedium',
  color: 'onSurfaceVariant'
});

const actionsClass = css({
  marginInlineStart: 'auto',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '2'
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
    <section className={sectionClass} aria-label="Sign out">
      <p className={copyClass}>You can sign back in any time — your progress is saved.</p>
      <div className={actionsClass}>
        <DeleteAccountButton />
        <button
          type="button"
          className={appButton({ variant: 'outlined' })}
          onClick={onSignOut}
          disabled={pending}
        >
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}
