'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { deleteAccountAction } from '../../../actions';
import { clearLocalCache } from '../../../lib/storage';
import { AppDialog } from '../../../components/AppDialog';
import { TextField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';
import { actionsClass, bodyClass, formClass } from './dialogStyles';

const triggerClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'red',
  backgroundColor: 'bg.paper',
  color: 'red',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  '&:hover': { backgroundColor: '[rgba(192, 57, 43, 0.06)]' }
});

const noticeClass = css({
  margin: '0',
  paddingBlock: '3',
  paddingInline: '4',
  borderRadius: 'medium',
  background: 'surfaceContainerHighest',
  textStyle: 'bodyMedium'
});

const CONFIRM_PHRASE = 'DELETE';

// Type-to-confirm modal for account deletion per ADR-0024. The 30-day
// grace window message lives inline so the user can't miss it — and
// the same copy doubles as the reactivation promise (sign in again to
// restore).
export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = (): void => {
    setConfirmText('');
    setError(null);
    setOpen(true);
  };

  const canConfirm = confirmText === CONFIRM_PHRASE && !pending;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Type ${CONFIRM_PHRASE} to confirm.`);
      return;
    }
    startTransition(async () => {
      try {
        await deleteAccountAction();
        // The auth cookies are gone server-side; the local cache still
        // holds the previous user's attempts / best scores. Drop it
        // before navigating so the signed-out shell does not render
        // stale data.
        clearLocalCache();
        router.replace('/');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete account');
      }
    });
  };

  return (
    <>
      <button type="button" className={triggerClass} onClick={openDialog}>
        Delete account
      </button>
      {open && (
        <AppDialog title="Delete your account?" onClose={() => setOpen(false)}>
          <form className={formClass} onSubmit={onSubmit} noValidate>
            <p className={bodyClass}>
              Your account will be scheduled for deletion. All practice attempts, best scores, and
              streak history will be removed from Tilawah.
            </p>

            <p className={noticeClass}>
              You have <strong>30 days</strong> to change your mind. Sign in again with this email
              and password before then and your account — and everything in it — comes back exactly
              as it was.
            </p>

            {error && <ErrorPanel>{error}</ErrorPanel>}

            <TextField
              id="delete-confirm"
              label={
                <>
                  Type <strong>{CONFIRM_PHRASE}</strong> below to confirm.
                </>
              }
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={pending}
            />

            <div className={actionsClass}>
              <button
                type="button"
                className={appButton({ variant: 'text' })}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Keep my account
              </button>
              <button
                type="submit"
                className={appButton({ variant: 'error' })}
                disabled={!canConfirm}
              >
                {pending ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </AppDialog>
      )}
    </>
  );
}
