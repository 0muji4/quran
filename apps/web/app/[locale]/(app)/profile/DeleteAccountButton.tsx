'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { deleteAccountAction } from '../../../actions';
import { clearLocalCache } from '../../../lib/storage';
import { css, cx } from '../../../../styled-system/css';

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

const overlayClass = css({
  position: 'fixed',
  inset: '[0]',
  backgroundColor: '[rgba(36, 30, 25, 0.45)]',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '[40]',
  padding: '4'
});

const modalClass = css({
  backgroundColor: 'bg.paper',
  borderRadius: 'md',
  width: '[100%]',
  maxWidth: '[520px]',
  padding: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  boxShadow: 'card'
});

const eyebrowClass = css({
  fontSize: '[12px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.08em]',
  color: 'red'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[24px]',
  color: 'ink.strong'
});

const bodyClass = css({
  fontSize: '[14px]',
  lineHeight: '[1.55]',
  color: 'ink.default'
});

const calloutClass = css({
  backgroundColor: 'tan.soft',
  borderRadius: 'md',
  paddingBlock: '3',
  paddingInline: '4',
  fontSize: '[13px]',
  color: 'ink.default'
});

const fieldClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2'
});

const labelClass = css({
  fontSize: '[12px]',
  color: 'ink.muted'
});

const inputClass = css({
  width: '[100%]',
  font: '[inherit]',
  fontSize: '[15px]',
  paddingBlock: '3',
  paddingInline: '4',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  minHeight: '[44px]',
  '&:focus-visible': { outlineColor: 'red' }
});

const errorClass = css({
  backgroundColor: '[rgba(192, 57, 43, 0.08)]',
  color: 'red',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '[rgba(192, 57, 43, 0.25)]',
  borderRadius: 'md',
  paddingBlock: '3',
  paddingInline: '4',
  fontSize: '[13px]'
});

const actionsClass = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '3',
  flexWrap: 'wrap'
});

const cancelButtonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer'
});

const confirmButtonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '[0]',
  backgroundColor: 'red',
  color: 'bg.paper',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  _disabled: { opacity: 0.55, cursor: 'not-allowed' }
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
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setError(null);
      firstFieldRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        Delete account
      </button>
      {open && (
        <div
          className={overlayClass}
          role="dialog"
          aria-modal="true"
          aria-label="Delete account"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form className={modalClass} onSubmit={onSubmit} noValidate>
            <div>
              <p className={eyebrowClass}>
                <span aria-hidden="true">! </span>Delete account
              </p>
              <h2 className={titleClass}>Are you sure?</h2>
            </div>

            <p className={bodyClass}>
              Your account will be scheduled for deletion. All practice attempts, best scores, and
              streak history will be removed from Tilawah.
            </p>

            <p className={calloutClass}>
              You have <strong>30 days</strong> to change your mind. Sign in again with this email
              and password before then and your account — and everything in it — comes back exactly
              as it was.
            </p>

            {error && (
              <div className={errorClass} role="alert" aria-live="polite">
                {String(error)}
              </div>
            )}

            <div className={fieldClass}>
              <label className={labelClass} htmlFor="delete-confirm">
                Type <strong>{CONFIRM_PHRASE}</strong> below to confirm.
              </label>
              <input
                ref={firstFieldRef}
                id="delete-confirm"
                className={inputClass}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={pending}
              />
            </div>

            <div className={actionsClass}>
              <button
                type="button"
                className={cancelButtonClass}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Keep my account
              </button>
              <button
                type="submit"
                className={cx(confirmButtonClass)}
                disabled={!canConfirm}
                aria-disabled={!canConfirm}
              >
                {pending ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
