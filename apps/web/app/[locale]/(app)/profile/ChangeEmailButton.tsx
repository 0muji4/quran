'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { updateEmailAction } from '../../../actions';
import { css, cx } from '../../../../styled-system/css';

interface Props {
  currentEmail: string;
}

const triggerClass = css({
  font: '[inherit]',
  fontSize: '[14px]',
  fontWeight: 600,
  color: 'teal.deep',
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  cursor: 'pointer'
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
  maxWidth: '[480px]',
  padding: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  boxShadow: 'card'
});

const eyebrowClass = css({
  fontSize: '[12px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.08em]',
  color: 'gold.onLight'
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[24px]',
  color: 'ink.strong'
});

const fieldClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2'
});

const labelClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
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
  '&:focus-visible': { outlineColor: 'teal' }
});

const helperClass = css({
  fontSize: '[12px]',
  color: 'ink.muted'
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

const saveButtonClass = css({
  paddingBlock: '2',
  paddingInline: '5',
  borderRadius: 'pill',
  borderWidth: '[0]',
  backgroundColor: 'teal',
  color: 'tan.soft',
  fontSize: '[14px]',
  fontWeight: 600,
  cursor: 'pointer',
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

// Phase 2.C-lite: change email without a confirmation-email round-trip.
// Two fields — new email + current password — submitted to
// `updateEmailAction` → POST /auth/me/email. The BFF re-verifies the
// current password server-side; client-side checks here are UX
// guards, not security boundaries.
//
// No confirmation email is sent today. A future PR adds the
// verification-link loop when the transactional-email infra lands.
export function ChangeEmailButton({ currentEmail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNewEmail('');
      setCurrentPassword('');
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

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = newEmail.trim();
    if (trimmedEmail.length === 0) {
      setError('Enter a new email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (trimmedEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('New email must be different from the current one.');
      return;
    }
    if (currentPassword.length === 0) {
      setError('Enter your current password.');
      return;
    }

    startTransition(async () => {
      try {
        await updateEmailAction({ currentPassword, newEmail: trimmedEmail });
        setOpen(false);
        // Server Component re-fetches `/auth/me` on the next paint
        // and the header card / Account & data row show the new
        // email.
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update email');
      }
    });
  };

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        Change
      </button>
      {open && (
        <div
          className={overlayClass}
          role="dialog"
          aria-modal="true"
          aria-label="Change email"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form className={modalClass} onSubmit={onSubmit} noValidate>
            <div>
              <p className={eyebrowClass}>
                <span aria-hidden="true">+ </span>Account & data
              </p>
              <h2 className={titleClass}>Change email</h2>
            </div>

            {error && (
              <div className={errorClass} role="alert" aria-live="polite">
                {String(error)}
              </div>
            )}

            <div className={fieldClass}>
              <label className={labelClass} htmlFor="email-new">
                New email
              </label>
              <input
                ref={firstFieldRef}
                id="email-new"
                className={inputClass}
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={pending}
                required
              />
              <span className={helperClass}>
                Current: {currentEmail}. You&apos;ll sign in with the new address next time.
              </span>
            </div>

            <div className={fieldClass}>
              <label className={labelClass} htmlFor="email-current-pw">
                Current password
              </label>
              <input
                id="email-current-pw"
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pending}
                required
              />
            </div>

            <div className={actionsClass}>
              <button
                type="button"
                className={cancelButtonClass}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button type="submit" className={cx(saveButtonClass)} disabled={pending}>
                {pending ? 'Updating…' : 'Update email'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
