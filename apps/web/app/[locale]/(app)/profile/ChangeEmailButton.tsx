'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '../../../../i18n/navigation';
import { updateEmailAction } from '../../../actions';
import { AppDialog } from '../../../components/AppDialog';
import { TextField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';
import { actionsClass, formClass } from './dialogStyles';

interface Props {
  currentEmail: string;
}

const triggerClass = css({
  font: '[inherit]',
  fontSize: '[14px]',
  fontWeight: 600,
  color: 'green.deep',
  backgroundColor: '[transparent]',
  borderWidth: '[0]',
  cursor: 'pointer'
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

  const openDialog = (): void => {
    setNewEmail('');
    setCurrentPassword('');
    setError(null);
    setOpen(true);
  };

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
      <button type="button" className={triggerClass} onClick={openDialog}>
        Change
      </button>
      {open && (
        <AppDialog title="Change email" onClose={() => setOpen(false)}>
          <form className={formClass} onSubmit={onSubmit} noValidate>
            {error && <ErrorPanel>{error}</ErrorPanel>}

            <TextField
              id="email-new"
              label="New email"
              helper={`Current: ${currentEmail}. You'll sign in with the new address next time.`}
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={pending}
              required
            />

            <TextField
              id="email-current-pw"
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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
                {pending ? 'Updating…' : 'Update email'}
              </button>
            </div>
          </form>
        </AppDialog>
      )}
    </>
  );
}
