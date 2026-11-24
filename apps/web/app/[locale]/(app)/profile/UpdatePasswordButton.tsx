'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { updatePasswordAction } from '../../../actions';
import { AppDialog } from '../../../components/AppDialog';
import { TextField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css, cx } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';
import { actionsClass, formClass } from './dialogStyles';

// Its label lines up with the card's edge.
const triggerClass = cx(
  appButton({ variant: 'text' }),
  css({ flexShrink: 0, marginInlineEnd: '[-12px]' })
);

// "Update" link in the Account & data card. Opens a modal with three
// fields: current password, new password, confirm new password.
// Submits via `updatePasswordAction` → POST /auth/me/password (BFF
// re-verifies the current password server-side; the client checks
// here are UX guards, not security boundaries).
export function UpdatePasswordButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Wipe drafts on every open so a Cancel → reopen never leaves a
  // stale current/new password sitting in component state.
  const openDialog = (): void => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setOpen(true);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);

    if (current.length === 0) {
      setError('Enter your current password.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (next === current) {
      setError('New password must be different from the current one.');
      return;
    }

    startTransition(async () => {
      try {
        await updatePasswordAction({ currentPassword: current, newPassword: next });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update password');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label="Update password"
      >
        Update
      </button>
      {open && (
        <AppDialog title="Update password" onClose={() => setOpen(false)}>
          <form className={formClass} onSubmit={onSubmit} noValidate>
            {error && <ErrorPanel>{error}</ErrorPanel>}

            <TextField
              id="pw-current"
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={pending}
              required
            />

            <TextField
              id="pw-new"
              label="New password"
              helper="Use 8+ characters with a mix of letters and numbers."
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={pending}
              required
            />

            <TextField
              id="pw-confirm"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
              required
            />

            <div className={actionsClass}>
              <button
                type="button"
                className={appButton({ variant: 'text' })}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button type="submit" className={appButton({ variant: 'filled' })} disabled={pending}>
                {pending ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </AppDialog>
      )}
    </>
  );
}
